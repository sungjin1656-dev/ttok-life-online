import { NextRequest, NextResponse } from "next/server";

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
  updated_at: string;
};

type FarmStatePayload = {
  member_id?: unknown;
  selected_crop?: unknown;
  growth?: unknown;
  water?: unknown;
  stage?: unknown;
  water_count?: unknown;
  harvest_ready?: unknown;
  last_water_at?: unknown;
};

const DEFAULT_FARM_STATE: {
  selected_crop: string;
  growth: number;
  water: number;
  stage: number;
  water_count: number;
  harvest_ready: boolean;
  last_water_at: string | null;
} = {
  selected_crop: "carrot",
  growth: 0,
  water: 0,
  stage: 1,
  water_count: 10,
  harvest_ready: false,
  last_water_at: null,
};

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim() ||
    "";

  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수가 없습니다.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.",
    );
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

function createSupabaseHeaders(
  serviceRoleKey: string,
  extraHeaders?: Record<string, string>,
): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

function normalizeMemberId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const memberId = value.trim();

  if (
    !memberId ||
    memberId === "0" ||
    memberId.toLowerCase() === "null" ||
    memberId.toLowerCase() === "undefined"
  ) {
    return "";
  }

  return memberId;
}

function normalizeCrop(
  value: unknown,
  fallback = DEFAULT_FARM_STATE.selected_crop,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const crop = value.trim();

  if (!crop) {
    return fallback;
  }

  /*
   * DB나 로그에 과도하게 긴 문자열이 들어가는 것을 방지합니다.
   */
  return crop.slice(0, 100);
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(numericValue),
    ),
  );
}

function normalizeBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
}

function normalizeDateTime(
  value: unknown,
  fallback: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsedTime = Date.parse(trimmed);

  if (!Number.isFinite(parsedTime)) {
    return fallback;
  }

  return new Date(parsedTime).toISOString();
}

function normalizeFarmRow(
  value: Partial<FarmStateRow>,
  memberId: string,
): FarmStateRow {
  const growth = normalizeInteger(
    value.growth,
    DEFAULT_FARM_STATE.growth,
    0,
    100,
  );

  /*
   * 성장률은 10% 단위라는 현재 농장 구조를 기준으로
   * stage를 1~10 사이에서 안전하게 보정합니다.
   */
  const inferredStage =
    growth >= 100
      ? 10
      : Math.max(
          1,
          Math.floor(growth / 10) + 1,
        );

  const stage = normalizeInteger(
    value.stage,
    inferredStage,
    1,
    10,
  );

  const inferredWaterCount =
    Math.max(
      0,
      Math.ceil((100 - growth) / 10),
    );

  const waterCount = normalizeInteger(
    value.water_count,
    inferredWaterCount,
    0,
    10,
  );

  const harvestReady =
    growth >= 100
      ? true
      : normalizeBoolean(
          value.harvest_ready,
          DEFAULT_FARM_STATE.harvest_ready,
        );

  return {
    member_id: memberId,

    selected_crop: normalizeCrop(
      value.selected_crop,
    ),

    growth,

    water: normalizeInteger(
      value.water,
      DEFAULT_FARM_STATE.water,
      0,
      1_000_000_000,
    ),

    stage,

    water_count: waterCount,

    harvest_ready: harvestReady,

    last_water_at: normalizeDateTime(
      value.last_water_at,
      DEFAULT_FARM_STATE.last_water_at,
    ),

    updated_at:
      typeof value.updated_at === "string" &&
      value.updated_at.trim()
        ? value.updated_at
        : new Date().toISOString(),
  };
}

async function parseSupabaseResponse(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getSupabaseErrorMessage(
  result: unknown,
  fallback: string,
): string {
  if (!result || typeof result !== "object") {
    return fallback;
  }

  const record = result as Record<string, unknown>;

  const message =
    typeof record.message === "string"
      ? record.message
      : "";

  const details =
    typeof record.details === "string"
      ? record.details
      : "";

  const hint =
    typeof record.hint === "string"
      ? record.hint
      : "";

  return [message, details, hint]
    .filter(Boolean)
    .join(" / ") || fallback;
}

async function readFarmState(
  memberId: string,
): Promise<FarmStateRow | null> {
  const {
    supabaseUrl,
    serviceRoleKey,
  } = getSupabaseConfig();

  const query =
    new URLSearchParams({
      select:
        "member_id,selected_crop,growth,water,stage,water_count,harvest_ready,last_water_at,updated_at",

      member_id:
        `eq.${memberId}`,

      limit: "1",
    });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/farm?${query.toString()}`,
    {
      method: "GET",

      headers:
        createSupabaseHeaders(
          serviceRoleKey,
        ),

      cache: "no-store",
    },
  );

  const result =
    await parseSupabaseResponse(
      response,
    );

  if (!response.ok) {
    throw new Error(
      getSupabaseErrorMessage(
        result,
        `farm 조회 실패: HTTP ${response.status}`,
      ),
    );
  }

  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }

  const firstRow =
    result[0];

  if (!firstRow || typeof firstRow !== "object") {
    return null;
  }

  return normalizeFarmRow(
    firstRow as Partial<FarmStateRow>,
    memberId,
  );
}

async function upsertFarmState(
  memberId: string,
  farmState: Partial<FarmStateRow>,
): Promise<FarmStateRow> {
  const {
    supabaseUrl,
    serviceRoleKey,
  } = getSupabaseConfig();

  const normalized =
    normalizeFarmRow(
      farmState,
      memberId,
    );

  const payload = {
    member_id:
      normalized.member_id,

    selected_crop:
      normalized.selected_crop,

    growth:
      normalized.growth,

    water:
      normalized.water,

    stage:
      normalized.stage,

    water_count:
      normalized.water_count,

    harvest_ready:
      normalized.harvest_ready,

    last_water_at:
      normalized.last_water_at,

    updated_at:
      new Date().toISOString(),
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/farm?on_conflict=member_id`,
    {
      method: "POST",

      headers:
        createSupabaseHeaders(
          serviceRoleKey,
          {
            Prefer:
              "resolution=merge-duplicates,return=representation",
          },
        ),

      body:
        JSON.stringify(
          payload,
        ),

      cache: "no-store",
    },
  );

  const result =
    await parseSupabaseResponse(
      response,
    );

  if (!response.ok) {
    throw new Error(
      getSupabaseErrorMessage(
        result,
        `farm 저장 실패: HTTP ${response.status}`,
      ),
    );
  }

  if (
    !Array.isArray(result) ||
    result.length === 0 ||
    !result[0] ||
    typeof result[0] !== "object"
  ) {
    /*
     * Supabase 설정에 따라 representation 결과가 비어 있을 경우
     * 저장 후 한 번 더 조회해 확정값을 반환합니다.
     */
    const savedState =
      await readFarmState(
        memberId,
      );

    if (!savedState) {
      throw new Error(
        "농장 저장 후 데이터를 다시 확인하지 못했습니다.",
      );
    }

    return savedState;
  }

  return normalizeFarmRow(
    result[0] as Partial<FarmStateRow>,
    memberId,
  );
}

async function createDefaultFarmState(
  memberId: string,
): Promise<FarmStateRow> {
  return upsertFarmState(
    memberId,
    {
      member_id: memberId,

      selected_crop:
        DEFAULT_FARM_STATE.selected_crop,

      growth:
        DEFAULT_FARM_STATE.growth,

      water:
        DEFAULT_FARM_STATE.water,

      stage:
        DEFAULT_FARM_STATE.stage,

      water_count:
        DEFAULT_FARM_STATE.water_count,

      harvest_ready:
        DEFAULT_FARM_STATE.harvest_ready,

      last_water_at:
        DEFAULT_FARM_STATE.last_water_at,
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const memberId =
      normalizeMemberId(
        request.nextUrl.searchParams.get(
          "member_id",
        ),
      );

    if (!memberId) {
      return NextResponse.json(
        {
          ok: false,

          message:
            "올바른 member_id가 필요합니다.",

          received_member_id:
            request.nextUrl.searchParams.get(
              "member_id",
            ) ?? "",
        },
        {
          status: 400,
        },
      );
    }

    let farmState =
      await readFarmState(
        memberId,
      );

    if (!farmState) {
      farmState =
        await createDefaultFarmState(
          memberId,
        );
    }

    return NextResponse.json(
      {
        ok: true,
        member_id: memberId,
        farm_state: farmState,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "농장 상태를 조회하지 못했습니다.";

    console.error(
      "[TTOK LIFE] farm-state GET 오류:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 조회에 실패했습니다.",
        detail: message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    let body: FarmStatePayload;

    try {
      body =
        await request.json() as FarmStatePayload;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          message:
            "요청 JSON 형식이 올바르지 않습니다.",
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

    if (!memberId) {
      return NextResponse.json(
        {
          ok: false,

          message:
            "올바른 member_id가 필요합니다.",

          received_member_id:
            typeof body.member_id === "string"
              ? body.member_id
              : "",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 저장 시 누락된 필드가 기존 값을 0으로 덮지 않도록
     * 현재 DB 상태를 먼저 읽습니다.
     */
    const currentState =
      await readFarmState(
        memberId,
      );

    const baseState =
      currentState ??
      normalizeFarmRow(
        {
          member_id: memberId,
          ...DEFAULT_FARM_STATE,
        },
        memberId,
      );

    const nextGrowth =
      normalizeInteger(
        body.growth,
        baseState.growth,
        0,
        100,
      );

    const inferredStage =
      nextGrowth >= 100
        ? 10
        : Math.max(
            1,
            Math.floor(nextGrowth / 10) + 1,
          );

    const inferredWaterCount =
      Math.max(
        0,
        Math.ceil((100 - nextGrowth) / 10),
      );

    const savedState =
      await upsertFarmState(
        memberId,
        {
          member_id:
            memberId,

          selected_crop:
            normalizeCrop(
              body.selected_crop,
              baseState.selected_crop,
            ),

          growth:
            nextGrowth,

          water:
            normalizeInteger(
              body.water,
              baseState.water,
              0,
              1_000_000_000,
            ),

          stage:
            normalizeInteger(
              body.stage,
              inferredStage,
              1,
              10,
            ),

          water_count:
            normalizeInteger(
              body.water_count,
              inferredWaterCount,
              0,
              10,
            ),

          harvest_ready:
            nextGrowth >= 100
              ? true
              : normalizeBoolean(
                  body.harvest_ready,
                  baseState.harvest_ready,
                ),

          last_water_at:
            normalizeDateTime(
              body.last_water_at,
              baseState.last_water_at,
            ),
        },
      );

    return NextResponse.json(
      {
        ok: true,
        member_id: memberId,
        farm_state: savedState,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "농장 상태를 저장하지 못했습니다.";

    console.error(
      "[TTOK LIFE] farm-state POST 오류:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "농장 상태 저장에 실패했습니다.",
        detail: message,
      },
      {
        status: 500,
      },
    );
  }
}