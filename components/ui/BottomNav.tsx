"use client";

import { usePathname, useRouter } from "next/navigation";

const FALLBACK_MALL_URL = "https://ttokmall.cafe24.co.kr";

const items = [
  {
    href: "/home",
    icon: "🏠",
    label: "홈",
  },
  {
    href: "/farm",
    icon: "🌱",
    label: "농장",
  },
  {
    href: "/walk",
    icon: "👟",
    label: "산책",
  },
  {
    href: "/ranking",
    icon: "🏆",
    label: "랭킹",
  },
  {
    href: "/profile",
    icon: "👤",
    label: "마이",
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/profile") {
      return (
        pathname === "/profile" ||
        pathname.startsWith("/rewards") ||
        pathname.startsWith("/storage") ||
        pathname.startsWith("/exchange")
      );
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const exitGame = () => {
    const currentWindow = window as typeof window & {
      Android?: {
        exitGame?: () => void;
      };
    };

    // Android 앱 WebView에서 실행 중인 경우
    if (typeof currentWindow.Android?.exitGame === "function") {
      currentWindow.Android.exitGame();
      return;
    }

    // 일반 모바일웹·PC에서 쇼핑몰을 통해 들어온 경우
    const referrer = document.referrer;

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const currentUrl = new URL(window.location.href);

        if (referrerUrl.origin !== currentUrl.origin) {
          window.location.href = referrer;
          return;
        }
      } catch {
        // referrer 주소를 해석하지 못하면 history 방식으로 진행
      }
    }

    // 이전 페이지가 있는 경우
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // 직접 접속한 경우의 최종 이동 주소
    window.location.href = FALLBACK_MALL_URL;
  };

  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.map((item) => {
        const active = isActive(item.href);

        return (
          <button
            key={item.href}
            type="button"
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => router.push(item.href)}
            aria-current={active ? "page" : undefined}
          >
            <span className="icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="label">{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        className="nav-item exit-nav-item"
        onClick={exitGame}
        aria-label="TTOK LIFE 나가기"
      >
        <span className="icon" aria-hidden="true">
          🚪
        </span>

        <span className="label">나가기</span>
      </button>
    </nav>
  );
}