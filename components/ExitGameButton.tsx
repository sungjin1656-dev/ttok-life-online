"use client";

import { usePathname } from "next/navigation";

const FALLBACK_MALL_URL = "https://ttokmall.cafe24.co.kr";

export default function ExitGameButton() {
  const pathname = usePathname();

  const hiddenRoutes = [
    "/",
    "/onboarding",
    "/step-test",
    "/version",
  ];

  const shouldHide = hiddenRoutes.some(
    (route) =>
      pathname === route ||
      (route !== "/" && pathname.startsWith(`${route}/`))
  );

  if (shouldHide) {
    return null;
  }

  const exitGame = () => {
    const currentWindow = window as typeof window & {
      Android?: {
        exitGame?: () => void;
      };
    };

    // Android 앱 WebView에서 실행된 경우
    if (typeof currentWindow.Android?.exitGame === "function") {
      currentWindow.Android.exitGame();
      return;
    }

    // 일반 모바일웹·PC에서 쇼핑몰을 거쳐 게임으로 들어온 경우
    const referrer = document.referrer;

    if (referrer) {
      try {
        const referrerUrl = new URL(referrer);
        const currentUrl = new URL(window.location.href);

        // 현재 게임 주소가 아닌 외부 페이지에서 들어온 경우
        if (referrerUrl.origin !== currentUrl.origin) {
          window.location.href = referrer;
          return;
        }
      } catch {
        // 잘못된 referrer 값이면 아래 history 처리로 진행
      }
    }

    // 같은 탭에서 이전 페이지 기록이 있는 경우
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    // 게임 주소를 직접 접속한 경우의 최종 이동 주소
    window.location.href = FALLBACK_MALL_URL;
  };

  return (
    <button
      type="button"
      className="exit-game-button"
      onClick={exitGame}
      aria-label="TTOK LIFE 나가기"
    >
      <span aria-hidden="true">×</span>
      <strong>나가기</strong>
    </button>
  );
}