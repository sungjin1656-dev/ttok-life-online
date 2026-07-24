import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) {
    return null;
  }

  return { url, secretKey };
}

function getSupabaseHeaders(secretKey: string) {
  const headers: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
  };

  // 기존 service_role JWT 키일 때만 Authorization을 함께 사용합니다.
  if (!secretKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }

  return headers;
}

function normalizeMemberId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNickname(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// 현재 회원의 닉네임 조회
export async function GET(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Supabase 환경변수가 설정되지 않았습니다.",
      },
      { status: 503 }
    );
  }

  const memberId = normalizeMemberId(
    request.nextUrl.searchParams.get("member_id")
  );

  if (!memberId) {
    return NextResponse.json(
      {
        ok: false,
        message: "member_id가 필요합니다.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/users` +
        `?member_id=eq.${encodeURIComponent(memberId)}` +
        `&select=member_id,member_name,nickname` +
        `&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(config.secretKey),
        cache: "no-store",
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "닉네임 조회에 실패했습니다.",
          detail: text,
        },
        { status: 502 }
      );
    }

    const rows = text ? JSON.parse(text) : [];
    const user = Array.isArray(rows) ? rows[0] : null;

    return NextResponse.json({
      ok: true,
      member_id: memberId,
      member_name: user?.member_name ?? "",
      nickname: user?.nickname ?? null,
      nickname_required: !user?.nickname,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "닉네임 조회 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// 닉네임 최초 저장 또는 변경
export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Supabase 환경변수가 설정되지 않았습니다.",
      },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "요청 데이터가 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const data =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const memberId = normalizeMemberId(data.member_id);
  const nickname = normalizeNickname(data.nickname);

  if (!memberId) {
    return NextResponse.json(
      {
        ok: false,
        message: "member_id가 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (nickname.length < 2 || nickname.length > 12) {
    return NextResponse.json(
      {
        ok: false,
        message: "닉네임은 2자 이상 12자 이하로 입력해주세요.",
      },
      { status: 400 }
    );
  }

  try {
    // 동일 닉네임 사용 여부 확인
    const duplicateResponse = await fetch(
      `${config.url}/rest/v1/users` +
        `?nickname=eq.${encodeURIComponent(nickname)}` +
        `&select=member_id` +
        `&limit=1`,
      {
        method: "GET",
        headers: getSupabaseHeaders(config.secretKey),
        cache: "no-store",
      }
    );

    const duplicateText = await duplicateResponse.text();

    if (!duplicateResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "닉네임 중복 확인에 실패했습니다.",
          detail: duplicateText,
        },
        { status: 502 }
      );
    }

    const duplicateRows = duplicateText ? JSON.parse(duplicateText) : [];
    const duplicateUser = Array.isArray(duplicateRows)
      ? duplicateRows[0]
      : null;

    if (duplicateUser && duplicateUser.member_id !== memberId) {
      return NextResponse.json(
        {
          ok: false,
          code: "NICKNAME_DUPLICATE",
          message: "이미 사용 중인 닉네임입니다.",
        },
        { status: 409 }
      );
    }

    const updateResponse = await fetch(
      `${config.url}/rest/v1/users` +
        `?member_id=eq.${encodeURIComponent(memberId)}`,
      {
        method: "PATCH",
        headers: {
          ...getSupabaseHeaders(config.secretKey),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          nickname,
          updated_at: new Date().toISOString(),
        }),
        cache: "no-store",
      }
    );

    const updateText = await updateResponse.text();

    if (!updateResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "닉네임 저장에 실패했습니다.",
          detail: updateText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      member_id: memberId,
      nickname,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "닉네임 저장 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}