import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_REFRESH_MARGIN_MS =
  10 * 60 * 1000;

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 90;
const ORDER_LIMIT = 100;

type ServerConfig = {
  mallId: string;
  clientId: string;
  clientSecret: string;
  tokenEncryptionKey: Buffer;
  syncSecret: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
};

type TokenRow = {
  mall_id: string;
  token_type: string;
  scopes: string[] | null;

  access_token_ciphertext: string;
  access_token_iv: string;
  access_token_auth_tag: string;

  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  refresh_token_auth_tag: string;

  access_token_expires_at: string;
  refresh_token_expires_at: string;

  is_active: boolean;
  encryption_key_version: number;
};

type Cafe24TokenResponse = {
  access_token?: unknown;
  expires_at?: unknown;
  refresh_token?: unknown;
  refresh_token_expires_at?: unknown;
  client_id?: unknown;
  mall_id?: unknown;
  user_id?: unknown;
  scopes?: unknown;
  issued_at?: unknown;
  token_type?: unknown;
  error?: unknown;
  error_description?: unknown;
};

type Cafe24Order = {
  order_id?: unknown;
  member_id?: unknown;
  order_date?: unknown;
  created_date?: unknown;
  payment_date?: unknown;
  paid?: unknown;
  payment_status?: unknown;
  order_status?: unknown;
  order_status_code?: unknown;
};

type Cafe24OrdersResponse = {
  orders?: unknown;
  error?: unknown;
  error_description?: unknown;
};

type ShopOrderUpsert = {
  order_id: string;
  member_id: string;
  order_status: string;
  ordered_at: string;
};

type EncryptedValue = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getRequiredEnv(
  name: string,
): string {
  const value =
    process.env[name]?.trim() ?? "";

  if (!value) {
    throw new Error(
      `${name} 환경변수가 설정되지 않았습니다.`,
    );
  }

  return value;
}

function normalizeMallId(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function parseEncryptionKey(
  value: string,
): Buffer {
  const key =
    Buffer.from(
      value,
      "base64",
    );

  if (key.length !== 32) {
    throw new Error(
      "CAFE24_TOKEN_ENCRYPTION_KEY는 32바이트 Base64 키여야 합니다.",
    );
  }

  return key;
}

function getServerConfig(): ServerConfig {
  return {
    mallId:
      normalizeMallId(
        getRequiredEnv(
          "CAFE24_MALL_ID",
        ),
      ),

    clientId:
      getRequiredEnv(
        "CAFE24_CLIENT_ID",
      ),

    clientSecret:
      getRequiredEnv(
        "CAFE24_CLIENT_SECRET",
      ),

    tokenEncryptionKey:
      parseEncryptionKey(
        getRequiredEnv(
          "CAFE24_TOKEN_ENCRYPTION_KEY",
        ),
      ),

    /*
     * 이 키는 주문 동기화 API를 외부인이 실행하지 못하게 막습니다.
     * Vercel 환경변수에 별도로 등록해야 합니다.
     */
    syncSecret:
      getRequiredEnv(
        "CAFE24_SYNC_SECRET",
      ),

    supabaseUrl:
      getRequiredEnv(
        "SUPABASE_URL",
      ).replace(/\/+$/, ""),

    supabaseSecretKey:
      getRequiredEnv(
        "SUPABASE_SECRET_KEY",
      ),
  };
}

function normalizeString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizeScopes(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item,
      ): item is string =>
        typeof item === "string",
    )
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

function parseRequiredDate(
  value: unknown,
  fieldName: string,
): string {
  const text =
    normalizeString(value);

  if (!text) {
    throw new Error(
      `${fieldName} 값이 없습니다.`,
    );
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} 형식이 올바르지 않습니다.`,
    );
  }

  return date.toISOString();
}

function parseOptionalDate(
  value: unknown,
): string | null {
  const text =
    normalizeString(value);

  if (!text) {
    return null;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function encryptToken(
  plaintext: string,
  key: Buffer,
): EncryptedValue {
  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8",
      ),
      cipher.final(),
    ]);

  return {
    ciphertext:
      encrypted.toString(
        "base64",
      ),

    iv:
      iv.toString(
        "base64",
      ),

    authTag:
      cipher
        .getAuthTag()
        .toString(
          "base64",
        ),
  };
}

function decryptToken(
  ciphertext: string,
  iv: string,
  authTag: string,
  key: Buffer,
): string {
  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(
        iv,
        "base64",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      authTag,
      "base64",
    ),
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          ciphertext,
          "base64",
        ),
      ),
      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8",
  );
}

function getSupabaseHeaders(
  secretKey: string,
  prefer:
    | "return=minimal"
    | "return=representation",
): Record<string, string> {
  const headers: Record<
    string,
    string
  > = {
    apikey:
      secretKey,

    "Content-Type":
      "application/json",

    Prefer:
      prefer,
  };

  if (
    !secretKey.startsWith(
      "sb_secret_",
    )
  ) {
    headers.Authorization =
      `Bearer ${secretKey}`;
  }

  return headers;
}

function safeEqual(
  left: string,
  right: string,
): boolean {
  const leftBuffer =
    Buffer.from(
      left,
      "utf8",
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8",
    );

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

function verifySyncSecret(
  request: NextRequest,
  configuredSecret: string,
): boolean {
  const suppliedSecret =
    normalizeString(
      request.headers.get(
        "x-ttok-sync-secret",
      ),
    );

  return (
    suppliedSecret.length > 0 &&
    safeEqual(
      suppliedSecret,
      configuredSecret,
    )
  );
}

async function loadTokenRow(
  config: ServerConfig,
): Promise<TokenRow> {
  const query =
    new URLSearchParams({
      mall_id:
        `eq.${config.mallId}`,

      is_active:
        "eq.true",

      select:
        [
          "mall_id",
          "token_type",
          "scopes",
          "access_token_ciphertext",
          "access_token_iv",
          "access_token_auth_tag",
          "refresh_token_ciphertext",
          "refresh_token_iv",
          "refresh_token_auth_tag",
          "access_token_expires_at",
          "refresh_token_expires_at",
          "is_active",
          "encryption_key_version",
        ].join(","),

      limit:
        "1",
    });

  const response =
    await fetch(
      `${config.supabaseUrl}/rest/v1/cafe24_tokens?${query.toString()}`,
      {
        method: "GET",

        headers:
          getSupabaseHeaders(
            config.supabaseSecretKey,
            "return=representation",
          ),

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `카페24 토큰 조회 실패: HTTP ${response.status} ${text}`,
    );
  }

  const rows =
    text
      ? JSON.parse(text)
      : [];

  if (
    !Array.isArray(rows) ||
    rows.length !== 1
  ) {
    throw new Error(
      "사용 가능한 카페24 토큰을 찾을 수 없습니다. OAuth 연결을 다시 확인하세요.",
    );
  }

  return rows[0] as TokenRow;
}

async function saveRefreshedTokens(
  config: ServerConfig,
  tokenData: Cafe24TokenResponse,
): Promise<string> {
  const accessToken =
    normalizeString(
      tokenData.access_token,
    );

  const refreshToken =
    normalizeString(
      tokenData.refresh_token,
    );

  if (
    !accessToken ||
    !refreshToken
  ) {
    throw new Error(
      "갱신 응답에 Access Token 또는 Refresh Token이 없습니다.",
    );
  }

  const responseMallId =
    normalizeMallId(
      normalizeString(
        tokenData.mall_id,
      ),
    );

  if (
    responseMallId &&
    responseMallId !==
      config.mallId
  ) {
    throw new Error(
      "갱신된 토큰의 Mall ID가 일치하지 않습니다.",
    );
  }

  const encryptedAccess =
    encryptToken(
      accessToken,
      config.tokenEncryptionKey,
    );

  const encryptedRefresh =
    encryptToken(
      refreshToken,
      config.tokenEncryptionKey,
    );

  const payload = {
    cafe24_user_id:
      normalizeString(
        tokenData.user_id,
      ) || null,

    token_type:
      normalizeString(
        tokenData.token_type,
      ) || "Bearer",

    scopes:
      normalizeScopes(
        tokenData.scopes,
      ),

    access_token_ciphertext:
      encryptedAccess.ciphertext,

    access_token_iv:
      encryptedAccess.iv,

    access_token_auth_tag:
      encryptedAccess.authTag,

    refresh_token_ciphertext:
      encryptedRefresh.ciphertext,

    refresh_token_iv:
      encryptedRefresh.iv,

    refresh_token_auth_tag:
      encryptedRefresh.authTag,

    access_token_expires_at:
      parseRequiredDate(
        tokenData.expires_at,
        "expires_at",
      ),

    refresh_token_expires_at:
      parseRequiredDate(
        tokenData.refresh_token_expires_at,
        "refresh_token_expires_at",
      ),

    issued_at:
      parseOptionalDate(
        tokenData.issued_at,
      ),

    last_refreshed_at:
      new Date().toISOString(),

    last_error_code:
      null,

    last_error_message:
      null,

    last_error_at:
      null,

    is_active:
      true,

    updated_at:
      new Date().toISOString(),
  };

  const query =
    new URLSearchParams({
      mall_id:
        `eq.${config.mallId}`,
    });

  const response =
    await fetch(
      `${config.supabaseUrl}/rest/v1/cafe24_tokens?${query.toString()}`,
      {
        method: "PATCH",

        headers:
          getSupabaseHeaders(
            config.supabaseSecretKey,
            "return=minimal",
          ),

        body:
          JSON.stringify(
            payload,
          ),

        cache:
          "no-store",
      },
    );

  if (!response.ok) {
    const detail =
      await response.text();

    throw new Error(
      `갱신 토큰 저장 실패: HTTP ${response.status} ${detail}`,
    );
  }

  return accessToken;
}

async function refreshAccessToken(
  config: ServerConfig,
  refreshToken: string,
): Promise<string> {
  const basicAuth =
    Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
      "utf8",
    ).toString(
      "base64",
    );

  const body =
    new URLSearchParams({
      grant_type:
        "refresh_token",

      refresh_token:
        refreshToken,
    });

  const response =
    await fetch(
      `https://${config.mallId}.cafe24api.com/api/v2/oauth/token`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Basic ${basicAuth}`,

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json",
        },

        body:
          body.toString(),

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  let tokenData: Cafe24TokenResponse = {};

  try {
    tokenData =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    throw new Error(
      `카페24 토큰 갱신 응답이 JSON이 아닙니다. HTTP ${response.status}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      [
        `카페24 토큰 갱신 실패: HTTP ${response.status}`,
        normalizeString(
          tokenData.error,
        ),
        normalizeString(
          tokenData.error_description,
        ),
      ]
        .filter(Boolean)
        .join(" / "),
    );
  }

  return saveRefreshedTokens(
    config,
    tokenData,
  );
}

async function getValidAccessToken(
  config: ServerConfig,
): Promise<string> {
  const tokenRow =
    await loadTokenRow(
      config,
    );

  const accessToken =
    decryptToken(
      tokenRow.access_token_ciphertext,
      tokenRow.access_token_iv,
      tokenRow.access_token_auth_tag,
      config.tokenEncryptionKey,
    );

  const accessExpiresAt =
    new Date(
      tokenRow.access_token_expires_at,
    ).getTime();

  if (
    Number.isFinite(
      accessExpiresAt,
    ) &&
    accessExpiresAt -
      Date.now() >
      TOKEN_REFRESH_MARGIN_MS
  ) {
    return accessToken;
  }

  const refreshExpiresAt =
    new Date(
      tokenRow.refresh_token_expires_at,
    ).getTime();

  if (
    !Number.isFinite(
      refreshExpiresAt,
    ) ||
    refreshExpiresAt <=
      Date.now()
  ) {
    throw new Error(
      "카페24 Refresh Token이 만료되었습니다. OAuth 연결을 다시 진행하세요.",
    );
  }

  const refreshToken =
    decryptToken(
      tokenRow.refresh_token_ciphertext,
      tokenRow.refresh_token_iv,
      tokenRow.refresh_token_auth_tag,
      config.tokenEncryptionKey,
    );

  return refreshAccessToken(
    config,
    refreshToken,
  );
}

function getLookbackDays(
  request: NextRequest,
): number {
  const rawValue =
    request.nextUrl.searchParams.get(
      "days",
    );

  if (!rawValue) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  const parsed =
    Number.parseInt(
      rawValue,
      10,
    );

  if (
    !Number.isFinite(parsed)
  ) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.min(
    MAX_LOOKBACK_DAYS,
    Math.max(
      1,
      parsed,
    ),
  );
}

function formatCafe24Date(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function mapOrderStatus(
  order: Cafe24Order,
): string {
  const directStatus =
    normalizeString(
      order.order_status,
    );

  if (directStatus) {
    return directStatus;
  }

  const statusCode =
    normalizeString(
      order.order_status_code,
    );

  if (statusCode) {
    return statusCode;
  }

  const paymentStatus =
    normalizeString(
      order.payment_status,
    );

  if (paymentStatus) {
    return paymentStatus;
  }

  if (
    order.paid === true ||
    normalizeString(
      order.paid,
    ).toUpperCase() === "T"
  ) {
    return "PAID";
  }

  return "ORDERED";
}

function normalizeOrderedAt(
  order: Cafe24Order,
): string {
  const candidates = [
    order.order_date,
    order.created_date,
    order.payment_date,
  ];

  for (
    const candidate
    of candidates
  ) {
    const text =
      normalizeString(
        candidate,
      );

    if (!text) {
      continue;
    }

    const parsed =
      new Date(text);

    if (
      !Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function mapCafe24Orders(
  value: unknown,
): {
  rows: ShopOrderUpsert[];
  skippedGuestOrders: number;
  skippedInvalidOrders: number;
} {
  if (!Array.isArray(value)) {
    return {
      rows: [],
      skippedGuestOrders: 0,
      skippedInvalidOrders: 0,
    };
  }

  const rows: ShopOrderUpsert[] = [];
  let skippedGuestOrders = 0;
  let skippedInvalidOrders = 0;

  for (
    const rawOrder
    of value
  ) {
    if (
      typeof rawOrder !==
        "object" ||
      rawOrder === null
    ) {
      skippedInvalidOrders += 1;
      continue;
    }

    const order =
      rawOrder as Cafe24Order;

    const orderId =
      normalizeString(
        order.order_id,
      );

    const memberId =
      normalizeString(
        order.member_id,
      );

    if (!orderId) {
      skippedInvalidOrders += 1;
      continue;
    }

    /*
     * TTOK LIFE 보상 배송은 회원 ID로 소유자를 검증하므로
     * 비회원 주문은 shop_orders 동기화 대상에서 제외합니다.
     */
    if (!memberId) {
      skippedGuestOrders += 1;
      continue;
    }

    rows.push({
      order_id:
        orderId,

      member_id:
        memberId,

      order_status:
        mapOrderStatus(
          order,
        ),

      ordered_at:
        normalizeOrderedAt(
          order,
        ),
    });
  }

  return {
    rows,
    skippedGuestOrders,
    skippedInvalidOrders,
  };
}

async function fetchCafe24Orders(
  config: ServerConfig,
  accessToken: string,
  lookbackDays: number,
): Promise<Cafe24Order[]> {
  const endDate =
    new Date();

  const startDate =
    new Date();

  startDate.setDate(
    startDate.getDate() -
      lookbackDays,
  );

  const query =
    new URLSearchParams({
      shop_no:
        "1",

      date_type:
        "order_date",

      start_date:
        formatCafe24Date(
          startDate,
        ),

      end_date:
        formatCafe24Date(
          endDate,
        ),

      limit:
        String(
          ORDER_LIMIT,
        ),

      offset:
        "0",
    });

  const response =
    await fetch(
      `https://${config.mallId}.cafe24api.com/api/v2/admin/orders?${query.toString()}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          Accept:
            "application/json",
        },

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  let data: Cafe24OrdersResponse = {};

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    throw new Error(
      `카페24 주문 응답이 JSON이 아닙니다. HTTP ${response.status}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      [
        `카페24 주문 조회 실패: HTTP ${response.status}`,
        normalizeString(
          data.error,
        ),
        normalizeString(
          data.error_description,
        ),
        text.slice(
          0,
          500,
        ),
      ]
        .filter(Boolean)
        .join(" / "),
    );
  }

  if (!Array.isArray(data.orders)) {
    return [];
  }

  return data.orders as Cafe24Order[];
}

async function upsertShopOrders(
  config: ServerConfig,
  rows: ShopOrderUpsert[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const response =
    await fetch(
      `${config.supabaseUrl}/rest/v1/shop_orders?on_conflict=order_id`,
      {
        method: "POST",

        headers: {
          ...getSupabaseHeaders(
            config.supabaseSecretKey,
            "return=minimal",
          ),

          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },

        body:
          JSON.stringify(
            rows,
          ),

        cache:
          "no-store",
      },
    );

  if (!response.ok) {
    const detail =
      await response.text();

    throw new Error(
      `shop_orders 저장 실패: HTTP ${response.status} ${detail}`,
    );
  }
}

async function markTokenUsed(
  config: ServerConfig,
): Promise<void> {
  const query =
    new URLSearchParams({
      mall_id:
        `eq.${config.mallId}`,
    });

  try {
    await fetch(
      `${config.supabaseUrl}/rest/v1/cafe24_tokens?${query.toString()}`,
      {
        method: "PATCH",

        headers:
          getSupabaseHeaders(
            config.supabaseSecretKey,
            "return=minimal",
          ),

        body:
          JSON.stringify({
            last_used_at:
              new Date().toISOString(),

            last_error_code:
              null,

            last_error_message:
              null,

            last_error_at:
              null,

            updated_at:
              new Date().toISOString(),
          }),

        cache:
          "no-store",
      },
    );
  } catch {
    /*
     * 호출 시각 기록 실패는 주문 동기화 성공 자체를
     * 실패 처리하지 않습니다.
     */
  }
}

async function synchronizeOrders(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const config =
      getServerConfig();

    if (
      !verifySyncSecret(
        request,
        config.syncSecret,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            "UNAUTHORIZED",
          message:
            "주문 동기화 권한이 없습니다.",
        },
        {
          status: 401,
        },
      );
    }

    const lookbackDays =
      getLookbackDays(
        request,
      );

    const accessToken =
      await getValidAccessToken(
        config,
      );

    const cafe24Orders =
      await fetchCafe24Orders(
        config,
        accessToken,
        lookbackDays,
      );

    const mapped =
      mapCafe24Orders(
        cafe24Orders,
      );

    await upsertShopOrders(
      config,
      mapped.rows,
    );

    await markTokenUsed(
      config,
    );

    return NextResponse.json(
      {
        ok: true,
        code:
          "CAFE24_ORDERS_SYNCED",
        message:
          "카페24 주문 동기화가 완료되었습니다.",

        period_days:
          lookbackDays,

        fetched_count:
          cafe24Orders.length,

        saved_member_order_count:
          mapped.rows.length,

        skipped_guest_order_count:
          mapped.skippedGuestOrders,

        skipped_invalid_order_count:
          mapped.skippedInvalidOrders,

        /*
         * 개인정보는 응답하지 않고,
         * 저장된 주문번호만 확인용으로 반환합니다.
         */
        order_ids:
          mapped.rows.map(
            (row) =>
              row.order_id,
          ),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "카페24 주문 동기화 중 오류가 발생했습니다.";

    console.error(
      "[CAFE24 ORDERS SYNC ERROR]",
      message,
    );

    return NextResponse.json(
      {
        ok: false,
        code:
          "CAFE24_ORDERS_SYNC_FAILED",
        message:
          "카페24 주문을 가져오지 못했습니다.",
        detail:
          message,
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  }
}

/*
 * 브라우저 주소창으로 실수로 호출해도 주문 동기화가 실행되지 않도록
 * GET은 상태 안내만 반환합니다.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      code:
        "CAFE24_ORDERS_SYNC_READY",
      message:
        "카페24 주문 동기화 API가 준비되었습니다. POST 요청만 허용됩니다.",
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  return synchronizeOrders(
    request,
  );
}
