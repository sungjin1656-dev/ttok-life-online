"use client";

import { usePathname } from "next/navigation";

const MALL_URL = "https://ttoktok.kr";

export default function ExitGameButton() {
  const pathname = usePathname();

  // 시작·테스트 화면에서만 숨김
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

    // Android 앱 WebView
    if (typeof currentWindow.Android?.exitGame === "function") {
      currentWindow.Android.exitGame();
      return;
    }

    // 일반 모바일·PC 브라우저
    window.location.href = MALL_URL;
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