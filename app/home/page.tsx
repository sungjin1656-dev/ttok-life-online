"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Guard } from "@/components/ui/Guard";
import {
  TTAppShell,
  TTBottomNav,
} from "@/components/ttok";

import { useGame } from "@/context/GameContext";

const DAILY_GOAL = 10_000;
const WALK_MISSION_GOAL = 5_000;

/*
 * Google Play 정식 출시 주소가 확정되면 아래 값만 교체합니다.
 *
 * 예:
 * const ANDROID_APP_STORE_URL =
 *   "https://play.google.com/store/apps/details?id=com.ttoklife.app";
 */
const ANDROID_APP_STORE_URL = "";

function assetForCharacter(
  characterId: string,
  kind: "profile" | "running",
) {
  const isBoy =
    characterId === "hajun" ||
    characterId === "minjun";

  if (kind === "profile") {
    return isBoy
      ? "/assets/characters/boy-profile-clean.png"
      : "/assets/characters/girl-profile-clean.png";
  }

  return isBoy
    ? "/assets/characters/boy-running-clean.png"
    : "/assets/characters/girl-running-clean.png";
}

function getTodayKey() {
  return new Date().toLocaleDateString("ko-KR");
}

export default function HomePage() {
  const router = useRouter();
  const { game } = useGame();

  const [
    showAppInstallGuide,
    setShowAppInstallGuide,
  ] = useState(false);

  const stepPercent = Math.min(
    100,
    Math.round(
      (game.todaySteps / DAILY_GOAL) * 100,
    ),
  );

  const remainingSteps = Math.max(
    0,
    DAILY_GOAL - game.todaySteps,
  );

  // GameContext 실제 지급 기준: 100걸음당 물방울 1개
  const earnedWater = Math.floor(
    game.todaySteps / 100,
  );

  const walkMissionDone =
    game.todaySteps >= WALK_MISSION_GOAL;

  const waterMissionDone =
    game.cropWaterings >= 1;

  const attendanceMissionDone =
    game.lastAttendanceDate === getTodayKey();

  const missionDoneCount = [
    walkMissionDone,
    waterMissionDone,
    attendanceMissionDone,
  ].filter(Boolean).length;

  const storedRewardCount =
    game.rewards.filter(
      (reward) => reward.status === "보관 중",
    ).length;

  const inviteRewardTotal =
    game.inviteHistory.reduce(
      (sum, history) =>
        sum + history.reward,
      0,
    );

  const openWalk = () => {
    /*
     * Android 앱 WebView 안에서는
     * 네이티브 GPS 산책 화면을 엽니다.
     */
    const androidBridge =
      (
        window as typeof window & {
          Android?: {
            openNativeWalk?: () => void;
          };
        }
      ).Android;

    if (
      androidBridge &&
      typeof androidBridge.openNativeWalk ===
        "function"
    ) {
      androidBridge.openNativeWalk();
      return;
    }

    /*
     * 모바일웹과 PC웹에서는 산책 기능을 실행하지 않고
     * 앱 설치 안내만 표시합니다.
     */
    setShowAppInstallGuide(true);
  };

  const openAppStore = () => {
    if (!ANDROID_APP_STORE_URL) {
      window.alert(
        "TTOK LIFE 앱은 현재 출시 준비 중입니다.\n정식 출시 후 설치할 수 있어요.",
      );
      return;
    }

    window.location.href =
      ANDROID_APP_STORE_URL;
  };

  const shareInvite = async () => {
    const inviteUrl =
      `${window.location.origin}/invite?code=` +
      encodeURIComponent(game.inviteCode);

    const shareData = {
      title: "TTOK LIFE에서 함께 걸어요!",
      text:
        "친구가 초대 링크로 가입하면 물방울 500개가 지급돼요.",
      url: inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        const shareError = error as Error;

        if (shareError.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(
        inviteUrl,
      );

      window.alert(
        "초대 링크를 복사했어요.\n카카오톡 친구에게 보내주세요.",
      );
    } catch {
      window.prompt(
        "아래 초대 링크를 복사해주세요.",
        inviteUrl,
      );
    }
  };

  return (
    <Guard>
      <TTAppShell>
        <main className="home-v2">

          {/* 상단 프로필 */}

          <header className="home-v2-header">
            <button
              type="button"
              className="home-v2-profile-button"
              onClick={() =>
                router.push("/profile")
              }
              aria-label="프로필로 이동"
            >
              <Image
                src={assetForCharacter(
                  game.characterId,
                  "profile",
                )}
                alt="선택한 캐릭터"
                fill
                sizes="58px"
                priority
              />
            </button>

            <div className="home-v2-user">
              <span>
                오늘도 건강하게 걸어볼까요?
              </span>

              <strong>
                {game.nickname}님
              </strong>

              <small>
                {game.region} · 이번 주{" "}
                {game.weeklySteps.toLocaleString()}
                걸음
              </small>
            </div>

            <div className="home-v2-water-wallet">
              <span>보유 물방울</span>

              <strong>
                <Image
                  src="/assets/icons/droplet.png"
                  alt=""
                  width={22}
                  height={22}
                />

                {game.water.toLocaleString()}
              </strong>
            </div>
          </header>


          {/* 게임형 메인 산책 장면 */}

          <section className="home-v2-walk-world">
            <div className="home-v2-walk-shade" />

            <div className="home-v2-walk-copy">
              <span className="home-v2-scene-label">
                오늘의 걸음
              </span>

              <div className="home-v2-step-number">
                <strong>
                  {game.todaySteps.toLocaleString()}
                </strong>

                <span>걸음</span>
              </div>

              <div className="home-v2-step-track">
                <i
                  style={{
                    width: `${stepPercent}%`,
                  }}
                />
              </div>

              <div className="home-v2-goal-row">
                <span>
                  목표{" "}
                  {DAILY_GOAL.toLocaleString()}
                  걸음
                </span>

                <strong>
                  {stepPercent}%
                </strong>
              </div>

              <div className="home-v2-character-message">
                {remainingSteps > 0
                  ? `목표까지 ${remainingSteps.toLocaleString()}걸음 남았어요!`
                  : "오늘 목표를 달성했어요!"}
              </div>

              <button
                type="button"
                className="home-v2-walk-start"
                onClick={openWalk}
              >
                <span aria-hidden="true">
                  👟
                </span>

                산책 시작하기
              </button>
            </div>

            <div className="home-v2-runner">
              <Image
                src={assetForCharacter(
                  game.characterId,
                  "running",
                )}
                alt="달리는 캐릭터"
                fill
                sizes="210px"
                priority
              />
            </div>
          </section>


          {/* 건강 기록 */}

          <section className="home-v2-stat-grid">
            <article className="home-v2-stat-card calorie">
              <span className="home-v2-stat-icon">
                🔥
              </span>

              <small>
                오늘 칼로리
              </small>

              <strong>
                {game.calories.toLocaleString()}
                <em> kcal</em>
              </strong>
            </article>

            <article className="home-v2-stat-card total">
              <span className="home-v2-stat-icon">
                ✨
              </span>

              <small>
                누적 건강 기록
              </small>

              <strong>
                {game.weeklySteps.toLocaleString()}
                <em> 걸음</em>
              </strong>
            </article>

            <article className="home-v2-stat-card water">
              <Image
                src="/assets/icons/droplet.png"
                alt=""
                width={29}
                height={29}
              />

              <small>
                오늘 획득
              </small>

              <strong>
                {earnedWater.toLocaleString()}
                <em> 개</em>
              </strong>
            </article>
          </section>


          {/* 농장 월드 카드 */}

          <button
            type="button"
            className="home-v2-world-card home-v2-farm-world"
            onClick={() =>
              router.push("/farm")
            }
          >
            <div className="home-v2-world-overlay" />

            <div className="home-v2-world-copy">
              <span>
                나의 행운의 화분
              </span>

              <strong>
                성장률 {game.cropGrowth}%
              </strong>

              <div className="home-v2-farm-progress">
                <i
                  style={{
                    width: `${Math.min(
                      100,
                      game.cropGrowth,
                    )}%`,
                  }}
                />
              </div>

              <small>
                화분을 키우고 원하는 보상을
                선택해보세요.
              </small>

              <b>
                농장으로 가기
                <em>›</em>
              </b>
            </div>
          </button>


          {/* 보상함 / 걷기왕 */}

          <section className="home-v2-world-grid">
            <button
              type="button"
              className="home-v2-mini-world home-v2-reward-world"
              onClick={() =>
                router.push("/rewards")
              }
            >
              <div className="home-v2-mini-shade" />

              <div className="home-v2-mini-copy">
                <span>
                  내 보상함
                </span>

                <strong>
                  보관 중 {storedRewardCount}개
                </strong>

                <small>
                  보상 확인하기 ›
                </small>
              </div>
            </button>

            <button
              type="button"
              className="home-v2-mini-world home-v2-ranking-world"
              onClick={() =>
                router.push("/ranking")
              }
            >
              <div className="home-v2-mini-shade" />

              <div className="home-v2-mini-copy">
                <span>
                  우리동네 걷기왕
                </span>

                <strong>
                  주간{" "}
                  {game.weeklySteps.toLocaleString()}
                  걸음
                </strong>

                <small>
                  순위 확인하기 ›
                </small>
              </div>
            </button>
          </section>


          {/* 오늘의 미션 */}

          <section className="home-v2-missions">
            <header>
              <div>
                <span>
                  오늘의 미션
                </span>

                <strong>
                  매일 건강 습관을 완성해보세요
                </strong>
              </div>

              <b>
                {missionDoneCount}/3
              </b>
            </header>

            <button
              type="button"
              onClick={() =>
                router.push("/walk")
              }
            >
              <i
                className={
                  walkMissionDone
                    ? "done"
                    : ""
                }
              >
                {walkMissionDone
                  ? "✓"
                  : "1"}
              </i>

              <div>
                <span>
                  5,000걸음 걷기
                </span>

                <small>
                  산책으로 오늘의 목표를
                  채워보세요.
                </small>
              </div>

              <strong>
                {walkMissionDone
                  ? "완료"
                  : `${Math.min(
                      game.todaySteps,
                      WALK_MISSION_GOAL,
                    ).toLocaleString()} / 5,000`}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/farm")
              }
            >
              <i
                className={
                  waterMissionDone
                    ? "done"
                    : ""
                }
              >
                {waterMissionDone
                  ? "✓"
                  : "2"}
              </i>

              <div>
                <span>
                  화분에 물주기
                </span>

                <small>
                  행운의 화분을 돌봐주세요.
                </small>
              </div>

              <strong>
                {waterMissionDone
                  ? "완료"
                  : "0 / 1"}
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/attendance")
              }
            >
              <i
                className={
                  attendanceMissionDone
                    ? "done"
                    : ""
                }
              >
                {attendanceMissionDone
                  ? "✓"
                  : "3"}
              </i>

              <div>
                <span>
                  오늘 출석하기
                </span>

                <small>
                  매일 접속하고 보상을
                  받아보세요.
                </small>
              </div>

              <strong>
                {attendanceMissionDone
                  ? "완료"
                  : "출석하기"}
              </strong>
            </button>
          </section>


          {/* 친구 초대 게임 배너 */}

          <section className="home-v2-invite">
            <div className="home-v2-invite-shade" />

            <div className="home-v2-invite-copy">
              <span>
                친구와 함께 걸어요!
              </span>

              <strong>
                가입 완료 시
                <br />
                물방울 500개 지급
              </strong>

              <p>
                카카오톡으로 친구에게
                초대 링크를 보내보세요.
              </p>

              <div className="home-v2-invite-summary">
                <span>
                  초대한 친구{" "}
                  <b>
                    {game.invitedCount}명
                  </b>
                </span>

                <span>
                  받은 보상{" "}
                  <b>
                    💧{" "}
                    {inviteRewardTotal.toLocaleString()}
                  </b>
                </span>
              </div>

              <button
                type="button"
                onClick={shareInvite}
              >
                카카오톡 친구 초대하기
              </button>
            </div>
          </section>

        </main>

        {showAppInstallGuide && (
          <div
            className="ttok-app-install-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ttok-app-install-title"
            onClick={() =>
              setShowAppInstallGuide(false)
            }
          >
            <div
              className="ttok-app-install-card"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <span
                className="ttok-app-install-icon"
                aria-hidden="true"
              >
                📍
              </span>

              <strong
                id="ttok-app-install-title"
              >
                산책은 앱에서만 이용할 수 있어요
              </strong>

              <p>
                공정한 GPS 기록과 실외 산책
                인증을 위해 TTOK LIFE 앱에서만
                산책을 시작할 수 있습니다.
              </p>

              <button
                type="button"
                className="ttok-app-install-primary"
                onClick={openAppStore}
              >
                앱 설치하기
              </button>

              <button
                type="button"
                className="ttok-app-install-secondary"
                onClick={() =>
                  setShowAppInstallGuide(false)
                }
              >
                나중에
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          .ttok-app-install-modal {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(15, 23, 42, 0.56);
          }

          .ttok-app-install-card {
            width: min(100%, 380px);
            padding: 28px 22px 22px;
            border-radius: 24px;
            background: #ffffff;
            text-align: center;
            box-shadow:
              0 20px 50px
              rgba(15, 23, 42, 0.22);
          }

          .ttok-app-install-icon {
            display: block;
            margin-bottom: 12px;
            font-size: 42px;
          }

          .ttok-app-install-card strong {
            display: block;
            color: #172033;
            font-size: 21px;
            line-height: 1.4;
          }

          .ttok-app-install-card p {
            margin: 12px 0 22px;
            color: #64748b;
            font-size: 15px;
            line-height: 1.65;
            word-break: keep-all;
          }

          .ttok-app-install-primary,
          .ttok-app-install-secondary {
            width: 100%;
            min-height: 48px;
            border: 0;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
          }

          .ttok-app-install-primary {
            color: #ffffff;
            background: #2878ff;
          }

          .ttok-app-install-secondary {
            margin-top: 8px;
            color: #64748b;
            background: #f1f5f9;
          }
        `}</style>

        <TTBottomNav />
      </TTAppShell>
    </Guard>
  );
}