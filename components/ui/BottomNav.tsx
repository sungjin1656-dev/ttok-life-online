"use client";

import { usePathname, useRouter } from "next/navigation";

const MALL_HOME_URL = "https://ttokmall.cafe24.com";

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

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  const exitGame = () => {
    const currentWindow = window as typeof window & {
      Android?: {
        exitGame?: () => void;
      };
    };

    /*
     * Android 앱 WebView에서는
     * 네이티브 앱의 쇼핑 화면으로 복귀합니다.
     */
    if (
      typeof currentWindow.Android?.exitGame ===
      "function"
    ) {
      currentWindow.Android.exitGame();
      return;
    }

    /*
     * 일반 모바일웹과 PC에서는
     * 이전 페이지 기록을 사용하지 않고
     * 카페24 쇼핑몰 홈으로 바로 이동합니다.
     */
    window.location.replace(MALL_HOME_URL);
  };

  return (
    <nav
      className="bottom-nav"
      aria-label="하단 메뉴"
    >
      {items.map((item) => {
        const active = isActive(item.href);

        return (
          <button
            key={item.href}
            type="button"
            className={`nav-item ${
              active ? "active" : ""
            }`}
            onClick={() =>
              router.push(item.href)
            }
            aria-current={
              active ? "page" : undefined
            }
          >
            <span
              className="icon"
              aria-hidden="true"
            >
              {item.icon}
            </span>

            <span className="label">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        className="nav-item exit-nav-item"
        onClick={exitGame}
        aria-label="TTOK LIFE 나가기"
      >
        <span
          className="icon"
          aria-hidden="true"
        >
          🚪
        </span>

        <span className="label">
          나가기
        </span>
      </button>
    </nav>
  );
}