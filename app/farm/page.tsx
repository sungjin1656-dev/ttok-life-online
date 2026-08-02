"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./farm.module.css";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import { getCrop, wateringCost } from "@/lib/crops";
import { plants } from "@/lib/plants";

type FarmSound =
  | "water"
  | "grow"
  | "success"
  | "reward";

const SOUND_PATHS: Record<FarmSound, string> = {
  water: "/sounds/water.mp3",
  grow: "/sounds/grow.mp3",
  success: "/sounds/success.mp3",
  reward: "/sounds/reward.mp3",
};

const HARVEST_POINT_REWARD = 500;

function getStage(growth: number) {
  if (growth >= 100) return 10;
  if (growth >= 90) return 9;
  if (growth >= 80) return 8;
  if (growth >= 70) return 7;
  if (growth >= 60) return 6;
  if (growth >= 50) return 5;
  if (growth >= 40) return 4;
  if (growth >= 30) return 3;
  if (growth >= 20) return 2;

  return 1;
}

function stageText(stage: number) {
  const messages = [
    "행운의 화분을 준비했어요",
    "화분에 건강한 흙을 채웠어요",
    "작은 새싹이 올라왔어요",
    "새싹의 잎이 자라고 있어요",
    "초록 잎이 더욱 풍성해졌어요",
    "줄기가 튼튼하게 자라고 있어요",
    "행운의 꽃봉오리가 생겼어요",
    "예쁜 꽃이 피기 시작했어요",
    "행운의 꽃이 반짝이고 있어요",
    "행운의 화분이 완성됐어요!",
  ];

  return messages[stage - 1] ?? messages[0];
}

function getPotImage(stage: number) {
  const safeStage = Math.min(
    10,
    Math.max(1, stage),
  );

  const stageNumber = String(
    safeStage,
  ).padStart(2, "0");

  return `/crops/lucky-pot/stage${stageNumber}.png`;
}

function characterAsset(
  characterId: string,
  isWatering: boolean,
) {
  const isBoy =
    characterId === "hajun" ||
    characterId === "minjun";

  if (isBoy) {
    return isWatering
      ? "/assets/characters/boy-farm-watering.png"
      : "/assets/characters/boy-farm-standing.png";
  }

  return isWatering
    ? "/assets/characters/girl-farm-watering.png"
    : "/assets/characters/girl-farm-standing.png";
}

export default function FarmPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();

  const audioRefs = useRef<
    Partial<Record<FarmSound, HTMLAudioElement>>
  >({});

  const [isWatering, setIsWatering] =
    useState(false);

  const [
    showWaterEffect,
    setShowWaterEffect,
  ] = useState(false);

  const [
    isPlantPopping,
    setIsPlantPopping,
  ] = useState(false);

  const [
    showCompleteEffect,
    setShowCompleteEffect,
  ] = useState(false);

  const [
    showWaterLackMessage,
    setShowWaterLackMessage,
  ] = useState(false);

  const [
    showPointReward,
    setShowPointReward,
  ] = useState(false);

  const currentPlant = plants.find(
    (item) =>
      item.id === game.currentCropId,
  );

  const crop = getCrop(
    game.currentCropId,
  );

  const cost = wateringCost(crop);

  const waterings =
    game.cropWaterings ?? 0;

  const growth = Math.min(
    100,
    Math.round(
      (waterings / crop.growthCount) *
        100,
    ),
  );

  const stage = getStage(growth);

  const ready =
    waterings >= crop.growthCount;

  const isLocked = currentPlant
    ? game.level <
      currentPlant.requiredLevel
    : false;

  const remainingWaterings = Math.max(
    0,
    crop.growthCount - waterings,
  );

  const points = game.points ?? 0;

  const statusMessage = useMemo(() => {
    if (isLocked) {
      return `레벨 ${
        currentPlant?.requiredLevel ?? 1
      }부터 이용할 수 있어요`;
    }

    if (ready) {
      return `행운의 꽃이 완성됐어요! 수확하면 ${HARVEST_POINT_REWARD}P를 받을 수 있어요.`;
    }

    if (isWatering) {
      return "행운의 화분에 물을 주고 있어요!";
    }

    if (game.water < cost) {
      return "물방울을 모으면 다시 물을 줄 수 있어요.";
    }

    return stageText(stage);
  }, [
    currentPlant?.requiredLevel,
    game.water,
    isLocked,
    isWatering,
    ready,
    stage,
    cost,
  ]);

  const playSound = (
    sound: FarmSound,
  ) => {
    try {
      let audio =
        audioRefs.current[sound];

      if (!audio) {
        audio = new Audio(
          SOUND_PATHS[sound],
        );

        audio.preload = "auto";
        audio.volume = 0.75;

        audioRefs.current[sound] =
          audio;
      }

      audio.currentTime = 0;

      void audio.play().catch(() => {
        // 사운드 파일이 없거나
        // 브라우저가 재생을 막아도
        // 게임은 정상 진행합니다.
      });
    } catch {
      // 오디오 미지원 환경에서도
      // 게임은 정상 진행합니다.
    }
  };

  const vibrate = (
    pattern: number | number[],
  ) => {
    if (
      typeof navigator !==
        "undefined" &&
      "vibrate" in navigator
    ) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(
        audioRefs.current,
      ).forEach((audio) => {
        audio?.pause();
      });
    };
  }, []);

  const showLackMessage = () => {
    setShowWaterLackMessage(true);

    vibrate([30, 35, 30]);

    window.setTimeout(() => {
      setShowWaterLackMessage(false);
    }, 2400);
  };

  const waterPlant = () => {
    if (
      ready ||
      isWatering ||
      isLocked
    ) {
      return;
    }

    if (game.water < cost) {
      showLackMessage();
      return;
    }

    playSound("water");
    vibrate(25);

    setIsWatering(true);
    setShowWaterEffect(true);

    const nextWaterings = Math.min(
      crop.growthCount,
      waterings + 1,
    );

    window.setTimeout(() => {
      playSound("grow");
      vibrate([20, 30, 35]);

      setIsPlantPopping(true);

      patchGame({
        water:
          game.water - cost,

        cropWaterings:
          nextWaterings,

        cropGrowth: Math.round(
          (nextWaterings /
            crop.growthCount) *
            100,
        ),

        cropName: crop.name,

        cropEmoji: crop.emoji,
      });

      if (
        nextWaterings >=
        crop.growthCount
      ) {
        window.setTimeout(() => {
          playSound("success");
          vibrate([40, 50, 70]);

          setShowCompleteEffect(true);
        }, 200);

        window.setTimeout(() => {
          setShowCompleteEffect(false);
        }, 2300);
      }

      window.setTimeout(() => {
        setIsPlantPopping(false);
      }, 850);
    }, 1800);

    window.setTimeout(() => {
      setShowWaterEffect(false);
      setIsWatering(false);
    }, 2800);
  };

  const harvestPlant = () => {
    if (!ready) {
      return;
    }

    playSound("reward");
    vibrate([35, 35, 60]);

    patchGame({
      points:
        points +
        HARVEST_POINT_REWARD,

      cropGrowth: 0,

      cropWaterings: 0,

      harvestedCrops: {
        ...(game.harvestedCrops ?? {}),

        [crop.id]:
          (game.harvestedCrops?.[
            crop.id
          ] ?? 0) + 1,
      },
    });

    setShowPointReward(true);

    window.setTimeout(() => {
      router.push("/exchange");
    }, 1300);
  };

  const mainAction = () => {
    if (isLocked) {
      return;
    }

    if (ready) {
      harvestPlant();
      return;
    }

    waterPlant();
  };

  return (
    <Guard>
      <main
        className={`${styles.scope} farm-master-v2`}
      >
        <section className="farm-master-v2-shell">
          {/* 상단 HUD */}

          <header className="farm-master-v2-header">
            <button
              type="button"
              className="farm-master-v2-back"
              onClick={() =>
                router.push("/home")
              }
              aria-label="홈으로 돌아가기"
            >
              ‹
            </button>

            <div className="farm-master-v2-heading">
              <span>나의 작은 정원</span>

              <h1>행운의 화분</h1>
            </div>

            <div className="farm-master-v2-wallet">
              <span aria-hidden="true">
                💧
              </span>

              <strong>
                {game.water.toLocaleString()}
              </strong>
            </div>
          </header>

          {/* 메인 정원 게임 장면 */}

          <section className="farm-master-v2-world">
            <img
              src="/assets/backgrounds/home_farm_bg.png"
              className="farm-master-v2-background"
              alt=""
            />

            <div className="farm-master-v2-sun-glow" />

            <div className="farm-master-v2-stage-badge">
              <span>STAGE</span>

              <strong>
                {String(stage).padStart(
                  2,
                  "0",
                )}
              </strong>
            </div>

            <div
              className={`farm-master-v2-character ${
                isWatering
                  ? "watering"
                  : "standing"
              }`}
            >
              <img
                src={characterAsset(
                  game.characterId,
                  isWatering,
                )}
                alt="농장 캐릭터"
              />
            </div>

            <div
              className={`farm-master-v2-pot ${
                isPlantPopping
                  ? "plant-pop"
                  : ""
              }`}
            >
              <div className="farm-master-v2-pot-glow" />

              <img
                src={getPotImage(stage)}
                alt={`행운의 화분 ${stage}단계`}
              />
            </div>

            {/* 물주기 효과 */}

            {showWaterEffect && (
              <div
                className="farm-master-v2-water-effect"
                aria-hidden="true"
              >
                <span className="drop drop-1">
                  💧
                </span>

                <span className="drop drop-2">
                  💧
                </span>

                <span className="drop drop-3">
                  💧
                </span>

                <span className="drop drop-4">
                  💧
                </span>

                <span className="spark spark-1">
                  ✨
                </span>

                <span className="spark spark-2">
                  ✨
                </span>

                <span className="spark spark-3">
                  ✨
                </span>
              </div>
            )}

            {/* 100% 완료 효과 */}

            {showCompleteEffect && (
              <div
                className="farm-master-v2-complete-effect"
                aria-live="polite"
              >
                <div aria-hidden="true">
                  ✨ 🌸 ✨
                </div>

                <strong>
                  행운의 화분 완성!
                </strong>

                <span>
                  수확하면{" "}
                  {HARVEST_POINT_REWARD}P를
                  받을 수 있어요
                </span>
              </div>
            )}

            {/* 포인트 획득 효과 */}

            {showPointReward && (
              <div
                className={
                  styles.pointRewardOverlay
                }
                role="status"
                aria-live="polite"
              >
                <div
                  className={
                    styles.pointRewardCard
                  }
                >
                  <span aria-hidden="true">
                    🎉
                  </span>

                  <strong>
                    +
                    {HARVEST_POINT_REWARD}
                    P
                  </strong>

                  <p>
                    수확 포인트를
                    받았어요!
                  </p>

                  <small>
                    상품 선택 화면으로
                    이동합니다.
                  </small>
                </div>
              </div>
            )}

            {/* 상태 말풍선 */}

            <div className="farm-master-v2-message">
              <strong>
                {ready
                  ? "행운의 꽃 완성!"
                  : `성장 중 · ${growth}%`}
              </strong>

              <span>
                {statusMessage}
              </span>
            </div>

            {/* 물방울 부족 안내 */}

            {showWaterLackMessage && (
              <div
                className="farm-master-v2-lack"
                role="alert"
              >
                <strong>
                  💧 물방울이 부족해요
                </strong>

                <span>
                  현재{" "}
                  {game.water.toLocaleString()}
                  개 · 필요{" "}
                  {cost.toLocaleString()}
                  개
                </span>

                <small>
                  걷기 또는 쇼핑으로
                  물방울을 모아보세요.
                </small>
              </div>
            )}
          </section>

          {/* 성장 정보 패널 */}

          <section className="farm-master-v2-control">
            <div className="farm-master-v2-control-header">
              <div>
                <span>
                  현재 성장률
                </span>

                <strong>
                  {growth}%
                </strong>
              </div>

              <div>
                <span>
                  남은 물주기
                </span>

                <strong>
                  {remainingWaterings}
                  회
                </strong>
              </div>
            </div>

            <div
              className="farm-master-v2-progress"
              aria-label={`성장률 ${growth}%`}
            >
              <i
                style={{
                  width: `${growth}%`,
                }}
              />

              <b
                style={{
                  left: `calc(${Math.min(
                    96,
                    Math.max(4, growth),
                  )}% - 14px)`,
                }}
              >
                🌸
              </b>
            </div>

            <div className="farm-master-v2-availability">
              <span aria-hidden="true">
                ⏱️
              </span>

              <div>
                <small>
                  다음 물주기
                </small>

                <strong>
                  {ready
                    ? "성장 완료"
                    : isWatering
                      ? "물을 주는 중..."
                      : "지금 물주기 가능"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={`farm-master-v2-action ${
                ready ? "reward" : ""
              }`}
              onClick={mainAction}
              disabled={
                isLocked ||
                (!ready && isWatering)
              }
            >
              {isLocked ? (
                <>
                  🔒 레벨{" "}
                  {currentPlant
                    ?.requiredLevel ?? 1}
                  필요
                </>
              ) : ready ? (
                <>
                  <span aria-hidden="true">
                    🌸
                  </span>

                  수확하고{" "}
                  {HARVEST_POINT_REWARD}
                  P 받기
                </>
              ) : isWatering ? (
                <>
                  <span aria-hidden="true">
                    💧
                  </span>

                  물을 주는 중...
                </>
              ) : (
                <>
                  <span aria-hidden="true">
                    💧
                  </span>

                  물주기

                  <b>
                    {cost.toLocaleString()}
                  </b>
                </>
              )}
            </button>

            {!ready && (
              <p className="farm-master-v2-cost-guide">
                물방울{" "}
                {cost.toLocaleString()}
                개를 사용하면 다음 성장
                단계로 이동합니다.
              </p>
            )}
          </section>

          {/* 상품 선택 바로가기 */}

          <section
            className={
              styles.exchangeCard
            }
          >
            <div
              className={
                styles.exchangeCardTop
              }
            >
              <div
                className={
                  styles.exchangeCardCopy
                }
              >
                <span
                  className={
                    styles.exchangeEyebrow
                  }
                >
                  TTOK POINT
                </span>

                <h2>
                  원하는 상품을
                  선택하세요
                </h2>

                <p>
                  식물을 수확해 모은
                  포인트로 원하는 상품을
                  선택할 수 있어요.
                </p>
              </div>

              <div
                className={
                  styles.exchangePoint
                }
              >
                <span>
                  보유 포인트
                </span>

                <strong>
                  {points.toLocaleString()}
                  P
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={
                styles.exchangeButton
              }
              onClick={() =>
                router.push("/exchange")
              }
            >
              <span aria-hidden="true">
                🛒
              </span>

              상품 선택하러 가기

              <b aria-hidden="true">
                ›
              </b>
            </button>
          </section>

          {/* 성장 단계 */}

          <section className="farm-master-v2-stages">
            <header>
              <div>
                <span>
                  행운의 화분 성장 기록
                </span>

                <strong>
                  10단계까지 정성껏
                  키워보세요
                </strong>
              </div>

              <b>{stage}/10</b>
            </header>

            <div className="farm-master-v2-stage-list">
              {Array.from(
                { length: 10 },
                (_, index) => index + 1,
              ).map((item) => {
                const active =
                  stage >= item;

                const current =
                  stage === item;

                return (
                  <div
                    key={item}
                    className={[
                      active
                        ? "active"
                        : "",
                      current
                        ? "current"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div>
                      <img
                        src={getPotImage(
                          item,
                        )}
                        alt={`${item}단계`}
                      />

                      {active && (
                        <i aria-hidden="true">
                          ✓
                        </i>
                      )}
                    </div>

                    <small>
                      {item * 10}%
                    </small>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 하단 안내 */}

          <section className="farm-master-v2-guide">
            <span aria-hidden="true">
              🌸
            </span>

            <div>
              <strong>
                행운의 꽃을
                완성해보세요
              </strong>

              <p>
                성장률이 100%가 되면
                500P를 받고 원하는
                상품을 선택할 수
                있습니다.
              </p>
            </div>
          </section>

          <BottomNav />
        </section>
      </main>
    </Guard>
  );
}