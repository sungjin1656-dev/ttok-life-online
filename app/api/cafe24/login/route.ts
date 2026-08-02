import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAFE24_SCOPES = [
  "mall.read_order",
  "mall.read_customer",
  "mall.read_shipping",
] as const;

const OAUTH_STATE_COOKIE =
  "ttok_cafe24_oauth_state";

const OAUTH_VERIFIER_COOKIE =
  "ttok_cafe24_pkce_verifier";

const OAUTH_LIFETIME_SECONDS =
  10 * 60;

type ServerConfig = {
  mallId: string;
  clientId: string;
  redirectUri: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
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

    redirectUri:
      parsedRedirectUri.toString(),

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

function createState(): string {
  return randomBytes(32).toString(
    "base64url",
  );
}

function createCodeVerifier(): string {
  return randomBytes(64).toString(
    "base64url",
  );
}

function createCodeChallenge(
  verifier: string,
): string {
  return createHash("sha256")
    .update(
      verifier,
      "ascii",
    )
    .digest(
      "base64url",
    );
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

function getSupabaseHeaders(
  secretKey: string,
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
      "return=minimal",
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

async function cleanupExpiredStates(
  config: ServerConfig,
): Promise<void> {
  try {
    await fetch(
      `${config.supabaseUrl}/rest/v1/rpc/cleanup_cafe24_oauth_states`,
      {
        method: "POST",

        headers:
          getSupabaseHeaders(
            config.supabaseSecretKey,
          ),

        body: "{}",

        cache: "no-store",
      },
    );
  } catch {
    /*
     * 오래된 state 정리에 실패해도
     * 새 OAuth 인증 시작은 계속합니다.
     */
  }
}

async function saveOAuthState(
  config: ServerConfig,
  state: string,
): Promise<void> {
  const expiresAt =
    new Date(
      Date.now() +
        OAUTH_LIFETIME_SECONDS *
          1000,
    ).toISOString();

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/cafe24_oauth_states`,
    {
      method: "POST",

      headers:
        getSupabaseHeaders(
          config.supabaseSecretKey,
        ),

      body: JSON.stringify({
        state_hash:
          hashState(state),

        mall_id:
          config.mallId,

        redirect_uri:
          config.redirectUri,

        expires_at:
          expiresAt,
      }),

      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail =
      await response.text();

    throw new Error(
      `OAuth state 저장 실패: HTTP ${response.status} ${detail}`,
    );
  }
}

function buildAuthorizationUrl(
  config: ServerConfig,
  state: string,
  codeChallenge: string,
): URL {
  const authorizeUrl =
    new URL(
      `https://${config.mallId}.cafe24api.com/api/v2/oauth/authorize`,
    );

  authorizeUrl.searchParams.set(
    "response_type",
    "code",
  );

  authorizeUrl.searchParams.set(
    "client_id",
    config.clientId,
  );

  authorizeUrl.searchParams.set(
    "redirect_uri",
    config.redirectUri,
  );

  authorizeUrl.searchParams.set(
    "scope",
    CAFE24_SCOPES.join(" "),
  );

  authorizeUrl.searchParams.set(
    "state",
    state,
  );

  authorizeUrl.searchParams.set(
    "code_challenge",
    codeChallenge,
  );

  authorizeUrl.searchParams.set(
    "code_challenge_method",
    "S256",
  );

  return authorizeUrl;
}

export async function GET(
  _request: NextRequest,
) {
  try {
    const config =
      getServerConfig();

    await cleanupExpiredStates(
      config,
    );

    const state =
      createState();

    const codeVerifier =
      createCodeVerifier();

    const codeChallenge =
      createCodeChallenge(
        codeVerifier,
      );

    await saveOAuthState(
      config,
      state,
    );

    const authorizationUrl =
      buildAuthorizationUrl(
        config,
        state,
        codeChallenge,
      );

    const response =
      NextResponse.redirect(
        authorizationUrl,
        {
          status: 302,
        },
      );

    response.cookies.set(
      OAUTH_STATE_COOKIE,
      state,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/cafe24",
        maxAge:
          OAUTH_LIFETIME_SECONDS,
      },
    );

    response.cookies.set(
      OAUTH_VERIFIER_COOKIE,
      codeVerifier,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/api/cafe24",
        maxAge:
          OAUTH_LIFETIME_SECONDS,
      },
    );

    response.headers.set(
      "Cache-Control",
      "no-store, max-age=0",
    );

    response.headers.set(
      "Pragma",
      "no-cache",
    );

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "카페24 OAuth 시작 중 오류가 발생했습니다.";

    console.error(
      "[CAFE24 OAUTH LOGIN ERROR]",
      message,
    );

    return NextResponse.json(
      {
        ok: false,
        code:
          "CAFE24_OAUTH_START_FAILED",
        message:
          "카페24 연결을 시작하지 못했습니다.",
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
