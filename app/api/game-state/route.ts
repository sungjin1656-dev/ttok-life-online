import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GameStateRow = {
  member_id: string;
  water: number;
  points: number;
  today_steps: number;
  weekly_steps: number;
  total_steps: number;
  calories: number;
  level: number;
  exp: number;
  total_purchase: number;
  attendance_count: number;
  last_attendance_date: string | null;
  invited_count: number;
  version: number;
  created_at?: string;
  updated_at?: string;
};

type SaveGameStateBody = {
  member_id?: unknown;
  water?: unknown;
  points?: unknown;
  today_steps?: unknown;
  weekly_steps?: unknown;
  total_steps?: unknown;
  calories?: unknown;
  level?: unknown;
  exp?: unknown;
  total_purchase?: unknown;
  attendance_count?: unknown;
  last_attendance_date?: unknown;
  invited_count?: unknown;
  version?: unknown;
};

type SupabaseConfig = {
  url: string;
  secretKey: string;
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

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum = 0,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.floor(value),
  );
}

function normalizeNullableDate(
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

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)
  ) {
    return undefined;
  }

  return trimmed;
}

async function ensureGameState(
  config: SupabaseConfig,
  memberId: string,
): Promise<{
  ok: boolean;
  status: number;
  detail: string;
}> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/game_state` +
        `?on_conflict=member_id`,
      {
        method: "POST",

        headers: getSupabaseHeaders(
          config.secretKey,
          "resolution=merge-duplicates,return=minimal",
        ),

        body: JSON.stringify({
          member_id: memberId,
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

/*
 * GET
 *
 * 사용 예:
 * /api/game-state?member_id=sungjin1656
 *
 * 현재 회원의 game_state를 조회합니다.
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

  /*
   * game_state 행이 없을 때 기본값으로 자동 생성합니다.
   */
  const ensureResult =
    await ensureGameState(
      config,
      memberId,
    );

  if (!ensureResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "게임 상태 초기화에 실패했습니다.",
        stage: "ensure_game_state",
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

  try {
    const query =
      `${config.url}/rest/v1/game_state` +
      `?member_id=eq.${encodeURIComponent(
        memberId,
      )}` +
      `&select=*` +
      `&limit=1`;

    const response = await fetch(query, {
      method: "GET",

      headers: getSupabaseHeaders(
        config.secretKey,
      ),

      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "게임 상태 조회에 실패했습니다.",
          supabase_status:
            response.status,
          detail: text,
        },
        {
          status: 502,
        },
      );
    }

    const rows = text
      ? (JSON.parse(text) as GameStateRow[])
      : [];

    const gameState =
      Array.isArray(rows)
        ? rows[0] ?? null
        : null;

    if (!gameState) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "게임 상태를 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      member_id: memberId,
      game_state: gameState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "게임 상태 조회 중 오류가 발생했습니다.",
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

/*
 * POST
 *
 * 현재 회원의 게임 상태를 저장합니다.
 *
 * 요청 예:
 * {
 *   "member_id": "sungjin1656",
 *   "water": 100,
 *   "points": 2000,
 *   "today_steps": 3500
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

  let body: SaveGameStateBody;

  try {
    body =
      (await request.json()) as SaveGameStateBody;
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

  /*
   * 기존 값을 먼저 조회합니다.
   * 요청에 포함되지 않은 값은 기존 값을 유지합니다.
   */
  try {
    const ensureResult =
      await ensureGameState(
        config,
        memberId,
      );

    if (!ensureResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "게임 상태 초기화에 실패했습니다.",
          stage: "ensure_game_state",
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

    const currentResponse = await fetch(
      `${config.url}/rest/v1/game_state` +
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

    const currentText =
      await currentResponse.text();

    if (!currentResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "기존 게임 상태 조회에 실패했습니다.",
          supabase_status:
            currentResponse.status,
          detail: currentText,
        },
        {
          status: 502,
        },
      );
    }

    const currentRows = currentText
      ? (JSON.parse(
          currentText,
        ) as GameStateRow[])
      : [];

    const current =
      Array.isArray(currentRows)
        ? currentRows[0]
        : undefined;

    if (!current) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "저장할 게임 상태를 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const lastAttendanceDate =
      normalizeNullableDate(
        body.last_attendance_date,
      );

    const payload: GameStateRow = {
      member_id: memberId,

      water: normalizeInteger(
        body.water,
        current.water,
      ),

      points: normalizeInteger(
        body.points,
        current.points,
      ),

      today_steps: normalizeInteger(
        body.today_steps,
        current.today_steps,
      ),

      weekly_steps: normalizeInteger(
        body.weekly_steps,
        current.weekly_steps,
      ),

      total_steps: normalizeInteger(
        body.total_steps,
        current.total_steps,
      ),

      calories: normalizeInteger(
        body.calories,
        current.calories,
      ),

      level: normalizeInteger(
        body.level,
        current.level,
        1,
      ),

      exp: normalizeInteger(
        body.exp,
        current.exp,
      ),

      total_purchase: normalizeInteger(
        body.total_purchase,
        current.total_purchase,
      ),

      attendance_count: normalizeInteger(
        body.attendance_count,
        current.attendance_count,
      ),

      last_attendance_date:
        lastAttendanceDate === undefined
          ? current.last_attendance_date
          : lastAttendanceDate,

      invited_count: normalizeInteger(
        body.invited_count,
        current.invited_count,
      ),

      version:
        current.version + 1,

      updated_at:
        new Date().toISOString(),
    };

    const saveResponse = await fetch(
      `${config.url}/rest/v1/game_state` +
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
            "게임 상태 저장에 실패했습니다.",
          supabase_status:
            saveResponse.status,
          detail: saveText,
        },
        {
          status: 502,
        },
      );
    }

    const savedRows = saveText
      ? (JSON.parse(
          saveText,
        ) as GameStateRow[])
      : [];

    const savedState =
      Array.isArray(savedRows)
        ? savedRows[0] ?? payload
        : payload;

    return NextResponse.json({
      ok: true,
      member_id: memberId,
      game_state: savedState,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "게임 상태 저장 중 오류가 발생했습니다.",
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