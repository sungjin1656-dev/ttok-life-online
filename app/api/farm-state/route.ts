import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FarmStateRow = {
  member_id: string;
  selected_crop: string;
  growth: number;
  water: number;
  stage: number;
  water_count: number;
  harvest_ready: boolean;
  last_water_at: string | null;
  updated_at?: string;
};

type SaveFarmStateBody = {
  member_id?: unknown;
  selected_crop?: unknown;
  growth?: unknown;
  water?: unknown;
  stage?: unknown;
  water_count?: unknown;
  harvest_ready?: unknown;
  last_water_at?: unknown;
};

type SupabaseConfig = {
  url: string;
  secretKey: string;
};

const DEFAULT_FARM_STATE = {
  selected_crop: "",
  growth: 0,
  water: 0,
  stage: 1,
  water_count: 10,
  harvest_ready: false,
  last_water_at: null,
} satisfies Omit<
  FarmStateRow,
  "member_id" | "updated_at"
>;

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
  prefer?: string,
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

  if (prefer) {
    headers.Prefer = prefer;
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

function normalizeString(
  value: unknown,
  fallback: string,
  maximumLength = 100,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeInteger(
  value: unknown,
  fallback: number,
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

function normalizeBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function normalizeNullableDateTime(
  value: unknown,
): string | null | undefined {
  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const timestamp = Date.parse(trimmed);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

function inferStage(
  growth: number,
): number {
  if (growth >= 100) {
    return 10;
  }

  return Math.min(
    10,
    Math.max(
      1,
      Math.floor(growth / 10) + 1,
    ),
  );
}

function inferWaterCount(
  growth: number,
): number {
  return Math.max(
    0,
    Math.ceil((100 - growth) / 10),
  );
}

async function ensureFarmState(
  config: SupabaseConfig,
  memberId: string,
): Promise<{
  ok: boolean;
  status: number;
  detail: string;
}> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/farm` +
        `?on_conflict=member_id`,
      {
        method: "POST",

        headers: getSupabaseHeaders(
          config.secretKey,
          "resolution=merge-duplicates,return=minimal",
        ),

        body: JSON.stringify({
          member_id: memberId,
          ...DEFAULT_FARM_STATE,
        }),

        cache: "no-store",
      },
    );

    return {
      ok: response.ok,
      status: response.status,
      detail:
        response.ok
          ? ""
          : await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail:
        error instanceof Error
          ? error.message
          : "Supabase 요청에 실패했습니다.",
    };
  }
}

async function readFarmState(
  config: SupabaseConfig,
  memberId: string,
): Promise<{
  ok: boolean;
  status: number;
  detail: string;
  farmState: FarmStateRow | null;
}> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/farm` +
        `?member_id=eq.${encodeURIComponent(
          memberId,
        )}` +
        `&select=*` +
        `&limit=1`,
      {
        method: "GET",

        headers: getSupabaseHeaders(
          config.secretKey,
        ),

        cache: "no-store",
      },
    );

    const text =
      await response.text();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        detail: text,
        farmState: null,
      };
    }

    const rows = text
      ? (JSON.parse(
          text,
        ) as FarmStateRow[])
      : [];

    return {
      ok: true,
      status: response.status,
      detail: "",
      farmState:
        Array.isArray(rows)
          ? rows[0] ?? null
          : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail:
        error instanceof Error
          ? error.message
          : "Supabase 요청에 실패했습니다.",
      farmState: null,
    };
  }
}

/*
 * GET
 *
 * 사용 예:
 * /api/farm-state?member_id=sungjin1656
 *
 * 현재 회원의 farm 상태를 조회합니다.
 * 행이 없으면 기본값으로 자동 생성합니다.
 */
export async function GET(
  request: NextRequest,
) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "Supabase 환경변수가 설정되지 않았습니다.",
      },
      {
        status: 503,
      },
    );
  }

  const memberId = normalizeMemberId(
    request.nextUrl.searchParams.get(
      "member_id",
    ),
  );

  if (!validMemberId(memberId)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "올바른 member_id가 필요합니다.",
        received_member_id: memberId,
      },
      {
        status: 400,
      },
    );
  }

  const ensureResult =
    await ensureFarmState(
      config,
      memberId,
    );

  if (!ensureResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 초기화에 실패했습니다.",
        stage: "ensure_farm_state",
        supabase_status:
          ensureResult.status,
        detail:
          ensureResult.detail,
      },
      {
        status: 502,
      },
    );
  }

  const readResult =
    await readFarmState(
      config,
      memberId,
    );

  if (!readResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 조회에 실패했습니다.",
        supabase_status:
          readResult.status,
        detail:
          readResult.detail,
      },
      {
        status: 502,
      },
    );
  }

  if (!readResult.farmState) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태를 찾을 수 없습니다.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    member_id: memberId,
    farm_state:
      readResult.farmState,
  });
}

/*
 * POST
 *
 * 현재 회원의 농장 상태를 저장합니다.
 *
 * 요청 예:
 * {
 *   "member_id": "sungjin1656",
 *   "selected_crop": "apple",
 *   "growth": 80,
 *   "water": 8,
 *   "stage": 8,
 *   "water_count": 2,
 *   "harvest_ready": false
 * }
 */
export async function POST(
  request: NextRequest,
) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "Supabase 환경변수가 설정되지 않았습니다.",
      },
      {
        status: 503,
      },
    );
  }

  let body: SaveFarmStateBody;

  try {
    body =
      (await request.json()) as SaveFarmStateBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message:
          "요청 데이터가 올바르지 않습니다.",
      },
      {
        status: 400,
      },
    );
  }

  const memberId = normalizeMemberId(
    body.member_id,
  );

  if (!validMemberId(memberId)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "올바른 member_id가 필요합니다.",
        received_member_id: memberId,
      },
      {
        status: 400,
      },
    );
  }

  const ensureResult =
    await ensureFarmState(
      config,
      memberId,
    );

  if (!ensureResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 초기화에 실패했습니다.",
        stage: "ensure_farm_state",
        supabase_status:
          ensureResult.status,
        detail:
          ensureResult.detail,
      },
      {
        status: 502,
      },
    );
  }

  const currentResult =
    await readFarmState(
      config,
      memberId,
    );

  if (!currentResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "기존 농장 상태 조회에 실패했습니다.",
        supabase_status:
          currentResult.status,
        detail:
          currentResult.detail,
      },
      {
        status: 502,
      },
    );
  }

  const current =
    currentResult.farmState;

  if (!current) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "저장할 농장 상태를 찾을 수 없습니다.",
      },
      {
        status: 404,
      },
    );
  }

  const growth =
    normalizeInteger(
      body.growth,
      current.growth,
      0,
      100,
    );

  const lastWaterAt =
    normalizeNullableDateTime(
      body.last_water_at,
    );

  const payload: FarmStateRow = {
    member_id: memberId,

    selected_crop:
      normalizeString(
        body.selected_crop,
        current.selected_crop,
      ),

    growth,

    water:
      normalizeInteger(
        body.water,
        current.water,
        0,
        1_000_000_000,
      ),

    stage:
      normalizeInteger(
        body.stage,
        current.stage ||
          inferStage(growth),
        1,
        10,
      ),

    water_count:
      normalizeInteger(
        body.water_count,
        Number.isFinite(
          current.water_count,
        )
          ? current.water_count
          : inferWaterCount(
              growth,
            ),
        0,
        10,
      ),

    harvest_ready:
      growth >= 100
        ? true
        : normalizeBoolean(
            body.harvest_ready,
            current.harvest_ready,
          ),

    last_water_at:
      lastWaterAt === undefined
        ? current.last_water_at
        : lastWaterAt,

    updated_at:
      new Date().toISOString(),
  };

  try {
    const saveResponse = await fetch(
      `${config.url}/rest/v1/farm` +
        `?member_id=eq.${encodeURIComponent(
          memberId,
        )}`,
      {
        method: "PATCH",

        headers: getSupabaseHeaders(
          config.secretKey,
          "return=representation",
        ),

        body: JSON.stringify(payload),

        cache: "no-store",
      },
    );

    const saveText =
      await saveResponse.text();

    if (!saveResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "농장 상태 저장에 실패했습니다.",
          supabase_status:
            saveResponse.status,
          detail:
            saveText,
        },
        {
          status: 502,
        },
      );
    }

    const savedRows = saveText
      ? (JSON.parse(
          saveText,
        ) as FarmStateRow[])
      : [];

    const savedState =
      Array.isArray(savedRows)
        ? savedRows[0] ?? payload
        : payload;

    return NextResponse.json({
      ok: true,
      member_id: memberId,
      farm_state: savedState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 저장 중 오류가 발생했습니다.",
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
