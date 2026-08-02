"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";

import styles from "./walk.module.css";

type SensorMode =
  | "none"
  | "android"
  | "browser";

type DeviceMotionPermissionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<
    "granted" | "denied"
  >;
};

function timeText(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainSeconds,
  ).padStart(2, "0")}`;
}

function isMobileBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );
}

declare global {
  interface Window {
    updateSteps?: (steps: number) => void;

    setStartSteps?: (steps: number) => void;

    onStepSensorError?: (
      message?: string,
    ) => void;

    Android?: {
      startStepSensor?: () => void;
      stopStepSensor?: () => void;
    };
  }
}

export default function WalkPage() {
  const { game, addSteps } = useGame();

  const [walking, setWalking] =
    useState(false);

  const [sessionSteps, setSessionSteps] =
    useState(game.todaySteps || 0);

  const [seconds, setSeconds] =
    useState(0);

  const [sensorError, setSensorError] =
    useState("");

  const [sensorMode, setSensorMode] =
    useState<SensorMode>("none");

  const timerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  /*
   * React 상태의 최신 walking 값을
   * Android JavaScript 콜백에서 확인하기 위한 ref입니다.
   */
  const walkingRef = useRef(false);

  /*
   * 산책을 처음 시작했을 당시 저장된 오늘 걸음수입니다.
   * 종료할 때 이번 산책에서 늘어난 걸음만 저장합니다.
   */
  const baseTodaySteps = useRef(
    game.todaySteps || 0,
  );

  /*
   * Android 센서를 새로 시작하거나 재개할 때
   * 화면에 이미 표시되던 걸음수입니다.
   */
  const segmentBaseSteps = useRef(
    game.todaySteps || 0,
  );

  /*
   * Android STEP_COUNTER의 시작 시점 누적값입니다.
   *
   * 예:
   * 센서 시작값 4,191
   * 현재 센서값 4,250
   * 이번 구간 증가 59걸음
   */
  const startSensorSteps = useRef(0);

  /*
   * 일반 모바일 브라우저용 모션 센서 상태입니다.
   */
  const browserMotionHandler =
    useRef<
      ((event: DeviceMotionEvent) => void) |
        null
    >(null);

  const browserGravity =
    useRef(9.8);

  const browserLastStepTime =
    useRef(0);

  const browserStepArmed =
    useRef(true);

  const browserSensorReceived =
    useRef(false);

  useEffect(() => {
    walkingRef.current = walking;
  }, [walking]);

  useEffect(() => {
    if (!walking) {
      setSessionSteps(
        game.todaySteps || 0,
      );

      baseTodaySteps.current =
        game.todaySteps || 0;

      segmentBaseSteps.current =
        game.todaySteps || 0;
    }
  }, [game.todaySteps, walking]);

  /*
   * Android WebView 브리지
   *
   * Android에서 다음처럼 호출합니다.
   *
   * window.setStartSteps(4191)
   * window.updateSteps(4250)
   */
  useEffect(() => {
    window.setStartSteps = (
      steps: number,
    ) => {
      if (!Number.isFinite(steps)) {
        return;
      }

      startSensorSteps.current =
        Math.floor(steps);
    };

    window.updateSteps = (
      currentSteps: number,
    ) => {
      if (
        !walkingRef.current ||
        !Number.isFinite(currentSteps)
      ) {
        return;
      }

      const normalizedCurrent =
        Math.floor(currentSteps);

      const walkingSteps = Math.max(
        0,
        normalizedCurrent -
          startSensorSteps.current,
      );

      setSessionSteps(
        segmentBaseSteps.current +
          walkingSteps,
      );
    };

    window.onStepSensorError = (
      message?: string,
    ) => {
      setSensorError(
        message ||
          "걸음 센서를 사용할 수 없습니다.",
      );

      setWalking(false);
      walkingRef.current = false;
      setSensorMode("none");
    };

    return () => {
      delete window.updateSteps;
      delete window.setStartSteps;
      delete window.onStepSensorError;
    };
  }, []);

  /*
   * 산책 시간
   */
  useEffect(() => {
    if (!walking) {
      return;
    }

    timerRef.current = setInterval(
      () => {
        setSeconds(
          (value) => value + 1,
        );
      },
      1000,
    );

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current,
        );

        timerRef.current = null;
      }
    };
  }, [walking]);

  /*
   * 페이지에서 벗어날 때 센서를 정리합니다.
   */
  useEffect(() => {
    return () => {
      window.removeEventListener(
        "devicemotion",
        browserMotionHandler.current as EventListener,
      );

      try {
        window.Android?.stopStepSensor?.();
      } catch {
        // 앱 브리지가 없어도 정상 종료합니다.
      }
    };
  }, []);

  /*
   * 걸음수 기준 보상
   *
   * GameContext의 addSteps()와 동일하게
   * 100걸음당 물방울 1개로 표시합니다.
   */
  const calories = Math.round(
    sessionSteps * 0.04,
  );

  const water = Math.floor(
    sessionSteps / 100,
  );

  const isFemaleCharacter =
    useMemo(() => {
      const id = String(
        game.characterId ?? "",
      )
        .trim()
        .toLowerCase();

      return [
        "harin",
        "hani",
        "girl",
        "female",
      ].includes(id);
    }, [game.characterId]);

  const characterSrc =
    isFemaleCharacter
      ? "/character/hani_running.png"
      : "/character/hajun_running.png";

  const stopBrowserSensor = () => {
    if (
      browserMotionHandler.current
    ) {
      window.removeEventListener(
        "devicemotion",
        browserMotionHandler.current,
      );

      browserMotionHandler.current =
        null;
    }
  };

  /*
   * 일반 모바일 브라우저용 모션 센서 시작
   *
   * 브라우저는 Android STEP_COUNTER에 직접 접근할 수 없어서
   * 가속도 변화로 걸음을 추정합니다.
   */
  const startBrowserSensor =
    async () => {
      if (
        typeof DeviceMotionEvent ===
        "undefined"
      ) {
        throw new Error(
          "이 브라우저에서는 모션 센서를 지원하지 않습니다.",
        );
      }

      const motionEvent =
        DeviceMotionEvent as DeviceMotionPermissionEvent;

      /*
       * iPhone·iPad Safari에서는
       * 사용자가 버튼을 누른 순간 권한을 요청해야 합니다.
       */
      if (
        typeof motionEvent.requestPermission ===
        "function"
      ) {
        const permission =
          await motionEvent.requestPermission();

        if (
          permission !== "granted"
        ) {
          throw new Error(
            "동작 및 방향 센서 권한이 필요합니다.",
          );
        }
      }

      stopBrowserSensor();

      browserGravity.current = 9.8;
      browserLastStepTime.current = 0;
      browserStepArmed.current = true;
      browserSensorReceived.current =
        false;

      const handler = (
        event: DeviceMotionEvent,
      ) => {
        if (!walkingRef.current) {
          return;
        }

        browserSensorReceived.current =
          true;

        const linear =
          event.acceleration;

        const includingGravity =
          event.accelerationIncludingGravity;

        let motionStrength = 0;
        let threshold = 1.35;

        /*
         * 중력이 제거된 acceleration을 제공하는 기기에서는
         * 이 값을 우선 사용합니다.
         */
        if (
          linear &&
          linear.x !== null &&
          linear.y !== null &&
          linear.z !== null
        ) {
          motionStrength = Math.sqrt(
            linear.x * linear.x +
              linear.y * linear.y +
              linear.z * linear.z,
          );

          threshold = 1.35;
        } else if (
          includingGravity &&
          includingGravity.x !== null &&
          includingGravity.y !== null &&
          includingGravity.z !== null
        ) {
          const magnitude = Math.sqrt(
            includingGravity.x *
              includingGravity.x +
              includingGravity.y *
                includingGravity.y +
              includingGravity.z *
                includingGravity.z,
          );

          /*
           * 저주파 중력값을 추정해
           * 순간 움직임만 분리합니다.
           */
          browserGravity.current =
            browserGravity.current *
              0.9 +
            magnitude * 0.1;

          motionStrength = Math.abs(
            magnitude -
              browserGravity.current,
          );

          threshold = 1.05;
        } else {
          return;
        }

        const now = Date.now();

        /*
         * 한 번의 충격이 여러 걸음으로 중복 인식되지 않도록
         * 파형이 내려간 뒤에만 다음 걸음을 받을 수 있습니다.
         */
        if (
          motionStrength <
          threshold * 0.42
        ) {
          browserStepArmed.current =
            true;

          return;
        }

        if (
          !browserStepArmed.current
        ) {
          return;
        }

        /*
         * 280ms보다 짧은 간격은 흔들기나 중복 충격으로 보고
         * 걸음으로 인정하지 않습니다.
         */
        if (
          now -
            browserLastStepTime.current <
          280
        ) {
          return;
        }

        /*
         * 너무 강한 단발 충격은 휴대폰 흔들기 가능성이 높아
         * 걸음으로 인정하지 않습니다.
         */
        if (motionStrength > 9.5) {
          browserStepArmed.current =
            false;

          return;
        }

        browserStepArmed.current =
          false;

        browserLastStepTime.current =
          now;

        setSessionSteps(
          (current) => current + 1,
        );
      };

      browserMotionHandler.current =
        handler;

      window.addEventListener(
        "devicemotion",
        handler,
        {
          passive: true,
        },
      );

      /*
       * 권한은 허용됐지만 실제 센서 이벤트가 오지 않는
       * 브라우저를 안내합니다.
       */
      window.setTimeout(() => {
        if (
          walkingRef.current &&
          sensorMode === "browser" &&
          !browserSensorReceived.current
        ) {
          setSensorError(
            "모션 센서 신호를 받지 못했습니다. 브라우저의 동작 센서 권한을 확인해주세요.",
          );
        }
      }, 3000);
    };

  const startWalking = async () => {
    setSensorError("");

    baseTodaySteps.current =
      game.todaySteps || 0;

    segmentBaseSteps.current =
      sessionSteps;

    setSeconds(0);

    /*
     * 먼저 walking 상태를 ref에 적용해야
     * Android가 즉시 값을 보내도 버려지지 않습니다.
     */
    walkingRef.current = true;
    setWalking(true);

    try {
      /*
       * Android 앱 WebView
       */
      if (
        typeof window.Android
          ?.startStepSensor ===
        "function"
      ) {
        setSensorMode("android");

        window.Android.startStepSensor();

        return;
      }

      /*
       * 일반 모바일 브라우저
       */
      if (isMobileBrowser()) {
        setSensorMode("browser");

        await startBrowserSensor();

        return;
      }

      throw new Error(
        "PC 브라우저에서는 걸음 센서를 사용할 수 없습니다. 휴대폰에서 접속해주세요.",
      );
    } catch (error) {
      console.error(
        "산책 시작 오류",
        error,
      );

      stopBrowserSensor();

      walkingRef.current = false;
      setWalking(false);
      setSensorMode("none");

      setSensorError(
        error instanceof Error
          ? error.message
          : "산책을 시작할 수 없습니다.",
      );
    }
  };

  const pauseWalking = () => {
    walkingRef.current = false;
    setWalking(false);

    if (
      sensorMode === "android"
    ) {
      try {
        window.Android
          ?.stopStepSensor?.();
      } catch {
        // 센서 정지 실패가 화면을 막지 않게 합니다.
      }
    }

    if (
      sensorMode === "browser"
    ) {
      stopBrowserSensor();
    }

    segmentBaseSteps.current =
      sessionSteps;
  };

  const toggleWalking = () => {
    if (walking) {
      pauseWalking();
      return;
    }

    void startWalking();
  };

  /*
   * 산책 종료 시 이번 산책 증가분만 저장합니다.
   */
  const finish = () => {
    walkingRef.current = false;

    stopBrowserSensor();

    try {
      window.Android
        ?.stopStepSensor?.();
    } catch {
      // 앱 브리지 미지원 환경에서도 정상 종료합니다.
    }

    const addedSteps = Math.max(
      0,
      sessionSteps -
        baseTodaySteps.current,
    );

    if (addedSteps > 0) {
      addSteps(addedSteps);

      /*
       * 종료 버튼을 다시 눌러도
       * 같은 걸음이 중복 저장되지 않게 합니다.
       */
      baseTodaySteps.current =
        sessionSteps;
    }

    setWalking(false);
    setSensorMode("none");
    setSeconds(0);
    setSensorError("");
  };

  const statusText = walking
    ? sensorMode === "android"
      ? "앱 정밀 측정 중"
      : sensorMode === "browser"
        ? "모바일 간편 측정 중"
        : "산책 중"
    : seconds > 0
      ? "산책 일시정지"
      : "산책 준비";

  const modeGuide =
    sensorMode === "android"
      ? "앱 걸음 센서로 실시간 측정 중입니다."
      : sensorMode === "browser"
        ? "모바일 모션 센서로 걸음을 추정합니다. 앱보다 오차가 있을 수 있습니다."
        : "";

  return (
    <Guard>
      <main className={styles.root}>
        <section className={styles.phone}>
          <section
            className={`${styles.stage} ${
              walking
                ? styles.walking
                : styles.paused
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

            <div
              className={styles.stageShade}
            />

            <header
              className={styles.header}
            >
              <div>
                <span>
                  TTOK LIFE WALK
                </span>

                <strong>
                  {statusText}
                </strong>
              </div>

              <button
                type="button"
                className={
                  styles.endButton
                }
                onClick={finish}
              >
                종료
              </button>
            </header>

            <div
              className={
                styles.characterArea
              }
            >
              <div
                className={`${
                  styles.characterMotion
                } ${
                  walking
                    ? styles.characterActive
                    : ""
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
                  className={
                    styles.character
                  }
                />

                <span
                  className={
                    styles.characterShadow
                  }
                />

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

            <div
              className={
                styles.stageMessage
              }
            >
              <span>
                {walking
                  ? "오늘의 건강한 한 걸음을 쌓고 있어요"
                  : "오늘도 즐겁게 걸어볼까요?"}
              </span>
            </div>
          </section>

          <section
            className={
              styles.infoPanel
            }
          >
            <div
              className={
                styles.stepBlock
              }
            >
              <span>오늘의 걸음</span>

              <div>
                <strong>
                  {sessionSteps.toLocaleString()}
                </strong>

                <b>걸음</b>
              </div>
            </div>

            <div
              className={
                styles.statsGrid
              }
            >
              <article>
                <span
                  className={
                    styles.statIcon
                  }
                >
                  <Image
                    src="/assets/icons/calorie.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>

                <div>
                  <strong>
                    {calories}
                  </strong>

                  <small>kcal</small>
                </div>
              </article>

              <article>
                <span
                  className={
                    styles.statIcon
                  }
                >
                  <Image
                    src="/assets/icons/droplet.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>

                <div>
                  <strong>
                    {water}
                  </strong>

                  <small>
                    물방울
                  </small>
                </div>
              </article>

              <article>
                <span
                  className={
                    styles.statIcon
                  }
                >
                  <Image
                    src="/assets/icons/time.png"
                    alt=""
                    width={34}
                    height={34}
                  />
                </span>

                <div>
                  <strong>
                    {timeText(seconds)}
                  </strong>

                  <small>시간</small>
                </div>
              </article>
            </div>

            {modeGuide && (
              <p
                className={
                  styles.sensorError
                }
                role="status"
              >
                {modeGuide}
              </p>
            )}

            {sensorError && (
              <p
                className={
                  styles.sensorError
                }
                role="alert"
              >
                {sensorError}
              </p>
            )}
          </section>

          <section
            className={
              styles.controlPanel
            }
          >
            <button
              type="button"
              className={`${
                styles.walkButton
              } ${
                walking
                  ? styles.stopState
                  : ""
              }`}
              onClick={toggleWalking}
              aria-label={
                walking
                  ? "산책 일시정지"
                  : "산책 시작"
              }
            >
              <span
                className={
                  styles.buttonIcon
                }
              >
                {walking ? "Ⅱ" : "👟"}
              </span>

              <span>
                <strong>
                  {walking
                    ? "잠시 멈추기"
                    : seconds > 0
                      ? "산책 이어하기"
                      : "산책 시작"}
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