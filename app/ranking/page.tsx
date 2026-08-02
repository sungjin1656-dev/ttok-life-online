"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import styles from "./ranking.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";

type Prize = {
  rank: 1 | 2 | 3;
  name: string;
  image: string;
};

type RankingItem = {
  rank: number;
  nickname: string;
  steps: number;
};

const competitionConfig = {
  title: "TTOK TTOK 걷기대회",

  // 매달 여기만 수정하세요.
  year: 2026,
  month: 8,

  // 회원 배송지 연동 전까지 여기서 수정하세요.
  regionName: "강서구",
  startDate: "8월 1일",
  endDate: "8월 31일",
  participationText:
    "똑똑몰 1회 주문 시 배송지 주소를 기준으로 자동 참여됩니다.",
  rankingTitle: "이번 달 TOP 100",
  isParticipating: true,
  myRank: 27,
  mySteps: 186420,
  gapToNextRank: 3280,
};

const assets = {
  background: "/assets/backgrounds/ranking_world_bg.png",
  podium: "/assets/ranking/ranking_podium.png",
  glow: "/assets/effects/ranking_glow.png",
};

const prizes: Prize[] = [
  { rank: 1, name: "1등 상품", image: "/assets/ranking/prize-1.png" },
  { rank: 2, name: "2등 상품", image: "/assets/ranking/prize-2.png" },
  { rank: 3, name: "3등 상품", image: "/assets/ranking/prize-3.png" },
];

const rankingData: RankingItem[] = [
  { rank: 1, nickname: "건강짱짱", steps: 528420 },
  { rank: 2, nickname: "에코걸", steps: 487350 },
  { rank: 3, nickname: "마라톤맨", steps: 452180 },
  { rank: 4, nickname: "행복한하루", steps: 431250 },
  { rank: 5, nickname: "걸어봄", steps: 419860 },
  { rank: 6, nickname: "명지산책왕", steps: 398740 },
  { rank: 7, nickname: "오늘도만보", steps: 382610 },
  { rank: 8, nickname: "튼튼아빠", steps: 371920 },
  { rank: 9, nickname: "걷는엄마", steps: 359480 },
  { rank: 10, nickname: "하루한걸음", steps: 344210 },
];

function rankMedal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default function RankingPage() {
  const router = useRouter();
  const sortedPrizes = useMemo(
    () => [...prizes].sort((a, b) => a.rank - b.rank),
    [],
  );

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
              <span>우리 동네 월간 걷기 축제</span>
              <h1>{competitionConfig.title}</h1>
            </div>

            <div className={styles.monthBadge}>
              {competitionConfig.year}년 {competitionConfig.month}월
            </div>
          </header>

          <section className={styles.hero}>
            <img
              src={assets.background}
              alt=""
              className={styles.heroBackground}
            />
            <div className={styles.heroShade} />

            <div className={styles.heroCopy}>
              <span>MONTHLY WALKING FESTIVAL</span>
              <h2>{competitionConfig.title}</h2>
              <strong>
                {competitionConfig.year}년 {competitionConfig.month}월 월간 걷기대회
              </strong>

              <b className={styles.regionLine}>
                📍 {competitionConfig.regionName} 대회
              </b>
              <p>
                {competitionConfig.startDate} ~ {competitionConfig.endDate}
              </p>
            </div>

            <article className={styles.participationCard}>
              <div className={styles.participationIcon}>🛒</div>
              <div>
                <span>참여방법</span>
                <strong>{competitionConfig.participationText}</strong>
              </div>
              <b>
                {competitionConfig.isParticipating ? "참여 완료" : "참여 대기"}
              </b>
            </article>
          </section>

          <section className={styles.prizeSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>MONTHLY PRIZE</span>
                <h2>이번 달 우승 상품</h2>
              </div>
              <b>{competitionConfig.regionName}</b>
            </div>

            <div className={styles.podiumStage}>
              <img src={assets.glow} alt="" className={styles.podiumGlow} />
              <img
                src={assets.podium}
                alt="1등, 2등, 3등 시상대"
                className={styles.podiumImage}
              />

              {sortedPrizes.map((prize) => (
                <article
                  key={prize.rank}
                  className={`${styles.prizeItem} ${styles[`rank${prize.rank}`]}`}
                >
                  <img
                    src={prize.image}
                    alt={prize.name}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span>{prize.rank}등</span>
                  <strong>{prize.name}</strong>
                </article>
              ))}
            </div>

            <p className={styles.prizeNotice}>
              우승 상품은 매월 변경되며, 실제 지급 상품은 대회 종료 시점의
              안내를 기준으로 합니다.
            </p>
          </section>

          <section className={styles.rankingSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>LIVE RANKING</span>
                <h2>{competitionConfig.rankingTitle}</h2>
              </div>
              <b>{competitionConfig.regionName}</b>
            </div>

            <div className={styles.rankingHeader}>
              <span>순위</span>
              <span>닉네임</span>
              <span>누적 걸음</span>
            </div>

            <div className={styles.rankingList}>
              {rankingData.map((item) => (
                <article
                  key={item.rank}
                  className={item.rank <= 3 ? styles.topRankRow : styles.rankRow}
                >
                  <strong>{rankMedal(item.rank)}</strong>
                  <span>{item.nickname}</span>
                  <b>{item.steps.toLocaleString()}걸음</b>
                </article>
              ))}
            </div>

            <button type="button" className={styles.moreButton}>
              TOP 100 전체 보기
            </button>
          </section>

          <section className={styles.myRankCard}>
            <div className={styles.myRankIcon}>🏃</div>

            <div className={styles.myRankMain}>
              <span>내 순위</span>
              <strong>{competitionConfig.myRank}위</strong>
              <small>이번 달 현재 순위</small>
            </div>

            <div className={styles.myRankStat}>
              <span>이번 달 누적 걸음</span>
              <strong>{competitionConfig.mySteps.toLocaleString()}</strong>
              <small>걸음</small>
            </div>

            <div className={styles.myRankStat}>
              <span>앞 순위까지</span>
              <strong>{competitionConfig.gapToNextRank.toLocaleString()}</strong>
              <small>걸음</small>
            </div>
          </section>

          <section className={styles.guideSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span>COMPETITION GUIDE</span>
                <h2>대회 안내</h2>
              </div>
            </div>

            <div className={styles.guideGrid}>
              <article><span>✓</span><p>똑똑몰 1회 주문 시 자동 참가</p></article>
              <article><span>✓</span><p>배송지 주소 기준 지역 대회 참여</p></article>
              <article><span>✓</span><p>매월 1일부터 말일까지 진행</p></article>
              <article><span>✓</span><p>지역별 별도 랭킹 운영</p></article>
              <article><span>✓</span><p>대회 종료 후 우승 상품 지급</p></article>
              <article><span>✓</span><p>신규 지역 오픈 시 해당 지역 대회 자동 참여</p></article>
            </div>
          </section>

          <section className={styles.regionNotice}>
            <span>📍</span>
            <div>
              <strong>
                현재 {competitionConfig.regionName} 대회에 참여 중입니다.
              </strong>
              <p>
                사하구 등 신규 지역 오픈 시 배송지 주소에 따라 해당 지역
                대회로 자동 연결됩니다.
              </p>
            </div>
          </section>
        </section>

        <BottomNav />
      </main>
    </Guard>
  );
}
