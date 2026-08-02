"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./exchange.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import {
  exchangeCategories,
  exchangeProducts,
  type ExchangeCategory,
  type ExchangeProduct,
} from "@/lib/exchangeProducts";

export default function ExchangePage() {
  const router = useRouter();
  const { game, patchGame } = useGame();

  const [category, setCategory] = useState<ExchangeCategory>("전체");
  const [selectedProduct, setSelectedProduct] =
    useState<ExchangeProduct | null>(null);
  const [completedProduct, setCompletedProduct] =
    useState<ExchangeProduct | null>(null);

  const points = game.points ?? 0;

  const visibleProducts = useMemo(() => {
    if (category === "전체") {
      return exchangeProducts;
    }

    return exchangeProducts.filter(
      (product) => product.category === category,
    );
  }, [category]);

  const availableCount = exchangeProducts.filter(
    (product) => product.isAvailable && points >= product.pointCost,
  ).length;

  const openProduct = (product: ExchangeProduct) => {
    setSelectedProduct(product);
  };

  const closeProduct = () => {
    setSelectedProduct(null);
  };

  const selectProduct = () => {
    if (!selectedProduct) {
      return;
    }

    if (!selectedProduct.isAvailable || points < selectedProduct.pointCost) {
      return;
    }

    const reward = {
      id: `exchange-${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      emoji: selectedProduct.emoji,
      quantity: selectedProduct.quantity,
      status: "보관 중" as const,
      deliveryAvailable: true,
      harvestedAt: new Date().toLocaleDateString("ko-KR"),
      pointCost: selectedProduct.pointCost,
      source: "exchange" as const,
    };

    patchGame({
      points: points - selectedProduct.pointCost,
      rewards: [...(game.rewards ?? []), reward],
    });

    setCompletedProduct(selectedProduct);
    setSelectedProduct(null);
  };

  return (
    <Guard>
      <main className={styles.root}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/farm")}
              aria-label="농장으로 돌아가기"
            >
              ‹
            </button>

            <div className={styles.heading}>
              <span>수확 포인트로 원하는 상품을 골라보세요</span>
              <h1>상품 선택</h1>
            </div>

            <button
              type="button"
              className={styles.storageButton}
              onClick={() => router.push("/rewards")}
              aria-label="보관함 보기"
            >
              🎁
            </button>
          </header>

          <section className={styles.pointCard}>
            <div className={styles.pointIcon} aria-hidden="true">
              P
            </div>

            <div>
              <span>나의 보유 포인트</span>
              <strong>{points.toLocaleString()}P</strong>
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

          <nav className={styles.categories} aria-label="상품 카테고리">
            {exchangeCategories.map((item) => {
              const active = category === item;

              return (
                <button
                  key={item}
                  type="button"
                  className={active ? styles.activeCategory : undefined}
                  onClick={() => setCategory(item)}
                  aria-pressed={active}
                >
                  {item}
                </button>
              );
            })}
          </nav>

          <section className={styles.productSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>TTOK LIFE SELECT</span>
                <h2>{category === "전체" ? "전체 상품" : category}</h2>
              </div>

              <b>{visibleProducts.length}개</b>
            </div>

            {visibleProducts.length === 0 ? (
              <div className={styles.empty}>
                <span aria-hidden="true">🌱</span>
                <strong>준비 중인 상품이에요</strong>
                <p>새로운 상품이 준비되면 이곳에 표시됩니다.</p>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {visibleProducts.map((product) => {
                  const canSelect =
                    product.isAvailable && points >= product.pointCost;
                  const shortage = Math.max(0, product.pointCost - points);

                  return (
                    <article className={styles.productCard} key={product.id}>
                      <button
                        type="button"
                        className={styles.productVisual}
                        onClick={() => openProduct(product)}
                        aria-label={`${product.name} 상세 보기`}
                      >
                        <span aria-hidden="true">{product.emoji}</span>
                        <small>{product.category}</small>
                      </button>

                      <div className={styles.productInfo}>
                        <span>{product.quantity}</span>
                        <h3>{product.name}</h3>

                        <div className={styles.priceRow}>
                          <strong>{product.pointCost.toLocaleString()}P</strong>
                          {canSelect ? (
                            <small className={styles.readyBadge}>선택 가능</small>
                          ) : (
                            <small className={styles.shortageBadge}>
                              {shortage.toLocaleString()}P 부족
                            </small>
                          )}
                        </div>

                        <button
                          type="button"
                          className={canSelect ? styles.selectButton : styles.lockedButton}
                          onClick={() => openProduct(product)}
                        >
                          {canSelect ? "선택하기" : "포인트 모으기"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.deliveryGuide}>
            <span aria-hidden="true">🚚</span>
            <div>
              <strong>선택한 상품은 보관함에 안전하게 저장돼요</strong>
              <p>다음 상품 1개 이상 주문 시 같은 주소로 함께 배송됩니다.</p>
            </div>
          </section>

          <BottomNav />
        </section>

        {selectedProduct && (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={closeProduct}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exchange-product-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeProduct}
                aria-label="닫기"
              >
                ×
              </button>

              <div className={styles.modalVisual} aria-hidden="true">
                {selectedProduct.emoji}
              </div>

              <span className={styles.modalCategory}>{selectedProduct.category}</span>
              <h2 id="exchange-product-title">{selectedProduct.name}</h2>
              <p className={styles.modalDescription}>
                {selectedProduct.description}
              </p>

              <div className={styles.modalPointRow}>
                <div>
                  <span>필요 포인트</span>
                  <strong>{selectedProduct.pointCost.toLocaleString()}P</strong>
                </div>

                <div>
                  <span>보유 포인트</span>
                  <strong>{points.toLocaleString()}P</strong>
                </div>
              </div>

              <div className={styles.modalDelivery}>
                <span aria-hidden="true">📦</span>
                <div>
                  <strong>{selectedProduct.deliveryNote}</strong>
                  <small>선택 즉시 보관함에 저장됩니다.</small>
                </div>
              </div>

              {points >= selectedProduct.pointCost && selectedProduct.isAvailable ? (
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={selectProduct}
                >
                  {selectedProduct.pointCost.toLocaleString()}P로 선택하기
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.modalDisabled}
                  onClick={() => {
                    closeProduct();
                    router.push("/farm");
                  }}
                >
                  {(selectedProduct.pointCost - points).toLocaleString()}P 더 모으러 가기
                </button>
              )}
            </section>
          </div>
        )}

        {completedProduct && (
          <div className={styles.modalBackdrop} role="presentation">
            <section
              className={`${styles.modal} ${styles.completeModal}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="exchange-complete-title"
            >
              <div className={styles.completeIcon} aria-hidden="true">
                🎉
              </div>

              <span>상품 선택 완료</span>
              <h2 id="exchange-complete-title">{completedProduct.name}</h2>
              <p>
                선택한 상품이 보관함에 저장되었습니다.
                <br />
                다음 주문 시 함께 배송받을 수 있어요.
              </p>

              <button
                type="button"
                className={styles.modalPrimary}
                onClick={() => router.push("/rewards")}
              >
                보관함 보기
              </button>

              <button
                type="button"
                className={styles.modalSecondary}
                onClick={() => setCompletedProduct(null)}
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
