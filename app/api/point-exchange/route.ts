import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupabaseConfig = {
  url: string;
  secretKey: string;
};

type ExchangeRequestBody = {
  member_id?: unknown;
  product_id?: unknown;
  request_id?: unknown;
};

type ExchangeProductConfig = {
  id: string;
  itemCode: string;
  pointCost: number;
  itemQuantity: number;
  name: string;
};

type ExchangeRpcRow = {
  ok?: boolean;
  code?: string;
  message?: string;
  member_id?: string;
  points?: number;
  inventory_item_code?: string;
  inventory_quantity?: number;
  transaction_key?: string;
};

const EXCHANGE_PRODUCTS: Record<
  string,
  ExchangeProductConfig
> = {
  "carrot-1kg": {
    id: "carrot-1kg",
    itemCode: "carrot-1kg",
    pointCost: 500,
    itemQuantity: 1,
    name: "당근 1kg",
  },

  "onion-1kg": {
    id: "onion-1kg",
    itemCode: "onion-1kg",
    pointCost: 700,
    itemQuantity: 1,
    name: "양파 1kg",
  },

  "egg-10": {
    id: "egg-10",
    itemCode: "egg-10",
    pointCost: 1000,
    itemQuantity: 1,
    name: "신선 계란 10구",
  },

  "tomato-5kg": {
    id: "tomato-5kg",
    itemCode: "tomato-5kg",
    pointCost: 1500,
    itemQuantity: 1,
    name: "토마토 5kg",
  },

  "potato-5kg": {
    id: "potato-5kg",
    itemCode: "potato-5kg",
    pointCost: 2000,
    itemQuantity: 1,
    name: "감자 5kg",
  },

  "shine-muscat": {
    id: "shine-muscat",
    itemCode: "shine-muscat",
    pointCost: 4000,
    itemQuantity: 1,
    name: "샤인머스켓",
  },
};

function getSupabaseConfig(): SupabaseConfig | null {
  const rawUrl =
    process.env.SUPABASE_URL?.trim() ?? "";

  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ?? "";

  if (!rawUrl || !secretKey) {
    return null;
  }

  return {
    url: rawUrl.replace(/\/+$/, ""),
    secretKey,
  };
}

function getSupabaseHeaders(
  secretKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
  };

  if (!secretKey.startsWith("sb_secret_")) {
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

function validMemberId(
  value: string,
): boolean {
  return /^[A-Za-z0-9_:\-.@]{2,160}$/.test(
    value,
  );
}

function validRequestId(
  value: string,
): boolean {
  return /^[A-Za-z0-9_:\-.]{8,200}$/.test(
    value,
  );
}

function normalizeInteger(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function parseRpcResult(
  value: unknown,
): ExchangeRpcRow | null {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value[0] &&
    typeof value[0] === "object"
  ) {
    return value[0] as ExchangeRpcRow;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as ExchangeRpcRow;
  }

  return null;
}

/*
 * POST /api/point-exchange
 *
 * 요청:
 * {
 *   "member_id": "sungjin1656",
 *   "product_id": "carrot-1kg",
 *   "request_id": "exchange-..."
 * }
 *
 * 가격과 Inventory 코드는 서버 고정 목록에서 확인합니다.
 * 클라이언트가 보낸 가격은 절대 사용하지 않습니다.
 */
export async function POST(
  request: NextRequest,
) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: "SUPABASE_NOT_CONFIGURED",
        message:
          "Supabase 환경변수가 설정되지 않았습니다.",
      },
      {
        status: 503,
      },
    );
  }

  let body: ExchangeRequestBody;

  try {
    body =
      (await request.json()) as ExchangeRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_JSON",
        message:
          "요청 데이터가 올바르지 않습니다.",
      },
      {
        status: 400,
      },
    );
  }

  const memberId =
    normalizeString(
      body.member_id,
    );

  const productId =
    normalizeString(
      body.product_id,
    );

  const requestId =
    normalizeString(
      body.request_id,
    );

  if (!validMemberId(memberId)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_MEMBER_ID",
        message:
          "올바른 member_id가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  if (!validRequestId(requestId)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REQUEST_ID",
        message:
          "올바른 request_id가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  const product =
    EXCHANGE_PRODUCTS[productId];

  if (!product) {
    return NextResponse.json(
      {
        ok: false,
        code: "PRODUCT_NOT_FOUND",
        message:
          "교환할 수 없는 상품입니다.",
      },
      {
        status: 404,
      },
    );
  }

  try {
    const rpcResponse =
      await fetch(
        `${config.url}/rest/v1/rpc/exchange_points_once`,
        {
          method: "POST",

          headers:
            getSupabaseHeaders(
              config.secretKey,
            ),

          body: JSON.stringify({
            p_member_id:
              memberId,

            p_request_id:
              requestId,

            p_item_code:
              product.itemCode,

            p_point_cost:
              product.pointCost,

            p_item_quantity:
              product.itemQuantity,
          }),

          cache: "no-store",
        },
      );

    const rpcText =
      await rpcResponse.text();

    let rpcJson: unknown = null;

    try {
      rpcJson =
        rpcText
          ? JSON.parse(rpcText)
          : null;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_RPC_RESPONSE",
          message:
            "교환 서버 응답이 올바르지 않습니다.",
          supabase_status:
            rpcResponse.status,
          detail:
            rpcText,
        },
        {
          status: 502,
        },
      );
    }

    if (!rpcResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "RPC_FAILED",
          message:
            "상품 교환 처리에 실패했습니다.",
          supabase_status:
            rpcResponse.status,
          detail:
            rpcJson,
        },
        {
          status: 502,
        },
      );
    }

    const result =
      parseRpcResult(
        rpcJson,
      );

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          code: "EMPTY_RPC_RESULT",
          message:
            "교환 처리 결과가 없습니다.",
        },
        {
          status: 502,
        },
      );
    }

    const resultOk =
      result.ok === true;

    const resultCode =
      normalizeString(
        result.code,
      ) ||
      (
        resultOk
          ? "EXCHANGE_COMPLETED"
          : "EXCHANGE_REJECTED"
      );

    const resultMessage =
      normalizeString(
        result.message,
      ) ||
      (
        resultOk
          ? "상품 교환이 완료되었습니다."
          : "상품을 교환할 수 없습니다."
      );

    if (!resultOk) {
      const status =
        resultCode ===
        "INSUFFICIENT_POINTS"
          ? 409
          : resultCode ===
              "ALREADY_EXCHANGED"
            ? 409
            : resultCode ===
                "MEMBER_NOT_FOUND"
              ? 404
              : 400;

      return NextResponse.json(
        {
          ok: false,
          code:
            resultCode,
          message:
            resultMessage,
          member_id:
            memberId,
          points:
            normalizeInteger(
              result.points,
              0,
            ),
          inventory: {
            item_code:
              normalizeString(
                result.inventory_item_code,
              ) ||
              product.itemCode,

            quantity:
              normalizeInteger(
                result.inventory_quantity,
                0,
              ),
          },
          transaction_key:
            normalizeString(
              result.transaction_key,
            ),
        },
        {
          status,
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        code:
          resultCode,
        message:
          resultMessage,
        member_id:
          memberId,
        product: {
          id:
            product.id,
          name:
            product.name,
          point_cost:
            product.pointCost,
        },
        points:
          normalizeInteger(
            result.points,
            0,
          ),
        inventory: {
          item_code:
            normalizeString(
              result.inventory_item_code,
            ) ||
            product.itemCode,

          quantity:
            normalizeInteger(
              result.inventory_quantity,
              0,
            ),
        },
        transaction_key:
          normalizeString(
            result.transaction_key,
          ),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "EXCHANGE_SERVER_ERROR",
        message:
          "상품 교환 처리 중 서버 오류가 발생했습니다.",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
