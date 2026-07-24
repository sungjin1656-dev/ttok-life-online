import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BootstrapBody = {
  member_id?: unknown;
  member_name?: unknown;
};

type SupabaseResult = {
  ok: boolean;
  status: number;
  detail: string;
};

function validMemberId(value: string) {
  return /^[A-Za-z0-9_:\-.@]{2,160}$/.test(value);
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function supabaseHeaders(secretKey: string, prefer: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
  // Legacy service_role keys are JWTs and may be sent as Bearer tokens.
  // New sb_secret_* keys are not JWTs; using them as Authorization Bearer can fail.
  if (!secretKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }
  return headers;
}

async function upsert(
  supabaseUrl: string,
  secretKey: string,
  table: string,
  conflictColumn: string,
  payload: Record<string, unknown>,
): Promise<SupabaseResult> {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(conflictColumn)}`,
      {
        method: "POST",
        headers: supabaseHeaders(secretKey, "resolution=merge-duplicates,return=minimal"),
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );
    return {
      ok: response.ok,
      status: response.status,
      detail: response.ok ? "" : await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "Supabase network request failed",
    };
  }
}

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || "";
  return NextResponse.json({
    route: "online/bootstrap",
    configured: Boolean(supabaseUrl && secretKey),
    supabaseUrlConfigured: Boolean(supabaseUrl),
    secretKeyConfigured: Boolean(secretKey),
    secretKeyType: secretKey.startsWith("sb_secret_") ? "sb_secret" : secretKey ? "legacy_jwt_or_other" : "missing",
  });
}

export async function POST(request: Request) {
  let body: BootstrapBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const memberId = typeof body.member_id === "string" ? body.member_id.trim() : "";
  const memberName = typeof body.member_name === "string" ? body.member_name.trim().slice(0, 80) : "";

  if (!validMemberId(memberId)) {
    return NextResponse.json({ error: "회원 정보가 올바르지 않습니다.", received_member_id: memberId }, { status: 400 });
  }

  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || "";

  if (!rawUrl || !secretKey) {
    return NextResponse.json(
      {
        error: "Supabase 환경변수가 설정되지 않았습니다.",
        configured: false,
        supabaseUrlConfigured: Boolean(rawUrl),
        secretKeyConfigured: Boolean(secretKey),
        member: { member_id: memberId, member_name: memberName },
      },
      { status: 503 },
    );
  }

  const supabaseUrl = normalizeUrl(rawUrl);
  const userResult = await upsert(supabaseUrl, secretKey, "users", "member_id", {
    member_id: memberId,
    member_name: memberName,
    updated_at: new Date().toISOString(),
  });

  if (!userResult.ok) {
    console.error("Supabase users upsert failed", userResult);
    return NextResponse.json(
      {
        error: "회원 데이터 저장에 실패했습니다.",
        stage: "users_upsert",
        supabase_status: userResult.status,
        detail: userResult.detail,
        key_type: secretKey.startsWith("sb_secret_") ? "sb_secret" : "legacy_jwt_or_other",
      },
      { status: 502 },
    );
  }

  const farmResult = await upsert(supabaseUrl, secretKey, "farm", "member_id", {
    member_id: memberId,
  });

  if (!farmResult.ok) {
    console.error("Supabase farm upsert failed", farmResult);
    return NextResponse.json(
      {
        error: "농장 데이터 생성에 실패했습니다.",
        stage: "farm_upsert",
        supabase_status: farmResult.status,
        detail: farmResult.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    member: { member_id: memberId, member_name: memberName },
  });
}
