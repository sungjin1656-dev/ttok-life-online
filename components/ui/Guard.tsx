"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";

export function Guard({ children }: { children: React.ReactNode }) {
  const { game, ready } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (ready && !game.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [ready, game.onboardingComplete, router]);

  if (!ready) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#EAF5FF",
        color: "#2F86E6",
        fontFamily: "Arial, sans-serif",
        fontWeight: 900
      }}>
        TTOK LIFE 불러오는 중...
      </main>
    );
  }

  if (!game.onboardingComplete) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#EAF5FF",
        color: "#2F86E6",
        fontFamily: "Arial, sans-serif",
        fontWeight: 900
      }}>
        시작 화면으로 이동 중...
      </main>
    );
  }

  return <>{children}</>;
}
