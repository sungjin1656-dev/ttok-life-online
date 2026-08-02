"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import styles from "./exchange.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import { useFlexMember } from "@/context/FlexMemberContext";
import {
  exchangeCategories,
  exchangeProducts,
  type ExchangeCategory,
  type ExchangeProduct,
} from "@/lib/exchangeProducts";

type PointExchangeApiResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  member_id?: string;
  points?: number;
  product?: {
    id?: string;
    name?: string;
    point_cost?: number;
  };
  inventory?: {
    item_code?: string;
    quantity?: number;
  };
  transaction_key?: string;
  detail?: unknown;
};

function createExchangeRequestId(
  productId: string,
): string {
  const randomPart =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return [
    "exchange",
    productId,
    randomPart,
  ].join("-");
}

async function requestPointExchange(
  memberId: string,
  productId: string,
  requestId: string,
): Promise<PointExchangeApiResponse> {
  const response = await fetch(
    "/api/point-exchange",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        member_id:
          memberId,
        product_id:
          productId,
        request_id:
          requestId,
      }),

      cache: "no-store",
    },
  );

  const text =
    await response.text();

  let result: PointExchangeApiResponse = {};

  try {
    result = text
      ? (JSON.parse(
          text,
        ) as PointExchangeApiResponse)
      : {};
  } catch {
    throw new Error(
      `교환 응답이 올바르지 않습니다. HTTP ${response.status}`,
    );
  }

  if (
    !response.ok ||
    !result.ok ||
    typeof result.points !== "number"
  ) {
    throw new Error(
      result.message ||
        "상품 교환 처리에 실패했습니다.",
    );
  }

  return result;
}

export default function ExchangePage() {
  const router = useRouter();
  const { member } = useFlexMember();
  const { game, patchGame } = useGame();

  const [category, setCategory] =
    useState<ExchangeCategory>(
      "전체",
    );

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<ExchangeProduct | null>(
      null,
    );

  const [
    completedProduct,
    setCompletedProduct,
  ] =
    useState<ExchangeProduct | null>(
      null,
    );

  const [
    isExchanging,
    setIsExchanging,
  ] = useState(false);

  const points =
    game.points ?? 0;

  const visibleProducts =
    useMemo(() => {
      if (category === "전체") {
        return exchangeProducts;
      }

      return exchangeProducts.filter(
        (product) =>
          product.category ===
          category,
      );
    }, [category]);

  const availableCount =
    exchangeProducts.filter(
      (product) =>
        product.isAvailable &&
        points >=
          product.pointCost,
    ).length;

  const openProduct = (
    product: ExchangeProduct,
  ) => {
    if (isExchanging) {
      return;
    }

    setSelectedProduct(
      product,
    );
  };

  const closeProduct = () => {
    if (isExchanging) {
      return;
    }

    setSelectedProduct(null);
  };

  const selectProduct =
    async () => {
      if (
        !selectedProduct ||
        isExchanging
      ) {
        return;
      }

      if (
        !selectedProduct.isAvailable ||
        points <
          selectedProduct.pointCost
      ) {
        return;
      }

      const memberId =
        member?.memberId?.trim() ??
        "";

      if (!memberId) {
        window.alert(
          "회원 정보를 확인할 수 없습니다.",
        );
        return;
      }

      const product =
        selectedProduct;

      const requestId =
        createExchangeRequestId(
          product.id,
        );

      setIsExchanging(true);

      try {
        /*
         * 포인트 차감과 Inventory 적립은
         * 서버 DB 트랜잭션 한 번으로 처리합니다.
         */
        const result =
          await requestPointExchange(
            memberId,
            product.id,
            requestId,
          );

        /*
         * 서버가 확정한 최종 포인트만
         * 화면에 반영합니다.
         */
        patchGame({
          points:
            result.points,
        });

        setCompletedProduct(
          product,
        );

        setSelectedProduct(
          null,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "상품 교환 처리에 실패했습니다.";

        window.alert(
          message,
        );
      } finally {
        setIsExchanging(false);
      }
    };

  return (
    <Guard>
      <main className={styles.root}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() =>
                router.push("/farm")
              }
              aria-label="농장으로 돌아가기"
            >
              ‹
            </button>

            <div className={styles.heading}>
              <span>
                수확 포인트로 원하는 상품을 골라보세요
              </span>

              <h1>상품 선택</h1>
            </div>

            <button
              type="button"
              className={styles.storageButton}
              onClick={() =>
                router.push("/rewards")
              }
              aria-label="보관함 보기"
            >
              🎁
            </button>
          </header>

          <section className={styles.pointCard}>
            <div
              className={styles.pointIcon}
              aria-hidden="true"
            >
              P
            </div>

            <div>
              <span>
                나의 보유 포인트
              </span>

              <strong>
                {points.toLocaleString()}
                P
              </strong>
            </div>

            <p>
              {availableCount > 0
                ? `지금 선택 가능한 상품 ${availableCount}개`
                : "식물을 수확하면 포인트가 쌓여요"}
            </p>
          </section>

          <section className={styles.banner}>
            <img
              src="/assets/exchange/banner.png"
              alt="식물을 키우고 포인트를 모아 원하는 상품을 선택하세요"
            />
          </section>

          <nav
            className={styles.categories}
            aria-label="상품 카테고리"
          >
            {exchangeCategories.map(
              (item) => {
                const active =
                  category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    className={
                      active
                        ? styles.activeCategory
                        : undefined
                    }
                    onClick={() =>
                      setCategory(item)
                    }
                    aria-pressed={
                      active
                    }
                  >
                    {item}
                  </button>
                );
              },
            )}
          </nav>

          <section
            className={styles.productSection}
          >
            <div
              className={styles.sectionHeading}
            >
              <div>
                <span>
                  TTOK LIFE SELECT
                </span>

                <h2>
                  {category === "전체"
                    ? "전체 상품"
                    : category}
                </h2>
              </div>

              <b>
                {visibleProducts.length}
                개
              </b>
            </div>

            {visibleProducts.length ===
            0 ? (
              <div className={styles.empty}>
                <span aria-hidden="true">
                  🌱
                </span>

                <strong>
                  준비 중인 상품이에요
                </strong>

                <p>
                  새로운 상품이 준비되면 이곳에 표시됩니다.
                </p>
              </div>
            ) : (
              <div
                className={styles.productGrid}
              >
                {visibleProducts.map(
                  (product) => {
                    const canSelect =
                      product.isAvailable &&
                      points >=
                        product.pointCost;

                    const shortage =
                      Math.max(
                        0,
                        product.pointCost -
                          points,
                      );

                    return (
                      <article
                        className={
                          styles.productCard
                        }
                        key={product.id}
                      >
                        <button
                          type="button"
                          className={
                            styles.productVisual
                          }
                          onClick={() =>
                            openProduct(
                              product,
                            )
                          }
                          aria-label={`${product.name} 상세 보기`}
                        >
                          <span
                            aria-hidden="true"
                          >
                            {product.emoji}
                          </span>

                          <small>
                            {
                              product.category
                            }
                          </small>
                        </button>

                        <div
                          className={
                            styles.productInfo
                          }
                        >
                          <span>
                            {
                              product.quantity
                            }
                          </span>

                          <h3>
                            {product.name}
                          </h3>

                          <div
                            className={
                              styles.priceRow
                            }
                          >
                            <strong>
                              {product.pointCost.toLocaleString()}
                              P
                            </strong>

                            {canSelect ? (
                              <small
                                className={
                                  styles.readyBadge
                                }
                              >
                                선택 가능
                              </small>
                            ) : (
                              <small
                                className={
                                  styles.shortageBadge
                                }
                              >
                                {shortage.toLocaleString()}
                                P 부족
                              </small>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={
                              isExchanging
                            }
                            className={
                              canSelect
                                ? styles.selectButton
                                : styles.lockedButton
                            }
                            onClick={() =>
                              openProduct(
                                product,
                              )
                            }
                          >
                            {canSelect
                              ? "선택하기"
                              : "포인트 모으기"}
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section
            className={styles.deliveryGuide}
          >
            <span aria-hidden="true">
              🚚
            </span>

            <div>
              <strong>
                선택한 상품은 보관함에 안전하게 저장돼요
              </strong>

              <p>
                다음 상품 1개 이상 주문 시 같은 주소로 함께 배송됩니다.
              </p>
            </div>
          </section>

          <BottomNav />
        </section>

        {selectedProduct && (
          <div
            className={
              styles.modalBackdrop
            }
            role="presentation"
            onClick={closeProduct}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exchange-product-title"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className={
                  styles.modalClose
                }
                onClick={closeProduct}
                disabled={
                  isExchanging
                }
                aria-label="닫기"
              >
                ×
              </button>

              <div
                className={
                  styles.modalVisual
                }
                aria-hidden="true"
              >
                {
                  selectedProduct.emoji
                }
              </div>

              <span
                className={
                  styles.modalCategory
                }
              >
                {
                  selectedProduct.category
                }
              </span>

              <h2 id="exchange-product-title">
                {selectedProduct.name}
              </h2>

              <p
                className={
                  styles.modalDescription
                }
              >
                {
                  selectedProduct.description
                }
              </p>

              <div
                className={
                  styles.modalPointRow
                }
              >
                <div>
                  <span>
                    필요 포인트
                  </span>

                  <strong>
                    {selectedProduct.pointCost.toLocaleString()}
                    P
                  </strong>
                </div>

                <div>
                  <span>
                    보유 포인트
                  </span>

                  <strong>
                    {points.toLocaleString()}
                    P
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.modalDelivery
                }
              >
                <span aria-hidden="true">
                  📦
                </span>

                <div>
                  <strong>
                    {
                      selectedProduct.deliveryNote
                    }
                  </strong>

                  <small>
                    선택 즉시 서버 보관함에 저장됩니다.
                  </small>
                </div>
              </div>

              {points >=
                selectedProduct.pointCost &&
              selectedProduct.isAvailable ? (
                <button
                  type="button"
                  className={
                    styles.modalPrimary
                  }
                  onClick={
                    selectProduct
                  }
                  disabled={
                    isExchanging
                  }
                >
                  {isExchanging
                    ? "안전하게 교환 처리 중..."
                    : `${selectedProduct.pointCost.toLocaleString()}P로 선택하기`}
                </button>
              ) : (
                <button
                  type="button"
                  className={
                    styles.modalDisabled
                  }
                  disabled={
                    isExchanging
                  }
                  onClick={() => {
                    closeProduct();
                    router.push(
                      "/farm",
                    );
                  }}
                >
                  {(
                    selectedProduct.pointCost -
                    points
                  ).toLocaleString()}
                  P 더 모으러 가기
                </button>
              )}
            </section>
          </div>
        )}

        {completedProduct && (
          <div
            className={
              styles.modalBackdrop
            }
            role="presentation"
          >
            <section
              className={`${styles.modal} ${styles.completeModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exchange-complete-title"
            >
              <div
                className={
                  styles.completeIcon
                }
                aria-hidden="true"
              >
                🎉
              </div>

              <span>
                상품 선택 완료
              </span>

              <h2 id="exchange-complete-title">
                {
                  completedProduct.name
                }
              </h2>

              <p>
                선택한 상품이 서버 보관함에 저장되었습니다.
                <br />
                다음 주문 시 함께 배송받을 수 있어요.
              </p>

              <button
                type="button"
                className={
                  styles.modalPrimary
                }
                onClick={() =>
                  router.push(
                    "/rewards",
                  )
                }
              >
                보관함 보기
              </button>

              <button
                type="button"
                className={
                  styles.modalSecondary
                }
                onClick={() =>
                  setCompletedProduct(
                    null,
                  )
                }
              >
                계속 둘러보기
              </button>
            </section>
          </div>
        )}
      </main>
    </Guard>
  );
}
