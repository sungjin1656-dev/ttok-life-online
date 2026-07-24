"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type FlexMember = {
  memberId: string;
  memberName: string;
};

type ConnectionState = "waiting" | "connected" | "guest" | "error";

type BootstrapState = "idle" | "loading" | "ready" | "error";

type FlexMemberContextValue = {
  member: FlexMember | null;
  state: ConnectionState;
  bootstrapState: BootstrapState;
  error: string | null;
  retry: () => void;
};

declare global {
  interface Window {
    __TTOK_ONLINE_STATUS__?: Record<string, unknown>;
  }
}

const FlexMemberContext = createContext<FlexMemberContextValue | null>(null);
const MEMBER_CACHE_KEY = "ttok-life-flex-member-v1";

function normalizeMember(input: unknown): FlexMember | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const rawId = data.member_id ?? data.memberId;
  const rawName = data.member_name ?? data.memberName;
  const memberId = typeof rawId === "string" ? rawId.trim() : "";
  const memberName = typeof rawName === "string" ? rawName.trim() : "";
  if (!memberId || memberId === "0" || memberId.toLowerCase() === "null" || memberId === "undefined") {
    return null;
  }
  return { memberId, memberName };
}

function isAllowedOrigin(origin: string) {
  if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:") return false;
    return hostname === "flexg.shop" || hostname.endsWith(".flexg.shop");
  } catch {
    return false;
  }
}

function memberKey(member: FlexMember) {
  return `${member.memberId}\u0000${member.memberName}`;
}

export function FlexMemberProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<FlexMember | null>(null);
  const [state, setState] = useState<ConnectionState>("waiting");
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>("idle");
  const [error, setError] = useState<string | null>(null);
  const acceptedKeyRef = useRef("");
  const bootstrappedKeyRef = useRef("");
  const bootstrapInFlightRef = useRef("");

  const publishDebug = useCallback((extra: Record<string, unknown>) => {
    window.__TTOK_ONLINE_STATUS__ = {
      ...(window.__TTOK_ONLINE_STATUS__ || {}),
      ...extra,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const acceptMember = useCallback((next: FlexMember | null, source = "unknown") => {
    if (!next) return;
    const key = memberKey(next);
    if (acceptedKeyRef.current === key) return;
    acceptedKeyRef.current = key;
    setMember(next);
    setState("connected");
    setError(null);
    window.sessionStorage.setItem(MEMBER_CACHE_KEY, JSON.stringify(next));
    publishDebug({ member: next, memberSource: source, connectionState: "connected" });
  }, [publishDebug]);

  const requestMember = useCallback(() => {
    setState((current) => (current === "connected" ? current : "waiting"));
    setError(null);
    publishDebug({ memberRequestSent: true });
    if (window.parent !== window) {
      window.parent.postMessage({ type: "TTOK_LIFE_MEMBER_REQUEST", version: 1 }, "*");
    }
  }, [publishDebug]);

  useEffect(() => {
    publishDebug({ providerMounted: true, href: window.location.href, referrer: document.referrer });

    const onMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) {
        publishDebug({ lastRejectedOrigin: event.origin });
        return;
      }
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;
      const data = payload as Record<string, unknown>;
      if (data.type !== "TTOK_LIFE_MEMBER" && data.type !== "TTOK_FLEX_MEMBER") return;
      acceptMember(normalizeMember(data), `postMessage:${event.origin}`);
    };

    window.addEventListener("message", onMessage);

    const params = new URLSearchParams(window.location.search);
    const queryMember = normalizeMember({
      member_id: params.get("member_id"),
      member_name: params.get("member_name"),
    });
    if (queryMember) {
      acceptMember(queryMember, "query");
    } else {
      const cached = window.sessionStorage.getItem(MEMBER_CACHE_KEY);
      if (cached) {
        try {
          acceptMember(normalizeMember(JSON.parse(cached)), "sessionStorage");
        } catch {
          window.sessionStorage.removeItem(MEMBER_CACHE_KEY);
        }
      }
    }

    requestMember();
    const retryTimers = [500, 1500, 3000].map((delay) => window.setTimeout(requestMember, delay));
    const guestTimer = window.setTimeout(() => {
      setState((current) => (current === "waiting" ? "guest" : current));
    }, 5000);

    return () => {
      window.removeEventListener("message", onMessage);
      retryTimers.forEach(window.clearTimeout);
      window.clearTimeout(guestTimer);
    };
  }, [acceptMember, publishDebug, requestMember]);

  useEffect(() => {
    if (!member) return;
    const key = memberKey(member);
    if (bootstrappedKeyRef.current === key || bootstrapInFlightRef.current === key) return;

    bootstrapInFlightRef.current = key;
    setBootstrapState("loading");
    publishDebug({ bootstrapState: "loading", bootstrapMemberId: member.memberId });

    void fetch("/api/online/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: member.memberId, member_name: member.memberName }),
      cache: "no-store",
      keepalive: true,
    })
      .then(async (response) => {
        const text = await response.text();
        let result: Record<string, unknown> = {};
        try {
          result = text ? JSON.parse(text) as Record<string, unknown> : {};
        } catch {
          result = { raw: text };
        }
        publishDebug({ bootstrapHttpStatus: response.status, bootstrapResponse: result });
        if (!response.ok) {
          const detail = typeof result.detail === "string" ? result.detail : "";
          const message = typeof result.error === "string" ? result.error : "온라인 회원 연결에 실패했습니다.";
          throw new Error(detail ? `${message} (${detail})` : message);
        }
        bootstrappedKeyRef.current = key;
        setBootstrapState("ready");
        setError(null);
        publishDebug({ bootstrapState: "ready" });
      })
      .catch((reason: unknown) => {
        setBootstrapState("error");
        const message = reason instanceof Error ? reason.message : "온라인 회원 연결에 실패했습니다.";
        setError(message);
        publishDebug({ bootstrapState: "error", bootstrapError: message });
      })
      .finally(() => {
        if (bootstrapInFlightRef.current === key) bootstrapInFlightRef.current = "";
      });
  }, [member, publishDebug]);

  const value = useMemo<FlexMemberContextValue>(() => ({
    member,
    state,
    bootstrapState,
    error,
    retry: requestMember,
  }), [member, state, bootstrapState, error, requestMember]);

  return <FlexMemberContext.Provider value={value}>{children}</FlexMemberContext.Provider>;
}

export function useFlexMember() {
  const value = useContext(FlexMemberContext);
  if (!value) throw new Error("useFlexMember must be used inside FlexMemberProvider");
  return value;
}
