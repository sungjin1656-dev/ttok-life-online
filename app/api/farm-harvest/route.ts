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

type HarvestRequestBody = {
  member_id?: unknown;
};

type HarvestRpcRow = {
  ok?: boolean;
  code?: string;
  message?: string;
  member_id?: string;
  points?: number;
  water?: number;
  farm_growth?: number;
  farm_water?: number;
  farm_stage?: number;
  farm_water_count?: number;
  harvest_ready?: boolean;
  inventory_item_code?: string;
  inventory_quantity?: number;
  transaction_key?: string;
};

type HarvestResponse = {
  ok: boolean;
  code: string;
  message: string;
  member_id: string;
  game_state: {
    points: number;
    water: number;
  };
  farm_state: {
    growth: number;
    water: number;
    stage: number;
    water_count: number;
    harvest_ready: boolean;
  };
  inventory: {
    item_code: string;
    quantity: number;
  };
  transaction_key: string;
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

  /*
   * 기존 service_role JWT 키는 Authorization Bearer를 사용합니다.
   * 새로운 sb_secret_* 키는 JWT가 아니므로 Bearer로 보내지 않습니다.
   */
  if (!secretKey.startsWith("sb_secret_")) {
    headers.Authorization =
      `Bearer ${secretKey}`;
  }

  return headers;
}

function normalizeMemberId(
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

function normalizeInteger(
  value: unknown,
  fallback = 0,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(value),
    ),
  );
}

function normalizeString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value.trim()
    : fallback;
}

function normalizeBoolean(
  value: unknown,
  fallback = false,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function parseRpcResult(
  value: unknown,
): HarvestRpcRow | null {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value[0] &&
    typeof value[0] === "object"
  ) {
    return value[0] as HarvestRpcRow;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as HarvestRpcRow;
  }

  return null;
}

/*
 * POST /api/farm-harvest
 *
 * 요청:
 * {
 *   "member_id": "sungjin1656"
 * }
 *
 * 중요:
 * 이 API는 클라이언트에서 포인트를 계산하지 않습니다.
 * Supabase RPC harvest_farm_once가 아래 작업을 하나의 DB 트랜잭션으로 처리합니다.
 *
 * 1. 회원 농장 행 잠금
 * 2. 성장률 100% 및 harvest_ready 확인
 * 3. point_transactions 중복 방지 원장 기록
 * 4. game_state.points +500
 * 5. farm 상태 0% 초기화
 * 6. inventory lucky_flower +1
 *
 * 같은 수확 건에 대한 중복 요청은 DB에서 차단됩니다.
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

  let body: HarvestRequestBody;

  try {
    body =
      (await request.json()) as HarvestRequestBody;
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
    normalizeMemberId(
      body.member_id,
    );

  if (!validMemberId(memberId)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_MEMBER_ID",
        message:
          "올바른 member_id가 필요합니다.",
        received_member_id:
          memberId,
      },
      {
        status: 400,
      },
    );
  }

  try {
    const rpcResponse =
      await fetch(
        `${config.url}/rest/v1/rpc/harvest_farm_once`,
        {
          method: "POST",

          headers:
            getSupabaseHeaders(
              config.secretKey,
            ),

          body: JSON.stringify({
            p_member_id:
              memberId,

            p_reward_points:
              500,

            p_item_code:
              "lucky_flower",

            p_item_quantity:
              1,
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
          ? JSON.parse(
              rpcText,
            )
          : null;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_RPC_RESPONSE",
          message:
            "수확 서버 응답이 올바르지 않습니다.",
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
            "수확 처리에 실패했습니다.",
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
            "수확 처리 결과가 없습니다.",
        },
        {
          status: 502,
        },
      );
    }

    const resultOk =
      normalizeBoolean(
        result.ok,
        false,
      );

    const resultCode =
      normalizeString(
        result.code,
        resultOk
          ? "HARVEST_COMPLETED"
          : "HARVEST_REJECTED",
      );

    const resultMessage =
      normalizeString(
        result.message,
        resultOk
          ? "수확이 완료되었습니다."
          : "수확할 수 없습니다.",
      );

    if (!resultOk) {
      const status =
        resultCode ===
        "FARM_NOT_READY"
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
        },
        {
          status,
        },
      );
    }

    const responseBody: HarvestResponse = {
      ok: true,
      code:
        resultCode,
      message:
        resultMessage,
      member_id:
        normalizeString(
          result.member_id,
          memberId,
        ),

      game_state: {
        points:
          normalizeInteger(
            result.points,
            0,
          ),

        water:
          normalizeInteger(
            result.water,
            0,
          ),
      },

      farm_state: {
        growth:
          normalizeInteger(
            result.farm_growth,
            0,
            0,
            100,
          ),

        water:
          normalizeInteger(
            result.farm_water,
            0,
          ),

        stage:
          normalizeInteger(
            result.farm_stage,
            1,
            1,
            10,
          ),

        water_count:
          normalizeInteger(
            result.farm_water_count,
            10,
            0,
            10,
          ),

        harvest_ready:
          normalizeBoolean(
            result.harvest_ready,
            false,
          ),
      },

      inventory: {
        item_code:
          normalizeString(
            result.inventory_item_code,
            "lucky_flower",
          ),

        quantity:
          normalizeInteger(
            result.inventory_quantity,
            0,
          ),
      },

      transaction_key:
        normalizeString(
          result.transaction_key,
          "",
        ),
    };

    return NextResponse.json(
      responseBody,
      {
        status: 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "HARVEST_SERVER_ERROR",
        message:
          "수확 처리 중 서버 오류가 발생했습니다.",
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
