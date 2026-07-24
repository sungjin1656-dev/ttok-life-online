import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";
import { FlexMemberProvider } from "@/context/FlexMemberContext";

export const metadata: Metadata = {
  title: "TTOK LIFE",
  description: "걷고, 키우고, 실제 상품을 받는 우리 동네 건강 게임",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <FlexMemberProvider>
          <GameProvider>
            <main className="game-shell">{children}</main>
          </GameProvider>
        </FlexMemberProvider>
      </body>
    </html>
  );
}
