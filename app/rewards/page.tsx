"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./rewards.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import type { RewardItem } from "@/lib/game";

type RewardTab = "보관 중" | "배송 요청" | "배송 완료";

const tabs: RewardTab[] = ["보관 중", "배송 요청", "배송 완료"];

const ASSETS = {
  world: "/assets/backgrounds/reward_world_bg.png",
  chestClosed: "/assets/rewards/treasure_closed.png",
  chestOpen: "/assets/rewards/treasure_open.png",
  rewardCard: "/assets/rewards/reward_card_bg.png",
  deliveryComplete: "/assets/rewards/delivery_complete_bg.png",
  emptySlot: "/assets/rewards/reward_empty_slot.png",
  glow: "/assets/effects/reward_glow.png",
};

function statusIcon(status: RewardTab) {
  if (status === "배송 요청") return "📦";
  if (status === "배송 완료") return "🚚";
  return "🎁";
}

export default function RewardsPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();

  const [activeTab, setActiveTab] = useState<RewardTab>("보관 중");
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isChestOpen, setIsChestOpen] = useState(false);

  const rewards = game.rewards ?? [];

  const tabCounts = useMemo(() => {
    return tabs.reduce<Record<RewardTab, number>>(
      (result, status) => {
        result[status] = rewards.filter((item) => item.status === status).length;
        return result;
      },
      {
        "보관 중": 0,
        "배송 요청": 0,
        "배송 완료": 0,
      },
    );
  }, [rewards]);

  const visibleRewards = useMemo(() => {
    return rewards.filter((item) => item.status === activeTab);
  }, [activeTab, rewards]);

  const updateReward = (rewardId: string, patch: Partial<RewardItem>) => {
    patchGame({
      rewards: rewards.map((item) =>
        item.id === rewardId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    });
  };

  const openChest = () => {
    if (isChestOpen) return;
    setIsChestOpen(true);

    window.setTimeout(() => {
      setIsChestOpen(false);
    }, 2400);
  };

  const requestDelivery = (reward: RewardItem) => {
    if (!reward.deliveryAvailable) {
      setSelectedRewardId(reward.id);
      setShowGuide(true);
      return;
    }

    updateReward(reward.id, {
      status: "배송 요청",
    });

    setSelectedRewardId(reward.id);

    window.setTimeout(() => {
      setSelectedRewardId(null);
      setActiveTab("배송 요청");
    }, 750);
  };

  const cancelDelivery = (reward: RewardItem) => {
    updateReward(reward.id, {
      status: "보관 중",
    });

    setActiveTab("보관 중");
  };

  const goShopping = () => {
    window.location.href = "/";
  };

  return (
    <Guard>
      <main className={styles.root}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/home")}
              aria-label="홈으로 돌아가기"
            >
              ‹
            </button>

            <div className={styles.heading}>
              <span>농장에서 얻은 특별한 선물</span>
              <h1>내 보상함</h1>
            </div>

            <button
              type="button"
              className={styles.helpButton}
              onClick={() => setShowGuide(true)}
              aria-label="보상함 이용 안내"
            >
              ?
            </button>
          </header>

          <section className={styles.world}>
            <img src={ASSETS.world} alt="" className={styles.worldBackground} />

            <div className={styles.worldShade} />

            <div className={styles.worldTitle}>
              <span>TTOK LIFE REWARD</span>
              <h2>
                행운의 보물창고
              </h2>
              <p>
                상자를 눌러 보상을 확인해보세요.
              </p>
            </div>

            <button
              type="button"
              className={`${styles.chestButton} ${
                isChestOpen ? styles.openedChest : ""
              }`}
              onClick={openChest}
              aria-label={isChestOpen ? "열린 보물상자" : "보물상자 열기"}
            >
              <img
                src={isChestOpen ? ASSETS.chestOpen : ASSETS.chestClosed}
                alt=""
              />

              {isChestOpen && (
                <img
                  src={ASSETS.glow}
                  alt=""
                  className={styles.chestGlow}
                />
              )}
            </button>

            <div className={styles.chestHint}>
              {isChestOpen ? "✨ 보상이 빛나고 있어요!" : "보물상자 열기"}
            </div>

            <div className={styles.summaryRow}>
              <article>
                <span>보관 중</span>
                <strong>{tabCounts["보관 중"]}개</strong>
              </article>

              <article>
                <span>배송 요청</span>
                <strong>{tabCounts["배송 요청"]}개</strong>
              </article>

              <article>
                <span>배송 완료</span>
                <strong>{tabCounts["배송 완료"]}개</strong>
              </article>
            </div>
          </section>

          <nav className={styles.tabs} aria-label="보상 상태">
            {tabs.map((tab) => {
              const active = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  className={active ? styles.activeTab : undefined}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={active}
                >
                  <span>{statusIcon(tab)}</span>
                  <strong>{tab}</strong>
                  <b>{tabCounts[tab]}</b>
                </button>
              );
            })}
          </nav>

          <section className={styles.rewardSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>
                  {statusIcon(activeTab)} {activeTab}
                </span>

                <h2>
                  {activeTab === "보관 중" && "받을 수 있는 보상"}
                  {activeTab === "배송 요청" && "배송을 기다리는 보상"}
                  {activeTab === "배송 완료" && "받은 보상 기록"}
                </h2>
              </div>

              <b>{visibleRewards.length}개</b>
            </div>

            {visibleRewards.length === 0 ? (
              <div className={styles.empty}>
                <img src={ASSETS.emptySlot} alt="" />

                <strong>
                  {activeTab === "보관 중" && "아직 보관 중인 보상이 없어요"}
                  {activeTab === "배송 요청" && "배송 요청한 보상이 없어요"}
                  {activeTab === "배송 완료" && "배송 완료된 보상이 없어요"}
                </strong>

                <p>
                  농장에서 행운의 꽃을 완성하면
                  <br />
                  새로운 보상이 이곳에 저장됩니다.
                </p>

                <button type="button" onClick={() => router.push("/farm")}>
                  🌸 농장으로 가기
                </button>
              </div>
            ) : (
              <div className={styles.rewardGrid}>
                {visibleRewards.map((reward) => {
                  const selected = selectedRewardId === reward.id;
                  const completed = reward.status === "배송 완료";

                  return (
                    <article
                      key={reward.id}
                      className={`${styles.rewardCard} ${
                        selected ? styles.selectedCard : ""
                      }`}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.statusBadge}>
                          {reward.status}
                        </span>
                        <small>{reward.harvestedAt}</small>
                      </div>

                      <div className={styles.rewardVisual}>
                        <img
                          src={
                            completed
                              ? ASSETS.deliveryComplete
                              : ASSETS.rewardCard
                          }
                          alt=""
                          className={styles.cardFrame}
                        />

                        <img
                          src={ASSETS.glow}
                          alt=""
                          className={styles.rewardGlow}
                        />

                        <span className={styles.rewardEmoji} aria-hidden="true">
                          {reward.emoji || "🎁"}
                        </span>
                      </div>

                      <div className={styles.rewardInfo}>
                        <span>농장 수확 보상</span>
                        <h3>{reward.productName}</h3>
                        <strong>{reward.quantity}</strong>
                      </div>

                      {reward.status === "보관 중" && (
                        <>
                          <div
                            className={
                              reward.deliveryAvailable
                                ? styles.available
                                : styles.unavailable
                            }
                          >
                            <span>
                              {reward.deliveryAvailable ? "🚚" : "⏳"}
                            </span>

                            <div>
                              <strong>
                                {reward.deliveryAvailable
                                  ? "함께 배송 가능"
                                  : "현재 배송 준비 중"}
                              </strong>

                              <small>
                                {reward.deliveryAvailable
                                  ? "다음 상품 주문 시 같이 보내드려요"
                                  : reward.unavailableMessage ??
                                    "조금만 기다려주세요"}
                              </small>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={
                              reward.deliveryAvailable
                                ? styles.primaryButton
                                : styles.disabledButton
                            }
                            onClick={() => requestDelivery(reward)}
                          >
                            {reward.deliveryAvailable
                              ? "📦 함께 배송받기"
                              : "배송 가능일 확인"}
                          </button>
                        </>
                      )}

                      {reward.status === "배송 요청" && (
                        <>
                          <div className={styles.deliveryProgress}>
                            <span className={styles.done}>✓</span>
                            <i />
                            <span className={styles.current}>📦</span>
                            <i />
                            <span>🚚</span>
                          </div>

                          <p className={styles.progressText}>
                            주문 상품과 함께 배송을 준비하고 있어요.
                          </p>

                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => cancelDelivery(reward)}
                          >
                            배송 요청 취소
                          </button>
                        </>
                      )}

                      {reward.status === "배송 완료" && (
                        <div className={styles.completedBox}>
                          <span>✅</span>

                          <div>
                            <strong>배송이 완료됐어요</strong>
                            <small>보상을 잘 받으셨나요?</small>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.deliveryGuide}>
            <div aria-hidden="true">🛍️</div>

            <div>
              <span>보상 배송 안내</span>
              <strong>다음 상품 1개 이상 주문 시 함께 배송</strong>
              <p>
                보상 상품만 단독 배송하지 않으며, 동일 회원과 동일 주소
                주문에 함께 보내드립니다.
              </p>
            </div>

            <button type="button" onClick={goShopping}>
              장보러 가기 ›
            </button>
          </section>

          <section className={styles.notice}>
            <span aria-hidden="true">💡</span>
            <p>
              배송 요청 후 실제 주문이 확인되지 않으면 보상은 안전하게 보관
              상태로 유지됩니다.
            </p>
          </section>
        </section>

        {showGuide && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={() => setShowGuide(false)}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reward-guide-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalIcon} aria-hidden="true">
                🎁
              </div>

              <h2 id="reward-guide-title">보상함 이용 방법</h2>

              <ol>
                <li>농장에서 성장률 100%를 달성해요.</li>
                <li>받은 보상은 보관 중 탭에 저장돼요.</li>
                <li>다음 상품을 주문하고 함께 배송을 요청해요.</li>
              </ol>

              <button type="button" onClick={() => setShowGuide(false)}>
                확인했어요
              </button>
            </section>
          </div>
        )}

        <BottomNav />
      </main>
    </Guard>
  );
}
