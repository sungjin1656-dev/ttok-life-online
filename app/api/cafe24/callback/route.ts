import {
  createCipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_STATE_COOKIE =
  "ttok_cafe24_oauth_state";

const OAUTH_VERIFIER_COOKIE =
  "ttok_cafe24_pkce_verifier";

type ServerConfig = {
  mallId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: Buffer;
  supabaseUrl: string;
  supabaseSecretKey: string;
};

type OAuthStateRow = {
  id: number;
  mall_id: string;
  redirect_uri: string;
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
  shop_no?: unknown;
  token_type?: unknown;
  error?: unknown;
  error_description?: unknown;
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

function isValidMallId(
  value: string,
): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,39}$/.test(
    value,
  );
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
  const mallId =
    normalizeMallId(
      getRequiredEnv(
        "CAFE24_MALL_ID",
      ),
    );

  if (!isValidMallId(mallId)) {
    throw new Error(
      "CAFE24_MALL_ID 형식이 올바르지 않습니다.",
    );
  }

  const redirectUri =
    getRequiredEnv(
      "CAFE24_REDIRECT_URI",
    );

  let parsedRedirectUri: URL;

  try {
    parsedRedirectUri =
      new URL(redirectUri);
  } catch {
    throw new Error(
      "CAFE24_REDIRECT_URI 형식이 올바르지 않습니다.",
    );
  }

  if (
    parsedRedirectUri.protocol !==
    "https:"
  ) {
    throw new Error(
      "CAFE24_REDIRECT_URI는 HTTPS 주소여야 합니다.",
    );
  }

  return {
    mallId,

    clientId:
      getRequiredEnv(
        "CAFE24_CLIENT_ID",
      ),

    clientSecret:
      getRequiredEnv(
        "CAFE24_CLIENT_SECRET",
      ),

    redirectUri:
      parsedRedirectUri.toString(),

    tokenEncryptionKey:
      parseEncryptionKey(
        getRequiredEnv(
          "CAFE24_TOKEN_ENCRYPTION_KEY",
        ),
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

function hashState(
  state: string,
): string {
  return createHash("sha256")
    .update(
      state,
      "utf8",
    )
    .digest("hex");
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

async function consumeOAuthState(
  config: ServerConfig,
  state: string,
): Promise<OAuthStateRow> {
  const stateHash =
    hashState(state);

  const query =
    new URLSearchParams({
      state_hash:
        `eq.${stateHash}`,

      used_at:
        "is.null",

      expires_at:
        `gt.${new Date().toISOString()}`,

      select:
        "id,mall_id,redirect_uri",
    });

  const response =
    await fetch(
      `${config.supabaseUrl}/rest/v1/cafe24_oauth_states?${query.toString()}`,
      {
        method: "PATCH",

        headers:
          getSupabaseHeaders(
            config.supabaseSecretKey,
            "return=representation",
          ),

        body:
          JSON.stringify({
            used_at:
              new Date().toISOString(),
          }),

        cache:
          "no-store",
      },
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `OAuth state 검증 실패: HTTP ${response.status} ${text}`,
    );
  }

  let rows: unknown;

  try {
    rows =
      text
        ? JSON.parse(text)
        : [];
  } catch {
    throw new Error(
      "OAuth state 응답 형식이 올바르지 않습니다.",
    );
  }

  if (
    !Array.isArray(rows) ||
    rows.length !== 1
  ) {
    throw new Error(
      "OAuth state가 만료되었거나 이미 사용되었습니다.",
    );
  }

  return rows[0] as OAuthStateRow;
}

async function exchangeAuthorizationCode(
  config: ServerConfig,
  code: string,
  codeVerifier: string,
): Promise<Cafe24TokenResponse> {
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
        "authorization_code",

      code,

      redirect_uri:
        config.redirectUri,

      code_verifier:
        codeVerifier,
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

  let data: Cafe24TokenResponse = {};

  try {
    data =
      text
        ? (JSON.parse(
            text,
          ) as Cafe24TokenResponse)
        : {};
  } catch {
    throw new Error(
      `카페24 토큰 응답이 JSON이 아닙니다. HTTP ${response.status}`,
    );
  }

  if (!response.ok) {
    const errorCode =
      normalizeString(
        data.error,
      );

    const errorDescription =
      normalizeString(
        data.error_description,
      );

    throw new Error(
      [
        `카페24 토큰 발급 실패: HTTP ${response.status}`,
        errorCode,
        errorDescription,
      ]
        .filter(Boolean)
        .join(" / "),
    );
  }

  return data;
}

async function saveEncryptedTokens(
  config: ServerConfig,
  tokenData: Cafe24TokenResponse,
): Promise<void> {
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
      "카페24 토큰 응답에 Access Token 또는 Refresh Token이 없습니다.",
    );
  }

  const responseMallId =
    normalizeMallId(
      normalizeString(
        tokenData.mall_id,
      ),
    );

  if (
    responseMallId !==
    config.mallId
  ) {
    throw new Error(
      "카페24 토큰의 Mall ID가 환경변수와 일치하지 않습니다.",
    );
  }

  const responseClientId =
    normalizeString(
      tokenData.client_id,
    );

  if (
    responseClientId &&
    responseClientId !==
      config.clientId
  ) {
    throw new Error(
      "카페24 토큰의 Client ID가 환경변수와 일치하지 않습니다.",
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
    mall_id:
      config.mallId,

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

    encryption_key_version:
      1,

    updated_at:
      new Date().toISOString(),
  };

  const response =
    await fetch(
      `${config.supabaseUrl}/rest/v1/cafe24_tokens?on_conflict=mall_id`,
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
      `암호화 토큰 저장 실패: HTTP ${response.status} ${detail}`,
    );
  }
}

function clearOAuthCookies(
  response: NextResponse,
): void {
  for (
    const cookieName
    of [
      OAUTH_STATE_COOKIE,
      OAUTH_VERIFIER_COOKIE,
    ]
  ) {
    response.cookies.set(
      cookieName,
      "",
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/cafe24",
        maxAge: 0,
      },
    );
  }
}

function createResultRedirect(
  request: NextRequest,
  success: boolean,
  messageCode: string,
): NextResponse {
  const destination =
    new URL(
      "/farm",
      request.url,
    );

  destination.searchParams.set(
    "cafe24",
    success
      ? "connected"
      : "error",
  );

  destination.searchParams.set(
    "code",
    messageCode,
  );

  const response =
    NextResponse.redirect(
      destination,
      {
        status: 302,
      },
    );

  clearOAuthCookies(
    response,
  );

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0",
  );

  return response;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const config =
      getServerConfig();

    const url =
      new URL(
        request.url,
      );

    const oauthError =
      normalizeString(
        url.searchParams.get(
          "error",
        ),
      );

    if (oauthError) {
      const description =
        normalizeString(
          url.searchParams.get(
            "error_description",
          ),
        );

      console.error(
        "[CAFE24 OAUTH DENIED]",
        oauthError,
        description,
      );

      return createResultRedirect(
        request,
        false,
        "OAUTH_DENIED",
      );
    }

    const code =
      normalizeString(
        url.searchParams.get(
          "code",
        ),
      );

    const returnedState =
      normalizeString(
        url.searchParams.get(
          "state",
        ),
      );

    const cookieState =
      normalizeString(
        request.cookies.get(
          OAUTH_STATE_COOKIE,
        )?.value,
      );

    const codeVerifier =
      normalizeString(
        request.cookies.get(
          OAUTH_VERIFIER_COOKIE,
        )?.value,
      );

    if (
      !code ||
      !returnedState ||
      !cookieState ||
      !codeVerifier
    ) {
      throw new Error(
        "OAuth callback 필수 값 또는 PKCE verifier가 없습니다.",
      );
    }

    if (
      returnedState !==
      cookieState
    ) {
      throw new Error(
        "OAuth state가 일치하지 않습니다.",
      );
    }

    const stateRow =
      await consumeOAuthState(
        config,
        returnedState,
      );

    if (
      normalizeMallId(
        stateRow.mall_id,
      ) !==
      config.mallId
    ) {
      throw new Error(
        "OAuth state의 Mall ID가 일치하지 않습니다.",
      );
    }

    if (
      stateRow.redirect_uri !==
      config.redirectUri
    ) {
      throw new Error(
        "OAuth state의 Redirect URI가 일치하지 않습니다.",
      );
    }

    const tokenData =
      await exchangeAuthorizationCode(
        config,
        code,
        codeVerifier,
      );

    await saveEncryptedTokens(
      config,
      tokenData,
    );

    return createResultRedirect(
      request,
      true,
      "CONNECTED",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "카페24 OAuth callback 처리 중 오류가 발생했습니다.";

    console.error(
      "[CAFE24 OAUTH CALLBACK ERROR]",
      message,
    );

    return createResultRedirect(
      request,
      false,
      "CALLBACK_FAILED",
    );
  }
}
