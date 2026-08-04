"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";

const MALL_HOME_URL =
  "https://ttokmall.cafe24.com";

const APP_INSTALL_URL =
  "https://play.google.com/store/apps/details?id=com.ttoklife.app";

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

type AndroidBridge = {
  openNativeWalk?: () => void;
  exitGame?: () => void;
};

function getAndroidBridge():
  AndroidBridge | undefined {
  if (
    typeof window === "undefined"
  ) {
    return undefined;
  }

  return (
    window as typeof window & {
      Android?: AndroidBridge;
    }
  ).Android;
}

export function BottomNav() {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const isActive = (
    href: string,
  ) => {
    if (
      href === "/profile"
    ) {
      return (
        pathname === "/profile" ||
        pathname.startsWith(
          "/rewards",
        ) ||
        pathname.startsWith(
          "/storage",
        ) ||
        pathname.startsWith(
          "/exchange",
        )
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`,
      )
    );
  };

  /**
   * 하단 산책 메뉴 처리
   *
   * Android 앱:
   * 네이티브 GPS 산책 화면을 엽니다.
   *
   * 모바일웹·PC웹:
   * 기존 /walk 페이지로 이동하지 않고
   * 앱 이용 안내만 표시합니다.
   */
  const openWalk = () => {
    const androidBridge =
      getAndroidBridge();

    if (
      typeof androidBridge
        ?.openNativeWalk ===
      "function"
    ) {
      androidBridge
        .openNativeWalk();

      return;
    }

    const installApp =
      window.confirm(
        "산책 기능은 TTOK LIFE 앱에서만 이용할 수 있습니다.\n\n앱 설치 페이지로 이동할까요?",
      );

    if (
      installApp
    ) {
      window.location.href =
        APP_INSTALL_URL;
    }
  };

  const handleNavigation = (
    href: string,
  ) => {
    if (
      href === "/walk"
    ) {
      openWalk();
      return;
    }

    router.push(
      href,
    );
  };

  const exitGame = () => {
    const androidBridge =
      getAndroidBridge();

    /*
     * Android 앱 WebView에서는
     * 네이티브 앱의 쇼핑 화면으로 복귀합니다.
     */
    if (
      typeof androidBridge
        ?.exitGame ===
      "function"
    ) {
      androidBridge
        .exitGame();

      return;
    }

    /*
     * 모바일웹과 PC에서는
     * 카페24 쇼핑몰 홈으로 이동합니다.
     */
    window.location.replace(
      MALL_HOME_URL,
    );
  };

  return (
    <nav
      className="bottom-nav"
      aria-label="하단 메뉴"
    >
      {items.map(
        (item) => {
          const active =
            isActive(
              item.href,
            );

          return (
            <button
              key={item.href}
              type="button"
              className={`nav-item ${
                active
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNavigation(
                  item.href,
                )
              }
              aria-current={
                active
                  ? "page"
                  : undefined
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
        },
      )}

      <button
        type="button"
        className="nav-item exit-nav-item"
        onClick={
          exitGame
        }
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