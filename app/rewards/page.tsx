"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import type { RewardItem } from "@/lib/game";
import { BottomNav } from "@/components/ui/BottomNav";

const tabs: Array<RewardItem["status"]> = ["보관 중", "배송 예정", "사용 완료"];

const previewRewards: RewardItem[] = [
  { id: "preview-apple", productName: "사과 1kg", emoji: "🍎", status: "보관 중", harvestedAt: "오늘" },
  { id: "preview-potato", productName: "감자 1kg", emoji: "🥔", status: "보관 중", harvestedAt: "오늘" },
  { id: "preview-tomato", productName: "토마토 1kg", emoji: "🍅", status: "보관 중", harvestedAt: "오늘" },
];


export default function RewardsPage() {
  const router = useRouter();
  const { game } = useGame();
  const [activeTab, setActiveTab] = useState<RewardItem["status"]>("보관 중");

  const rewards = game.rewards.length > 0 ? game.rewards : previewRewards;
  const filteredRewards = useMemo(
    () => rewards.filter((reward) => reward.status === activeTab),
    [activeTab, rewards]
  );

  return (
    <Guard>
      <main className="reward-v11-app">
        <div className="reward-v11-phone">
          <section className="reward-v11-content">
            <header className="reward-v11-header">
              <h1>보상함</h1>
            </header>

            <div className="reward-v11-tabs" role="tablist" aria-label="보상 상태">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <section className="reward-v11-list" aria-live="polite">
              {filteredRewards.length > 0 ? (
                filteredRewards.map((reward) => (
                  <article className="reward-v11-item" key={reward.id}>
                    <div className="reward-v11-product" aria-hidden="true">{reward.emoji}</div>
                    <div className="reward-v11-copy">
                      <strong>{reward.productName}</strong>
                      <p>
                        {reward.status === "보관 중"
                          ? "다음 주문 시 함께 배송됩니다."
                          : reward.status === "배송 예정"
                            ? "주문 상품과 함께 배송 준비 중입니다."
                            : "사용이 완료된 보상 상품입니다."}
                      </p>
                    </div>
                    <b className={`reward-v11-status status-${reward.status.replaceAll(" ", "-")}`}>
                      {reward.status.replace(" ", "")}
                    </b>
                  </article>
                ))
              ) : (
                <div className="reward-v11-empty">
                  <span>{activeTab === "배송 예정" ? "🚚" : activeTab === "사용 완료" ? "✓" : "🧺"}</span>
                  <strong>{activeTab} 상품이 없어요</strong>
                  <p>새로운 보상이 생기면 이곳에서 확인할 수 있어요.</p>
                </div>
              )}
            </section>

            <aside className="reward-v11-notice">
              <strong>다음 상품 1개 이상 주문하면</strong>
              <span>보상 상품과 함께 배송됩니다.</span>
            </aside>
          </section>
          <BottomNav />
        </div>
      </main>
    </Guard>
  );
}
