"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";

import styles from "./walk.module.css";

function timeText(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainSeconds
  ).padStart(2, "0")}`;
}

declare global {
  interface Window {
    updateSteps?: (steps: number) => void;
    setStartSteps?: (steps: number) => void;

    Android?: {
      startStepSensor?: () => void;
    };
  }
}

export default function WalkPage() {
  const { game, addSteps } = useGame();

  const [walking, setWalking] = useState(false);
  const [sessionSteps, setSessionSteps] = useState(
    game.todaySteps || 0
  );
  const [seconds, setSeconds] = useState(0);
  const [sensorError, setSensorError] = useState("");

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * Android STEP_COUNTER의 산책 시작 시점 누적 걸음값입니다.
   * 예: 시작 4,191 / 현재 4,250 → 이번 산책 59걸음
   */
  const startSensorSteps = useRef(0);

  /*
   * 산책을 시작할 당시 GameContext의 오늘 걸음수입니다.
   * 일시정지·재시작 과정에서 증가분이 중복 저장되지 않게 합니다.
   */
  const baseTodaySteps = useRef(game.todaySteps || 0);

  useEffect(() => {
    if (!walking) {
      setSessionSteps(game.todaySteps || 0);
      baseTodaySteps.current = game.todaySteps || 0;
    }
  }, [game.todaySteps, walking]);

  /*
   * Android WebView Bridge
   *
   * Android에서 아래처럼 호출합니다.
   * window.setStartSteps(4191)
   * window.updateSteps(4250)
   */
  useEffect(() => {
    window.setStartSteps = (steps: number) => {
      startSensorSteps.current = Number.isFinite(steps)
        ? steps
        : 0;
    };

    window.updateSteps = (currentSteps: number) => {
      if (!walking || !Number.isFinite(currentSteps)) {
        return;
      }

      const walkingSteps = Math.max(
        0,
        currentSteps - startSensorSteps.current
      );

      setSessionSteps(
        baseTodaySteps.current + walkingSteps
      );
    };

    return () => {
      delete window.updateSteps;
      delete window.setStartSteps;
    };
  }, [walking]);

  /*
   * 산책 시간
   */
  useEffect(() => {
    if (!walking) {
      return;
    }

    timerRef.current = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [walking]);

  const calories = Math.round(sessionSteps * 0.07);
  const water = Math.floor(sessionSteps / 10);

  const isFemaleCharacter = useMemo(() => {
    const id = String(game.characterId ?? "")
      .trim()
      .toLowerCase();

    return ["harin", "hani", "girl", "female"].includes(id);
  }, [game.characterId]);

  /*
   * 산책 화면에서는 준비 상태와 산책 중 상태 모두
   * 걷는 캐릭터 PNG를 사용합니다.
   * 산책 시작 후에는 CSS 움직임 효과만 활성화됩니다.
   */
  const characterSrc = isFemaleCharacter
    ? "/character/hani_running.png"
    : "/character/hajun_running.png";

  const startWalking = async () => {
    setSensorError("");

    try {
      if (
        typeof window.Android === "undefined" ||
        typeof window.Android.startStepSensor !== "function"
      ) {
        setSensorError(
          "휴대폰 앱에서 산책을 시작해주세요. PC 브라우저에서는 걸음 센서를 사용할 수 없습니다."
        );
        return;
      }

      baseTodaySteps.current = game.todaySteps || 0;
      setSessionSteps(game.todaySteps || 0);
      setSeconds(0);

      window.Android.startStepSensor();
      setWalking(true);
    } catch (error) {
      console.error("산책 시작 오류", error);
      setSensorError("산책을 시작할 수 없습니다.");
      setWalking(false);
    }
  };

  const toggleWalking = () => {
    if (walking) {
      setWalking(false);
      return;
    }

    void startWalking();
  };

  /*
   * 산책 종료 시 이번 산책에서 늘어난 걸음만 GameContext에 저장합니다.
   */
  const finish = () => {
    const addedSteps = Math.max(
      0,
      sessionSteps - baseTodaySteps.current
    );

    if (addedSteps > 0) {
      addSteps(addedSteps);
    }

    setWalking(false);
    setSeconds(0);
    setSensorError("");
  };

  const statusText = walking
    ? "산책 중"
    : seconds > 0
      ? "산책 일시정지"
      : "산책 준비";

  return (
    <Guard>
      <main className={styles.root}>
        <section className={styles.phone}>
          <section
            className={`${styles.stage} ${
              walking ? styles.walking : styles.paused
            }`}
          >
            <Image
              src="/assets/backgrounds/walk_bg.png"
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 640px"
              className={styles.background}
            />

            <div className={styles.stageShade} />

            <header className={styles.header}>
              <div>
                <span>TTOK LIFE WALK</span>
                <strong>{statusText}</strong>
              </div>

              <button
                type="button"
                className={styles.endButton}
                onClick={finish}
              >
                종료
              </button>
            </header>

            <div className={styles.characterArea}>
              <div
                className={`${styles.characterMotion} ${
                  walking ? styles.characterActive : ""
                }`}
              >
                <Image
                  src={characterSrc}
                  alt={
                    walking
                      ? "산책 중인 캐릭터"
                      : "산책을 준비하는 캐릭터"
                  }
                  width={440}
                  height={440}
                  priority
                  className={styles.character}
                />

                <span className={styles.characterShadow} />

                {walking && (
                  <>
                    <span
                      className={`${styles.footprint} ${styles.footprintOne}`}
                    >
                      •
                    </span>
                    <span
                      className={`${styles.footprint} ${styles.footprintTwo}`}
                    >
                      •
                    </span>
                    <span
                      className={`${styles.sparkle} ${styles.sparkleOne}`}
                    >
                      ✦
                    </span>
                    <span
                      className={`${styles.sparkle} ${styles.sparkleTwo}`}
                    >
                      ✦
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.stageMessage}>
              <span>
                {walking
                  ? "오늘의 건강한 한 걸음을 쌓고 있어요"
                  : "오늘도 즐겁게 걸어볼까요?"}
              </span>
            </div>
          </section>

          <section className={styles.infoPanel}>
            <div className={styles.stepBlock}>
              <span>오늘의 걸음</span>

              <div>
                <strong>
                  {sessionSteps.toLocaleString()}
                </strong>
                <b>걸음</b>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <article>
                <span className={styles.statIcon}>
                  <Image
                    src="/assets/icons/calorie.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>
                <div>
                  <strong>{calories}</strong>
                  <small>kcal</small>
                </div>
              </article>

              <article>
                <span className={styles.statIcon}>
                  <Image
                    src="/assets/icons/droplet.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>
                <div>
                  <strong>{water}</strong>
                  <small>물방울</small>
                </div>
              </article>

              <article>
                <span className={styles.statIcon}>
                  <Image
                    src="/assets/icons/time.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>
                <div>
                  <strong>{timeText(seconds)}</strong>
                  <small>시간</small>
                </div>
              </article>
            </div>

            {sensorError && (
              <p className={styles.sensorError} role="alert">
                {sensorError}
              </p>
            )}
          </section>

          <section className={styles.controlPanel}>
            <button
              type="button"
              className={`${styles.walkButton} ${
                walking ? styles.stopState : ""
              }`}
              onClick={toggleWalking}
              aria-label={
                walking
                  ? "산책 일시정지"
                  : "산책 시작"
              }
            >
              <span className={styles.buttonIcon}>
                {walking ? "Ⅱ" : "👟"}
              </span>

              <span>
                <strong>
                  {walking ? "잠시 멈추기" : "산책 시작"}
                </strong>
                <small>
                  {walking
                    ? "다시 누르면 이어서 걸을 수 있어요"
                    : "걸음수와 물방울을 모아보세요"}
                </small>
              </span>
            </button>
          </section>

          <BottomNav />
        </section>
      </main>
    </Guard>
  );
}
