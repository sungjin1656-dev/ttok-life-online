"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import styles from "./profile.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";

type SimpleGameData = {
  water?: number;
  xp?: number;
  characterId?: string;
  rewards?: unknown[];
};

const PROFILE_CONFIG = {
  pageTitle: "마이페이지",
  memberName: "똑똑이",
  memberGrade: "일반회원",
  deliveryRegion: "강서구",
  monthlyRank: 27,
  point: 12300,
};

const ASSETS = {
  background: "/assets/backgrounds/mypage_bg.png",
  girlProfile: "/assets/characters/girl-profile.png",
  boyProfile: "/assets/characters/boy-profile.png",
  droplet: "/assets/icons/droplet.png",
  reward: "/assets/icons/reward.png",
  ranking: "/assets/icons/ranking.png",
};

export default function ProfilePage() {
  const router = useRouter();
  const { game } = useGame();

  const gameData = game as unknown as SimpleGameData;

  const profileImage = useMemo(() => {
    const id = String(gameData.characterId ?? "").toLowerCase();

    return id.includes("boy") || id.includes("male")
      ? ASSETS.boyProfile
      : ASSETS.girlProfile;
  }, [gameData.characterId]);

  const water = Number(gameData.water ?? 0);
  const xp = Number(gameData.xp ?? 0);
  const rewardCount = Array.isArray(gameData.rewards)
    ? gameData.rewards.length
    : 0;

  const showCafe24Notice = (menuName: string) => {
    window.alert(
      `${menuName}은 카페24 회원 연동 후 연결됩니다.`,
    );
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
              <span>나의 정보와 혜택을 한눈에</span>
              <h1>{PROFILE_CONFIG.pageTitle}</h1>
            </div>

            <button
              type="button"
              className={styles.settingButton}
              onClick={() => showCafe24Notice("설정")}
              aria-label="설정"
            >
              ⚙
            </button>
          </header>

          <section className={styles.hero}>
            <img
              src={ASSETS.background}
              alt=""
              className={styles.heroBackground}
            />

            <div className={styles.heroShade} />

            <article className={styles.profileCard}>
              <div className={styles.profileVisual}>
                <div className={styles.profileHalo} />
                <img
                  src={profileImage}
                  alt="선택한 프로필 캐릭터"
                />
              </div>

              <div className={styles.profileInfo}>
                <div className={styles.nameRow}>
                  <h2>{PROFILE_CONFIG.memberName}</h2>
                  <span>{PROFILE_CONFIG.memberGrade}</span>
                </div>

                <p>📍 {PROFILE_CONFIG.deliveryRegion} 배송 회원</p>

                <div className={styles.levelRow}>
                  <span>LV. 15</span>
                  <div>
                    <i style={{ width: "62%" }} />
                  </div>
                  <strong>{xp.toLocaleString()} XP</strong>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.summaryGrid}>
            <button
              type="button"
              onClick={() => router.push("/farm")}
            >
              <img src={ASSETS.droplet} alt="" />
              <span>보유 물방울</span>
              <strong>{water.toLocaleString()}</strong>
            </button>

            <button
              type="button"
              onClick={() => router.push("/rewards")}
            >
              <img src={ASSETS.reward} alt="" />
              <span>보유 보상</span>
              <strong>{rewardCount}개</strong>
            </button>

            <button
              type="button"
              onClick={() => router.push("/ranking")}
            >
              <img src={ASSETS.ranking} alt="" />
              <span>이번 달 순위</span>
              <strong>{PROFILE_CONFIG.monthlyRank}위</strong>
            </button>
          </section>

          <section className={styles.pointCard}>
            <div>
              <span>사용 가능한 포인트</span>
              <strong>
                {PROFILE_CONFIG.point.toLocaleString()}P
              </strong>
              <p>
                쇼핑몰 연동 후 실제 적립금과 자동으로 연결됩니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => showCafe24Notice("포인트 내역")}
            >
              내역 보기
            </button>
          </section>

          <section className={styles.menuSection}>
            <div className={styles.sectionHeading}>
              <span>MY MENU</span>
              <h2>자주 찾는 메뉴</h2>
            </div>

            <div className={styles.mainMenuGrid}>
              <button
                type="button"
                onClick={() => showCafe24Notice("주문 내역")}
              >
                <span className={styles.menuIcon}>📦</span>
                <strong>주문 내역</strong>
                <small>주문·배송 조회</small>
              </button>

              <button
                type="button"
                onClick={() => router.push("/rewards")}
              >
                <span className={styles.menuIcon}>🎁</span>
                <strong>내 보상함</strong>
                <small>보관·배송 요청</small>
              </button>

              <button
                type="button"
                onClick={() => router.push("/ranking")}
              >
                <span className={styles.menuIcon}>🏆</span>
                <strong>걷기대회</strong>
                <small>내 순위 확인</small>
              </button>

              <button
                type="button"
                onClick={() => showCafe24Notice("배송지 관리")}
              >
                <span className={styles.menuIcon}>📍</span>
                <strong>배송지 관리</strong>
                <small>주소 확인·변경</small>
              </button>
            </div>
          </section>

          <section className={styles.listSection}>
            <button
              type="button"
              onClick={() => showCafe24Notice("회원정보 수정")}
            >
              <span>👤</span>
              <div>
                <strong>회원정보 수정</strong>
                <small>이름, 연락처와 회원정보를 관리해요</small>
              </div>
              <b>›</b>
            </button>

            <button
              type="button"
              onClick={() => showCafe24Notice("쿠폰·적립금")}
            >
              <span>🎟️</span>
              <div>
                <strong>쿠폰·적립금</strong>
                <small>사용 가능한 쇼핑 혜택을 확인해요</small>
              </div>
              <b>›</b>
            </button>

            <button
              type="button"
              onClick={() => window.alert("친구 초대 혜택은 추후 오픈됩니다.")}
            >
              <span>👥</span>
              <div>
                <strong>친구 초대 혜택</strong>
                <small>추천인 리워드 기능은 준비 중이에요</small>
              </div>
              <em>준비 중</em>
            </button>

            <button
              type="button"
              onClick={() => showCafe24Notice("고객센터")}
            >
              <span>💬</span>
              <div>
                <strong>고객센터</strong>
                <small>이용 중 궁금한 점을 문의하세요</small>
              </div>
              <b>›</b>
            </button>

            <button
              type="button"
              onClick={() => showCafe24Notice("알림 설정")}
            >
              <span>🔔</span>
              <div>
                <strong>알림 설정</strong>
                <small>걷기, 보상과 배송 알림을 관리해요</small>
              </div>
              <b>›</b>
            </button>
          </section>

          <section className={styles.noticeCard}>
            <span>💡</span>
            <p>
              주문 내역, 배송지와 회원정보는 카페24 회원 연동 후
              실제 쇼핑몰 정보로 표시됩니다.
            </p>
          </section>
        </section>

        <BottomNav />
      </main>
    </Guard>
  );
}
