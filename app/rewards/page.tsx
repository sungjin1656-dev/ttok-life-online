"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import styles from "./rewards.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useFlexMember } from "@/context/FlexMemberContext";
import {
  formatInventoryQuantity,
  getInventoryItem,
} from "@/lib/inventory";

type RewardTab =
  | "보관 중"
  | "배송 요청"
  | "배송 완료";

type InventoryRow = {
  id: number;
  member_id: string;
  item_code: string;
  quantity: number;
  created_at: string;
};

type InventoryApiResponse = {
  ok?: boolean;
  member_id?: string;
  inventory?: InventoryRow[];
  item_count?: number;
  total_quantity?: number;
  message?: string;
  detail?: string;
};

type InventoryReward = {
  id: string;
  itemCode: string;
  productName: string;
  emoji: string;
  quantity: string;
  status: RewardTab;
  harvestedAt: string;
  deliveryAvailable: boolean;
  unavailableMessage?: string;
};

const tabs: RewardTab[] = [
  "보관 중",
  "배송 요청",
  "배송 완료",
];

const ASSETS = {
  world:
    "/assets/backgrounds/reward_world_bg.png",
  chestClosed:
    "/assets/rewards/treasure_closed.png",
  chestOpen:
    "/assets/rewards/treasure_open.png",
  rewardCard:
    "/assets/rewards/reward_card_bg.png",
  deliveryComplete:
    "/assets/rewards/delivery_complete_bg.png",
  emptySlot:
    "/assets/rewards/reward_empty_slot.png",
  glow:
    "/assets/effects/reward_glow.png",
};

function statusIcon(
  status: RewardTab,
) {
  if (status === "배송 요청") {
    return "📦";
  }

  if (status === "배송 완료") {
    return "🚚";
  }

  return "🎁";
}

function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

async function readInventory(
  memberId: string,
): Promise<InventoryRow[]> {
  const response = await fetch(
    `/api/inventory-state?member_id=${encodeURIComponent(
      memberId,
    )}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const text =
    await response.text();

  let result: InventoryApiResponse = {};

  try {
    result = text
      ? (JSON.parse(
          text,
        ) as InventoryApiResponse)
      : {};
  } catch {
    throw new Error(
      `보관함 응답이 올바르지 않습니다. HTTP ${response.status}`,
    );
  }

  if (
    !response.ok ||
    !result.ok ||
    !Array.isArray(
      result.inventory,
    )
  ) {
    throw new Error(
      result.detail ||
        result.message ||
        "보관함 조회에 실패했습니다.",
    );
  }

  return result.inventory;
}

function toReward(
  row: InventoryRow,
): InventoryReward {
  const item =
    getInventoryItem(
      row.item_code,
    );

  return {
    id: String(row.id),
    itemCode:
      row.item_code,
    productName:
      item.productName,
    emoji:
      item.emoji,
    quantity:
      formatInventoryQuantity(
        row.item_code,
        row.quantity,
      ),
    status:
      "보관 중",
    harvestedAt:
      formatDate(
        row.created_at,
      ),
    deliveryAvailable:
      item.deliveryAvailable,
    unavailableMessage:
      item.unavailableMessage,
  };
}

export default function RewardsPage() {
  const router = useRouter();
  const { member } =
    useFlexMember();

  const [
    activeTab,
    setActiveTab,
  ] = useState<RewardTab>(
    "보관 중",
  );

  const [
    selectedRewardId,
    setSelectedRewardId,
  ] = useState<
    string | null
  >(null);

  const [
    showGuide,
    setShowGuide,
  ] = useState(false);

  const [
    isChestOpen,
    setIsChestOpen,
  ] = useState(false);

  const [
    inventoryRows,
    setInventoryRows,
  ] = useState<
    InventoryRow[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const memberId =
    member?.memberId?.trim() ??
    "";

  const loadInventory =
    useCallback(async () => {
      if (!memberId) {
        setInventoryRows([]);
        setIsLoading(false);
        setLoadError(
          "회원 정보를 확인하고 있어요.",
        );
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const rows =
          await readInventory(
            memberId,
          );

        setInventoryRows(
          rows,
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "보관함 조회에 실패했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [memberId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadInventory();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadInventory]);

  const rewards =
    useMemo(
      () =>
        inventoryRows
          .filter(
            (row) =>
              Number.isFinite(
                row.quantity,
              ) &&
              row.quantity > 0,
          )
          .map(toReward),
      [inventoryRows],
    );

  /*
   * 현재 inventory 테이블에는 배송 상태 컬럼이 없으므로
   * 서버 보관함 항목은 모두 "보관 중"으로 표시합니다.
   * 배송 요청/완료 상태는 추후 delivery_requests 또는
   * inventory.status 컬럼을 추가할 때 서버에 연결합니다.
   */
  const tabCounts =
    useMemo(() => {
      return tabs.reduce<
        Record<
          RewardTab,
          number
        >
      >(
        (
          result,
          status,
        ) => {
          result[status] =
            rewards.filter(
              (item) =>
                item.status ===
                status,
            ).length;

          return result;
        },
        {
          "보관 중": 0,
          "배송 요청": 0,
          "배송 완료": 0,
        },
      );
    }, [rewards]);

  const visibleRewards =
    useMemo(() => {
      return rewards.filter(
        (item) =>
          item.status ===
          activeTab,
      );
    }, [
      activeTab,
      rewards,
    ]);

  const openChest = () => {
    if (isChestOpen) {
      return;
    }

    setIsChestOpen(true);

    window.setTimeout(() => {
      setIsChestOpen(false);
    }, 2400);
  };

  const requestDelivery = (
    reward: InventoryReward,
  ) => {
    setSelectedRewardId(
      reward.id,
    );

    /*
     * 배송 요청 상태를 저장할 DB 컬럼이 아직 없으므로
     * 잘못된 완료 처리를 하지 않고 안내창만 표시합니다.
     */
    setShowGuide(true);
  };

  const cancelDelivery = (
    reward: InventoryReward,
  ) => {
    setSelectedRewardId(
      reward.id,
    );

    window.alert(
      "배송 요청 서버 기능은 다음 단계에서 연결됩니다.",
    );

    setActiveTab(
      "보관 중",
    );
  };

  const goShopping = () => {
    window.location.href =
      "/";
  };

  return (
    <Guard>
      <main
        className={
          styles.root
        }
      >
        <section
          className={
            styles.shell
          }
        >
          <header
            className={
              styles.header
            }
          >
            <button
              type="button"
              className={
                styles.backButton
              }
              onClick={() =>
                router.push(
                  "/home",
                )
              }
              aria-label="홈으로 돌아가기"
            >
              ‹
            </button>

            <div
              className={
                styles.heading
              }
            >
              <span>
                농장에서 얻은
                특별한 선물
              </span>

              <h1>
                내 보상함
              </h1>
            </div>

            <button
              type="button"
              className={
                styles.helpButton
              }
              onClick={() =>
                setShowGuide(
                  true,
                )
              }
              aria-label="보상함 이용 안내"
            >
              ?
            </button>
          </header>

          <section
            className={
              styles.world
            }
          >
            <img
              src={
                ASSETS.world
              }
              alt=""
              className={
                styles.worldBackground
              }
            />

            <div
              className={
                styles.worldShade
              }
            />

            <div
              className={
                styles.worldTitle
              }
            >
              <span>
                TTOK LIFE
                REWARD
              </span>

              <h2>
                행운의 보물창고
              </h2>

              <p>
                상자를 눌러
                보상을
                확인해보세요.
              </p>
            </div>

            <button
              type="button"
              className={`${styles.chestButton} ${
                isChestOpen
                  ? styles.openedChest
                  : ""
              }`}
              onClick={
                openChest
              }
              aria-label={
                isChestOpen
                  ? "열린 보물상자"
                  : "보물상자 열기"
              }
            >
              <img
                src={
                  isChestOpen
                    ? ASSETS.chestOpen
                    : ASSETS.chestClosed
                }
                alt=""
              />

              {isChestOpen && (
                <img
                  src={
                    ASSETS.glow
                  }
                  alt=""
                  className={
                    styles.chestGlow
                  }
                />
              )}
            </button>

            <div
              className={
                styles.chestHint
              }
            >
              {isChestOpen
                ? "✨ 보상이 빛나고 있어요!"
                : "보물상자 열기"}
            </div>

            <div
              className={
                styles.summaryRow
              }
            >
              <article>
                <span>
                  보관 중
                </span>

                <strong>
                  {
                    tabCounts[
                      "보관 중"
                    ]
                  }
                  개
                </strong>
              </article>

              <article>
                <span>
                  배송 요청
                </span>

                <strong>
                  {
                    tabCounts[
                      "배송 요청"
                    ]
                  }
                  개
                </strong>
              </article>

              <article>
                <span>
                  배송 완료
                </span>

                <strong>
                  {
                    tabCounts[
                      "배송 완료"
                    ]
                  }
                  개
                </strong>
              </article>
            </div>
          </section>

          <nav
            className={
              styles.tabs
            }
            aria-label="보상 상태"
          >
            {tabs.map(
              (tab) => {
                const active =
                  activeTab ===
                  tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    className={
                      active
                        ? styles.activeTab
                        : undefined
                    }
                    onClick={() =>
                      setActiveTab(
                        tab,
                      )
                    }
                    aria-pressed={
                      active
                    }
                  >
                    <span>
                      {statusIcon(
                        tab,
                      )}
                    </span>

                    <strong>
                      {tab}
                    </strong>

                    <b>
                      {
                        tabCounts[
                          tab
                        ]
                      }
                    </b>
                  </button>
                );
              },
            )}
          </nav>

          <section
            className={
              styles.rewardSection
            }
          >
            <div
              className={
                styles.sectionHeading
              }
            >
              <div>
                <span>
                  {statusIcon(
                    activeTab,
                  )}{" "}
                  {activeTab}
                </span>

                <h2>
                  {activeTab ===
                    "보관 중" &&
                    "받을 수 있는 보상"}

                  {activeTab ===
                    "배송 요청" &&
                    "배송을 기다리는 보상"}

                  {activeTab ===
                    "배송 완료" &&
                    "받은 보상 기록"}
                </h2>
              </div>

              <b>
                {
                  visibleRewards.length
                }
                개
              </b>
            </div>

            {isLoading ? (
              <div
                className={
                  styles.empty
                }
              >
                <img
                  src={
                    ASSETS.emptySlot
                  }
                  alt=""
                />

                <strong>
                  보상함을
                  불러오고 있어요
                </strong>

                <p>
                  서버에서 안전하게
                  보관된 보상을
                  확인하고 있어요.
                </p>
              </div>
            ) : loadError ? (
              <div
                className={
                  styles.empty
                }
              >
                <img
                  src={
                    ASSETS.emptySlot
                  }
                  alt=""
                />

                <strong>
                  보상함을
                  불러오지 못했어요
                </strong>

                <p>
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadInventory()
                  }
                >
                  다시 불러오기
                </button>
              </div>
            ) : visibleRewards.length ===
              0 ? (
              <div
                className={
                  styles.empty
                }
              >
                <img
                  src={
                    ASSETS.emptySlot
                  }
                  alt=""
                />

                <strong>
                  {activeTab ===
                    "보관 중" &&
                    "아직 보관 중인 보상이 없어요"}

                  {activeTab ===
                    "배송 요청" &&
                    "배송 요청한 보상이 없어요"}

                  {activeTab ===
                    "배송 완료" &&
                    "배송 완료된 보상이 없어요"}
                </strong>

                <p>
                  농장에서 행운의
                  꽃을 완성하면
                  <br />
                  새로운 보상이
                  이곳에 저장됩니다.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/farm",
                    )
                  }
                >
                  🌸 농장으로
                  가기
                </button>
              </div>
            ) : (
              <div
                className={
                  styles.rewardGrid
                }
              >
                {visibleRewards.map(
                  (reward) => {
                    const selected =
                      selectedRewardId ===
                      reward.id;

                    const completed =
                      reward.status ===
                      "배송 완료";

                    return (
                      <article
                        key={
                          reward.id
                        }
                        className={`${styles.rewardCard} ${
                          selected
                            ? styles.selectedCard
                            : ""
                        }`}
                      >
                        <div
                          className={
                            styles.cardTop
                          }
                        >
                          <span
                            className={
                              styles.statusBadge
                            }
                          >
                            {
                              reward.status
                            }
                          </span>

                          <small>
                            {
                              reward.harvestedAt
                            }
                          </small>
                        </div>

                        <div
                          className={
                            styles.rewardVisual
                          }
                        >
                          <img
                            src={
                              completed
                                ? ASSETS.deliveryComplete
                                : ASSETS.rewardCard
                            }
                            alt=""
                            className={
                              styles.cardFrame
                            }
                          />

                          <img
                            src={
                              ASSETS.glow
                            }
                            alt=""
                            className={
                              styles.rewardGlow
                            }
                          />

                          <span
                            className={
                              styles.rewardEmoji
                            }
                            aria-hidden="true"
                          >
                            {reward.emoji ||
                              "🎁"}
                          </span>
                        </div>

                        <div
                          className={
                            styles.rewardInfo
                          }
                        >
                          <span>
                            농장·게임 보상
                          </span>

                          <h3>
                            {
                              reward.productName
                            }
                          </h3>

                          <strong>
                            {
                              reward.quantity
                            }
                          </strong>
                        </div>

                        {reward.status ===
                          "보관 중" && (
                          <>
                            <div
                              className={
                                reward.deliveryAvailable
                                  ? styles.available
                                  : styles.unavailable
                              }
                            >
                              <span>
                                {reward.deliveryAvailable
                                  ? "🚚"
                                  : "⏳"}
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
                              onClick={() =>
                                requestDelivery(
                                  reward,
                                )
                              }
                            >
                              {reward.deliveryAvailable
                                ? "📦 함께 배송받기"
                                : "배송 가능일 확인"}
                            </button>
                          </>
                        )}

                        {reward.status ===
                          "배송 요청" && (
                          <>
                            <div
                              className={
                                styles.deliveryProgress
                              }
                            >
                              <span
                                className={
                                  styles.done
                                }
                              >
                                ✓
                              </span>

                              <i />

                              <span
                                className={
                                  styles.current
                                }
                              >
                                📦
                              </span>

                              <i />

                              <span>
                                🚚
                              </span>
                            </div>

                            <p
                              className={
                                styles.progressText
                              }
                            >
                              주문 상품과
                              함께 배송을
                              준비하고 있어요.
                            </p>

                            <button
                              type="button"
                              className={
                                styles.secondaryButton
                              }
                              onClick={() =>
                                cancelDelivery(
                                  reward,
                                )
                              }
                            >
                              배송 요청 취소
                            </button>
                          </>
                        )}

                        {reward.status ===
                          "배송 완료" && (
                          <div
                            className={
                              styles.completedBox
                            }
                          >
                            <span>
                              ✅
                            </span>

                            <div>
                              <strong>
                                배송이
                                완료됐어요
                              </strong>

                              <small>
                                보상을 잘
                                받으셨나요?
                              </small>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section
            className={
              styles.deliveryGuide
            }
          >
            <div
              aria-hidden="true"
            >
              🛍️
            </div>

            <div>
              <span>
                보상 배송 안내
              </span>

              <strong>
                다음 상품 1개
                이상 주문 시
                함께 배송
              </strong>

              <p>
                보상 상품만 단독
                배송하지 않으며,
                동일 회원과 동일
                주소 주문에 함께
                보내드립니다.
              </p>
            </div>

            <button
              type="button"
              onClick={
                goShopping
              }
            >
              장보러 가기 ›
            </button>
          </section>

          <section
            className={
              styles.notice
            }
          >
            <span
              aria-hidden="true"
            >
              💡
            </span>

            <p>
              현재는 보유 보상의
              서버 동기화가
              적용됐습니다. 배송 요청과
              주문 엑셀 결합은 다음
              단계에서 연결됩니다.
            </p>
          </section>
        </section>

        {showGuide && (
          <div
            className={
              styles.modalBackdrop
            }
            role="presentation"
            onClick={() =>
              setShowGuide(
                false,
              )
            }
          >
            <section
              className={
                styles.modal
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="reward-guide-title"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div
                className={
                  styles.modalIcon
                }
                aria-hidden="true"
              >
                🎁
              </div>

              <h2 id="reward-guide-title">
                보상함 이용 방법
              </h2>

              <ol>
                <li>
                  농장이나 게임에서
                  보상을 획득해요.
                </li>

                <li>
                  보상은 서버
                  보관함에 안전하게
                  저장돼요.
                </li>

                <li>
                  배송 요청과 주문
                  엑셀 결합은 다음
                  단계에서 연결돼요.
                </li>
              </ol>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(
                    false,
                  )
                }
              >
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
