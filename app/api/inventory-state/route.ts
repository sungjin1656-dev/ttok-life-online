import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InventoryRow = {
  id: number;
  member_id: string;
  item_code: string;
  quantity: number;
  created_at: string;
};

type InventoryApiResponse = {
  ok: boolean;
  member_id: string;
  inventory: InventoryRow[];
  item_count: number;
  total_quantity: number;
};

type SaveInventoryBody = {
  member_id?: unknown;
  item_code?: unknown;
  quantity?: unknown;
  action?: unknown;
};

type InventoryAction =
  | "add"
  | "set"
  | "remove";

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

function normalizeItemCode(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:\-.]/g, "")
    .slice(0, 100);
}

function validItemCode(
  value: string,
): boolean {
  return /^[a-z0-9_:\-.]{1,100}$/.test(
    value,
  );
}

function normalizeQuantity(
  value: unknown,
  fallback = 1,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    1_000_000_000,
    Math.max(
      0,
      Math.floor(value),
    ),
  );
}

function normalizeAction(
  value: unknown,
): InventoryAction {
  if (
    value === "set" ||
    value === "remove"
  ) {
    return value;
  }

  return "add";
}

async function readInventory(
  config: SupabaseConfig,
  memberId: string,
): Promise<{
  ok: boolean;
  status: number;
  detail: string;
  rows: InventoryRow[];
}> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/inventory` +
        `?member_id=eq.${encodeURIComponent(
          memberId,
        )}` +
        `&select=id,member_id,item_code,quantity,created_at` +
        `&order=created_at.desc`,
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
        rows: [],
      };
    }

    const parsed = text
      ? (JSON.parse(
          text,
        ) as InventoryRow[])
      : [];

    return {
      ok: true,
      status: response.status,
      detail: "",
      rows:
        Array.isArray(parsed)
          ? parsed
          : [],
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail:
        error instanceof Error
          ? error.message
          : "Supabase 요청에 실패했습니다.",
      rows: [],
    };
  }
}

async function readInventoryItem(
  config: SupabaseConfig,
  memberId: string,
  itemCode: string,
): Promise<{
  ok: boolean;
  status: number;
  detail: string;
  row: InventoryRow | null;
}> {
  try {
    const response = await fetch(
      `${config.url}/rest/v1/inventory` +
        `?member_id=eq.${encodeURIComponent(
          memberId,
        )}` +
        `&item_code=eq.${encodeURIComponent(
          itemCode,
        )}` +
        `&select=id,member_id,item_code,quantity,created_at` +
        `&order=created_at.asc` +
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
        row: null,
      };
    }

    const rows = text
      ? (JSON.parse(
          text,
        ) as InventoryRow[])
      : [];

    return {
      ok: true,
      status: response.status,
      detail: "",
      row:
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
      row: null,
    };
  }
}

function createInventoryResponse(
  memberId: string,
  rows: InventoryRow[],
): InventoryApiResponse {
  const inventory =
    rows.filter(
      (item) =>
        Number.isFinite(
          item.quantity,
        ) &&
        item.quantity > 0,
    );

  return {
    ok: true,
    member_id: memberId,
    inventory,
    item_count:
      inventory.length,
    total_quantity:
      inventory.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Math.floor(
              item.quantity,
            ),
          ),
        0,
      ),
  };
}

/*
 * GET
 *
 * 사용 예:
 * /api/inventory-state?member_id=sungjin1656
 *
 * 현재 회원의 보관함 상품 목록을 조회합니다.
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

  const readResult =
    await readInventory(
      config,
      memberId,
    );

  if (!readResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "보관함 조회에 실패했습니다.",
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

  return NextResponse.json(
    createInventoryResponse(
      memberId,
      readResult.rows,
    ),
  );
}

/*
 * POST
 *
 * action:
 * - add    : 기존 수량에 quantity를 더합니다. 기본값
 * - set    : 수량을 quantity로 설정합니다.
 * - remove : 기존 수량에서 quantity를 뺍니다.
 *
 * 요청 예:
 * {
 *   "member_id": "sungjin1656",
 *   "item_code": "lucky_flower",
 *   "quantity": 1,
 *   "action": "add"
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

  let body: SaveInventoryBody;

  try {
    body =
      (await request.json()) as SaveInventoryBody;
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

  const memberId =
    normalizeMemberId(
      body.member_id,
    );

  const itemCode =
    normalizeItemCode(
      body.item_code,
    );

  const action =
    normalizeAction(
      body.action,
    );

  const quantity =
    normalizeQuantity(
      body.quantity,
      1,
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

  if (!validItemCode(itemCode)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "올바른 item_code가 필요합니다.",
        received_item_code: itemCode,
      },
      {
        status: 400,
      },
    );
  }

  const itemResult =
    await readInventoryItem(
      config,
      memberId,
      itemCode,
    );

  if (!itemResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "기존 보관함 상품 조회에 실패했습니다.",
        supabase_status:
          itemResult.status,
        detail:
          itemResult.detail,
      },
      {
        status: 502,
      },
    );
  }

  const currentQuantity =
    itemResult.row
      ? normalizeQuantity(
          itemResult.row.quantity,
          0,
        )
      : 0;

  let nextQuantity: number;

  if (action === "set") {
    nextQuantity = quantity;
  } else if (action === "remove") {
    nextQuantity =
      Math.max(
        0,
        currentQuantity -
          quantity,
      );
  } else {
    nextQuantity =
      Math.min(
        1_000_000_000,
        currentQuantity +
          quantity,
      );
  }

  try {
    if (itemResult.row) {
      const updateResponse =
        await fetch(
          `${config.url}/rest/v1/inventory` +
            `?id=eq.${encodeURIComponent(
              String(
                itemResult.row.id,
              ),
            )}`,
          {
            method: "PATCH",

            headers:
              getSupabaseHeaders(
                config.secretKey,
                "return=representation",
              ),

            body: JSON.stringify({
              quantity:
                nextQuantity,
            }),

            cache: "no-store",
          },
        );

      const updateText =
        await updateResponse.text();

      if (!updateResponse.ok) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "보관함 상품 수량 수정에 실패했습니다.",
            supabase_status:
              updateResponse.status,
            detail:
              updateText,
          },
          {
            status: 502,
          },
        );
      }
    } else if (nextQuantity > 0) {
      const insertResponse =
        await fetch(
          `${config.url}/rest/v1/inventory`,
          {
            method: "POST",

            headers:
              getSupabaseHeaders(
                config.secretKey,
                "return=representation",
              ),

            body: JSON.stringify({
              member_id:
                memberId,

              item_code:
                itemCode,

              quantity:
                nextQuantity,
            }),

            cache: "no-store",
          },
        );

      const insertText =
        await insertResponse.text();

      if (!insertResponse.ok) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "보관함 상품 추가에 실패했습니다.",
            supabase_status:
              insertResponse.status,
            detail:
              insertText,
          },
          {
            status: 502,
          },
        );
      }
    }

    const readResult =
      await readInventory(
        config,
        memberId,
      );

    if (!readResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "저장 후 보관함 조회에 실패했습니다.",
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

    return NextResponse.json({
      ...createInventoryResponse(
        memberId,
        readResult.rows,
      ),

      changed_item: {
        item_code:
          itemCode,

        previous_quantity:
          currentQuantity,

        quantity:
          nextQuantity,

        action,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "보관함 저장 중 오류가 발생했습니다.",
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
