"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";

import styles from "./walk.module.css";

/*
 * 앱 출시 후 실제 Play 스토어 주소가 달라지면
 * 이 주소만 변경하면 됩니다.
 */
const APP_INSTALL_URL =
  "https://play.google.com/store/apps/details?id=com.ttoklife.app";

const WEB_NOTICE_STORAGE_KEY =
  "ttok_walk_web_notice_seen";

const ANDROID_PERMISSION_GUIDE_KEY =
  "ttok_walk_android_permission_guide_seen";

type SensorMode =
  | "none"
  | "android"
  | "browser";

type DeviceMotionPermissionEvent =
  typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<
      "granted" | "denied"
    >;
  };

type LiveGameSnapshot = {
  todaySteps: number;
  weeklySteps: number;
  totalSteps: number;
  calories: number;
  water: number;
  exp: number;
};

function timeText(seconds: number) {
  const minutes = Math.floor(
    seconds / 60,
  );

  const remainSeconds =
    seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(remainSeconds).padStart(
    2,
    "0",
  )}`;
}

function isMobileBrowser() {
  if (
    typeof navigator === "undefined"
  ) {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );
}

function normalizeNumber(
  value: unknown,
  fallback = 0,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function getTotalSteps(
  game: unknown,
) {
  if (
    !game ||
    typeof game !== "object"
  ) {
    return 0;
  }

  const record =
    game as Record<string, unknown>;

  return normalizeNumber(
    record.totalSteps,
    0,
  );
}

declare global {
  interface Window {
    updateSteps?: (
      steps: number,
    ) => void;

    setStartSteps?: (
      steps: number,
    ) => void;

    onStepSensorError?: (
      message?: string,
    ) => void;

    onStepPermissionResult?: (
      activityRecognitionGranted: boolean,
      notificationGranted: boolean,
    ) => void;

    Android?: {
      requestStepPermissions?: () => void;
      startStepSensor?: () => void;
      stopStepSensor?: () => void;
    };
  }
}

export default function WalkPage() {
  const {
    game,
    patchGame,
  } = useGame();

  const [walking, setWalking] =
    useState(false);

  const [
    sessionSteps,
    setSessionSteps,
  ] = useState(
    game.todaySteps || 0,
  );

  const [seconds, setSeconds] =
    useState(0);

  const [
    sensorError,
    setSensorError,
  ] = useState("");

  const [
    sensorMode,
    setSensorMode,
  ] = useState<SensorMode>(
    "none",
  );

  /*
   * null: 브라우저 환경 확인 전
   * true: Android 앱 WebView
   * false: 일반 모바일웹 또는 PC 브라우저
   */
  const [
    isAndroidApp,
    setIsAndroidApp,
  ] = useState<boolean | null>(
    null,
  );

  const [
    showInstallModal,
    setShowInstallModal,
  ] = useState(false);

  const [
    showPermissionGuide,
    setShowPermissionGuide,
  ] = useState(false);

  const timerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  /*
   * Android 및 브라우저 센서 콜백에서
   * 최신 산책 상태를 확인합니다.
   */
  const walkingRef =
    useRef(false);

  /*
   * React game 값의 최신 상태를
   * 센서 콜백에서 안전하게 사용합니다.
   */
  const liveGameRef =
    useRef<LiveGameSnapshot>({
      todaySteps:
        game.todaySteps || 0,

      weeklySteps:
        game.weeklySteps || 0,

      totalSteps:
        getTotalSteps(game),

      calories:
        game.calories || 0,

      water:
        game.water || 0,

      exp:
        game.exp || 0,
    });

  /*
   * Android 센서 구간 시작 시
   * 이미 게임에 반영되어 있던 걸음수입니다.
   */
  const segmentBaseSteps =
    useRef(
      game.todaySteps || 0,
    );

  /*
   * Android STEP_COUNTER의
   * 실제 시작 누적값입니다.
   */
  const startSensorSteps =
    useRef(0);

  /*
   * 브라우저 모션 센서 상태입니다.
   */
  const browserMotionHandler =
    useRef<
      (
        event: DeviceMotionEvent,
      ) => void
    | null>(null);

  const browserGravity =
    useRef(9.8);

  const browserLastStepTime =
    useRef(0);

  const browserStepArmed =
    useRef(true);

  const browserSensorReceived =
    useRef(false);

  /*
   * 모바일웹용 3걸음 + 리듬 검증 상태입니다.
   *
   * 처음 1~2회 움직임은 보류하고,
   * 3회 이상 일정한 간격이 확인되면 한꺼번에 인정합니다.
   */
  const browserPendingSteps =
    useRef(0);

  const browserPendingStartedAt =
    useRef(0);

  const browserPendingIntervals =
    useRef<number[]>([]);

  const browserWalkingSequenceActive =
    useRef(false);

  const browserLastAcceptedStrength =
    useRef(0);

  /*
   * 모바일웹 V7용 원시 센서 추적값입니다.
   * 작은 진동이 아니라 휴대폰 전체가 크게 움직이는 순간을 찾습니다.
   */
  const browserPreviousVector =
    useRef({
      x: 0,
      y: 0,
      z: 0,
    });

  const browserFilteredStrength =
    useRef(0);

  const browserPeakStrength =
    useRef(0);

  const browserPeakDelta =
    useRef(0);

  const browserPeakStartedAt =
    useRef(0);

  /*
   * 큰 움직임의 방향을 비교합니다.
   * 동서남북으로 방향을 계속 바꾸는 흔들기는 제외하고,
   * 비슷한 축으로 반복되는 움직임만 걸음으로 인정합니다.
   */
  const browserPeakDirection =
    useRef({
      x: 0,
      y: 0,
      z: 0,
    });

  const browserPreviousAcceptedDirection =
    useRef<{
      x: number;
      y: number;
      z: number;
    } | null>(null);

  const browserDirectionMatchCount =
    useRef(0);

  /*
   * Android 앱 WebView 여부 확인
   *
   * 앱 안에서는 앱 설치 안내를 표시하지 않습니다.
   */
  useEffect(() => {
    setIsAndroidApp(
      typeof window.Android !==
        "undefined",
    );
  }, []);

  useEffect(() => {
    walkingRef.current =
      walking;
  }, [walking]);

  /*
   * GameContext에서 서버 데이터가 내려오거나
   * 다른 화면에서 값이 바뀌면 최신값을 반영합니다.
   *
   * 산책 중에는 센서값이 기준이므로
   * sessionSteps를 강제로 되돌리지 않습니다.
   */
  useEffect(() => {
    const nextSnapshot = {
      todaySteps:
        normalizeNumber(
          game.todaySteps,
          0,
        ),

      weeklySteps:
        normalizeNumber(
          game.weeklySteps,
          0,
        ),

      totalSteps:
        getTotalSteps(game),

      calories:
        normalizeNumber(
          game.calories,
          0,
        ),

      water:
        normalizeNumber(
          game.water,
          0,
        ),

      exp:
        normalizeNumber(
          game.exp,
          0,
        ),
    };

    liveGameRef.current =
      nextSnapshot;

    if (!walkingRef.current) {
      setSessionSteps(
        nextSnapshot.todaySteps,
      );

      segmentBaseSteps.current =
        nextSnapshot.todaySteps;
    }
  }, [
    game.todaySteps,
    game.weeklySteps,
    game.calories,
    game.water,
    game.exp,
    game,
  ]);

  /*
   * 절대 오늘 걸음수를 GameContext에 반영합니다.
   *
   * 걸음이 1개 증가할 때마다:
   * - todaySteps 증가
   * - weeklySteps 증가
   * - totalSteps 증가
   * - calories 재계산
   * - 100걸음 경계 통과 시 물방울/EXP 지급
   *
   * GameContext가 localStorage 캐시와
   * Supabase 자동 저장을 담당합니다.
   */
  const applyLiveTodaySteps =
    useCallback(
      (
        requestedTodaySteps: number,
      ) => {
        if (
          !Number.isFinite(
            requestedTodaySteps,
          )
        ) {
          return;
        }

        const current =
          liveGameRef.current;

        const nextTodaySteps =
          Math.max(
            current.todaySteps,
            Math.floor(
              requestedTodaySteps,
            ),
          );

        const addedSteps =
          nextTodaySteps -
          current.todaySteps;

        if (addedSteps <= 0) {
          setSessionSteps(
            nextTodaySteps,
          );

          return;
        }

        const previousWaterUnits =
          Math.floor(
            current.todaySteps / 100,
          );

        const nextWaterUnits =
          Math.floor(
            nextTodaySteps / 100,
          );

        const earnedUnits =
          Math.max(
            0,
            nextWaterUnits -
              previousWaterUnits,
          );

        const nextSnapshot: LiveGameSnapshot =
          {
            todaySteps:
              nextTodaySteps,

            weeklySteps:
              current.weeklySteps +
              addedSteps,

            totalSteps:
              current.totalSteps +
              addedSteps,

            calories:
              Math.round(
                nextTodaySteps *
                  0.04,
              ),

            water:
              current.water +
              earnedUnits,

            exp:
              current.exp +
              earnedUnits,
          };

        /*
         * 연속 센서 이벤트에서도 이전 값이
         * 중복 사용되지 않도록 ref를 먼저 갱신합니다.
         */
        liveGameRef.current =
          nextSnapshot;

        setSessionSteps(
          nextTodaySteps,
        );

        patchGame({
          todaySteps:
            nextSnapshot.todaySteps,

          weeklySteps:
            nextSnapshot.weeklySteps,

          totalSteps:
            nextSnapshot.totalSteps,

          calories:
            nextSnapshot.calories,

          water:
            nextSnapshot.water,

          exp:
            nextSnapshot.exp,
        } as Partial<typeof game>);
      },
      [
        patchGame,
      ],
    );

  /*
   * Android WebView 브리지
   *
   * Android 호출 예:
   * window.setStartSteps(4191)
   * window.updateSteps(4250)
   */
  useEffect(() => {
    window.setStartSteps = (
      steps: number,
    ) => {
      if (
        !Number.isFinite(steps)
      ) {
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
        !Number.isFinite(
          currentSteps,
        )
      ) {
        return;
      }

      const normalizedCurrent =
        Math.floor(
          currentSteps,
        );

      const walkingSteps =
        Math.max(
          0,
          normalizedCurrent -
            startSensorSteps.current,
        );

      const nextTodaySteps =
        segmentBaseSteps.current +
        walkingSteps;

      applyLiveTodaySteps(
        nextTodaySteps,
      );
    };

    window.onStepSensorError = (
      message?: string,
    ) => {
      setSensorError(
        message ||
          "걸음 센서를 사용할 수 없습니다.",
      );

      walkingRef.current =
        false;

      setWalking(false);
      setSensorMode("none");
    };

    return () => {
      delete window.updateSteps;
      delete window.setStartSteps;
      delete window.onStepSensorError;
    };
  }, [
    applyLiveTodaySteps,
  ]);

  /*
   * 산책 시간 측정
   */
  useEffect(() => {
    if (!walking) {
      return;
    }

    timerRef.current =
      setInterval(() => {
        setSeconds(
          (value) =>
            value + 1,
        );
      }, 1000);

    return () => {
      if (!timerRef.current) {
        return;
      }

      clearInterval(
        timerRef.current,
      );

      timerRef.current =
        null;
    };
  }, [walking]);

  /*
   * 브라우저 모션 센서를 정지합니다.
   */
  const stopBrowserSensor =
    useCallback(() => {
      if (
        !browserMotionHandler.current
      ) {
        return;
      }

      window.removeEventListener(
        "devicemotion",
        browserMotionHandler.current,
      );

      browserMotionHandler.current =
        null;
    }, []);

  /*
   * 페이지 이탈 시 센서 정리
   */
  useEffect(() => {
    return () => {
      stopBrowserSensor();

      try {
        window.Android
          ?.stopStepSensor?.();
      } catch {
        // Android 브리지가 없어도 정상 종료합니다.
      }
    };
  }, [
    stopBrowserSensor,
  ]);

  /*
   * 화면 표시값은 GameContext에 반영된
   * 현재 오늘 걸음수를 기준으로 계산합니다.
   */
  const calories =
    Math.round(
      sessionSteps * 0.04,
    );

  const water =
    Math.floor(
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
    }, [
      game.characterId,
    ]);

  const characterSrc =
    isFemaleCharacter
      ? "/character/hani_running.png"
      : "/character/hajun_running.png";

  /*
   * 일반 모바일 브라우저 모션 센서 시작
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

      browserGravity.current =
        9.8;

      browserLastStepTime.current =
        0;

      browserStepArmed.current =
        true;

      browserSensorReceived.current =
        false;

      browserFilteredStrength.current =
        0;

      browserLastAcceptedStrength.current =
        0;

      browserPeakStrength.current =
        0;

      browserPeakDelta.current =
        0;

      browserPeakStartedAt.current =
        0;

      /*
       * 모바일웹 V11 - 착지 충격 1회 = 걸음 1회
       *
       * 방향과 보행 리듬은 판정하지 않습니다.
       * 사람이 한 발을 디딜 때 주머니 속 휴대폰에 전달되는 것처럼,
       * 짧고 강하게 상승하는 충격만 감지합니다.
       *
       * 작은 떨림이나 부드러운 이동은:
       * - 절대 충격 크기
       * - 순간 상승량
       * 중 하나라도 부족하면 무시합니다.
       */
      const IMPACT_THRESHOLD =
        1.35;

      const IMPACT_DELTA_THRESHOLD =
        0.72;

      const RELEASE_THRESHOLD =
        0.72;

      /*
       * 같은 착지 충격이 여러 센서 이벤트로 중복 집계되는 것만 막습니다.
       * 달리기는 허용하도록 짧게 설정합니다.
       */
      const MIN_IMPACT_INTERVAL_MS =
        150;

      /*
       * 착지 충격은 짧게 끝나야 합니다.
       * 오래 지속되는 흔들림은 한 번의 착지로 보지 않습니다.
       */
      const MAX_IMPACT_DURATION_MS =
        650;

      const MAX_IMPACT_STRENGTH =
        22;

      /*
       * 센서값을 너무 부드럽게 만들면 실제 착지 피크가 사라지므로
       * 비교적 빠르게 반응하도록 설정합니다.
       */
      const FILTER_RATIO =
        0.62;

      let previousFilteredStrength =
        0;

      const resetImpact =
        () => {
          browserPeakStrength.current =
            0;

          browserPeakDelta.current =
            0;

          browserPeakStartedAt.current =
            0;

          browserStepArmed.current =
            true;
        };

      const acceptImpact =
        (now: number) => {
          const previousTime =
            browserLastStepTime.current;

          if (
            previousTime > 0 &&
            now - previousTime <
              MIN_IMPACT_INTERVAL_MS
          ) {
            return;
          }

          browserLastStepTime.current =
            now;

          applyLiveTodaySteps(
            liveGameRef.current
              .todaySteps + 1,
          );
        };

      const handler = (
        event: DeviceMotionEvent,
      ) => {
        if (
          !walkingRef.current
        ) {
          return;
        }

        browserSensorReceived.current =
          true;

        const linear =
          event.acceleration;

        const includingGravity =
          event.accelerationIncludingGravity;

        let motionStrength = 0;

        if (
          linear &&
          linear.x !== null &&
          linear.y !== null &&
          linear.z !== null
        ) {
          motionStrength =
            Math.sqrt(
              linear.x *
                linear.x +
                linear.y *
                  linear.y +
                linear.z *
                  linear.z,
            );
        } else if (
          includingGravity &&
          includingGravity.x !==
            null &&
          includingGravity.y !==
            null &&
          includingGravity.z !==
            null
        ) {
          const magnitude =
            Math.sqrt(
              includingGravity.x *
                includingGravity.x +
                includingGravity.y *
                  includingGravity.y +
                includingGravity.z *
                  includingGravity.z,
            );

          browserGravity.current =
            browserGravity.current *
              0.94 +
            magnitude * 0.06;

          motionStrength =
            Math.abs(
              magnitude -
                browserGravity.current,
            );
        } else {
          return;
        }

        browserFilteredStrength.current =
          browserFilteredStrength.current *
            (
              1 -
              FILTER_RATIO
            ) +
          motionStrength *
            FILTER_RATIO;

        const filteredStrength =
          browserFilteredStrength.current;

        const strengthDelta =
          Math.max(
            0,
            filteredStrength -
              previousFilteredStrength,
          );

        previousFilteredStrength =
          filteredStrength;

        const now =
          Date.now();

        /*
         * 아직 착지 충격이 시작되지 않은 상태입니다.
         * 충격의 절대 크기와 순간 상승량을 동시에 통과해야 합니다.
         */
        if (
          browserPeakStartedAt.current ===
          0
        ) {
          const isLandingImpact =
            filteredStrength >=
              IMPACT_THRESHOLD &&
            strengthDelta >=
              IMPACT_DELTA_THRESHOLD;

          if (!isLandingImpact) {
            return;
          }

          if (
            filteredStrength >
            MAX_IMPACT_STRENGTH
          ) {
            resetImpact();

            return;
          }

          browserPeakStartedAt.current =
            now;

          browserPeakStrength.current =
            filteredStrength;

          browserPeakDelta.current =
            strengthDelta;

          browserStepArmed.current =
            false;

          return;
        }

        browserPeakStrength.current =
          Math.max(
            browserPeakStrength.current,
            filteredStrength,
          );

        browserPeakDelta.current =
          Math.max(
            browserPeakDelta.current,
            strengthDelta,
          );

        const impactDuration =
          now -
          browserPeakStartedAt.current;

        /*
         * 오래 이어지는 움직임은 짧은 착지 충격이 아니므로 폐기합니다.
         */
        if (
          impactDuration >
          MAX_IMPACT_DURATION_MS
        ) {
          resetImpact();

          return;
        }

        /*
         * 충격이 충분히 가라앉으면 착지 1회를 확정합니다.
         */
        if (
          filteredStrength <=
          RELEASE_THRESHOLD
        ) {
          const validImpact =
            browserPeakStrength.current >=
              IMPACT_THRESHOLD &&
            browserPeakDelta.current >=
              IMPACT_DELTA_THRESHOLD;

          resetImpact();

          if (validImpact) {
            acceptImpact(
              now,
            );
          }
        }
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

      window.setTimeout(() => {
        if (
          walkingRef.current &&
          !browserSensorReceived.current
        ) {
          setSensorError(
            "모션 센서 신호를 받지 못했습니다. 브라우저의 동작 센서 권한을 확인해주세요.",
          );
        }
      }, 3000);
    };

  const startWalking =
    async () => {
      setSensorError("");

      /*
       * 현재 GameContext 걸음수를
       * 새 센서 구간의 기준으로 설정합니다.
       */
      segmentBaseSteps.current =
        liveGameRef.current.todaySteps;

      setSessionSteps(
        liveGameRef.current.todaySteps,
      );

      setSeconds(0);

      walkingRef.current =
        true;

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
          setSensorMode(
            "android",
          );

          window.Android
            .startStepSensor();

          return;
        }

        /*
         * 일반 모바일 브라우저
         */
        if (
          isMobileBrowser()
        ) {
          setSensorMode(
            "browser",
          );

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

        walkingRef.current =
          false;

        setWalking(false);
        setSensorMode("none");

        setSensorError(
          error instanceof Error
            ? error.message
            : "산책을 시작할 수 없습니다.",
        );
      }
    };
      /*
   * Android 권한 요청 결과를 받습니다.
   *
   * 신체 활동과 알림 권한이 모두 허용되면
   * 안내 확인 상태를 저장하고 산책을 자동 시작합니다.
   */
  useEffect(() => {
    window.onStepPermissionResult =
      (
        activityRecognitionGranted:
          boolean,
        notificationGranted:
          boolean,
      ) => {
        if (
          !activityRecognitionGranted
        ) {
          setSensorError(
            "걸음 측정을 위해 신체 활동 권한을 허용해주세요.",
          );

          return;
        }

        if (!notificationGranted) {
          setSensorError(
            "화면을 꺼도 걸음 측정을 계속하려면 알림 권한을 허용해주세요.",
          );

          return;
        }

        try {
          localStorage.setItem(
            ANDROID_PERMISSION_GUIDE_KEY,
            "true",
          );
        } catch {
          // 저장소가 제한돼도 산책은 시작합니다.
        }

        void startWalking();
      };

    return () => {
      delete window
        .onStepPermissionResult;
    };
  }, [startWalking]);


  const pauseWalking = () => {
    walkingRef.current =
      false;

    setWalking(false);

    if (
      sensorMode === "android"
    ) {
      try {
        window.Android
          ?.stopStepSensor?.();
      } catch {
        // 센서 정지 실패가 화면을 막지 않습니다.
      }
    }

    if (
      sensorMode === "browser"
    ) {
      stopBrowserSensor();
    }

    /*
     * 이어 걷기를 시작할 때 현재 GameContext 걸음수부터
     * 새 센서 구간을 시작합니다.
     */
    segmentBaseSteps.current =
      liveGameRef.current.todaySteps;
  };

  /*
   * 앱 설치 페이지로 이동합니다.
   */
  const openAppInstall = () => {
    window.location.href =
      APP_INSTALL_URL;
  };

  /*
   * 설치 안내를 닫고 모바일웹에서
   * 산책 측정을 계속 시작합니다.
   */
  const continueWithWeb = () => {
    try {
      sessionStorage.setItem(
        WEB_NOTICE_STORAGE_KEY,
        "true",
      );
    } catch {
      // 저장소 사용이 제한돼도 산책은 계속 진행합니다.
    }

    setShowInstallModal(
      false,
    );

    void startWalking();
  };

  /*
   * Android 앱 권한 안내를 확인한 뒤 산책을 시작합니다.
   *
   * 안내창은 기기별로 최초 1회만 표시합니다.
   */
  const confirmAndroidPermissionGuide =
  () => {
    setSensorError("");

    setShowPermissionGuide(
      false,
    );

    if (
      typeof window.Android
        ?.requestStepPermissions !==
      "function"
    ) {
      setSensorError(
        "걸음 측정 권한 기능을 사용할 수 없습니다. 앱을 최신 버전으로 다시 실행해주세요.",
      );

      return;
    }

    window.Android
      .requestStepPermissions();
  };

  /*
   * 산책 버튼 처리
   *
   * Android 앱:
   * 최초 1회 권한 안내를 표시한 뒤 센서를 시작합니다.
   *
   * 일반 모바일웹:
   * 브라우저 세션당 최초 1회
   * 앱 설치 권장 팝업을 표시합니다.
   */
  const handleWalkButtonClick =
    () => {
      if (walking) {
        pauseWalking();

        return;
      }

      if (
        isAndroidApp === true
      ) {
        let guideSeen = false;

        try {
          guideSeen =
            localStorage.getItem(
              ANDROID_PERMISSION_GUIDE_KEY,
            ) === "true";
        } catch {
          guideSeen = false;
        }

        if (!guideSeen) {
          setShowPermissionGuide(
            true,
          );

          return;
        }

        void startWalking();

        return;
      }

      let noticeSeen = false;

      try {
        noticeSeen =
          sessionStorage.getItem(
            WEB_NOTICE_STORAGE_KEY,
          ) === "true";
      } catch {
        noticeSeen = false;
      }

      if (!noticeSeen) {
        setShowInstallModal(
          true,
        );

        return;
      }

      void startWalking();
    };

  /*
   * 걸음은 이미 실시간으로 GameContext에 반영되므로
   * 종료 시 addSteps를 다시 호출하지 않습니다.
   */
  const finish = () => {
    walkingRef.current =
      false;

    stopBrowserSensor();

    try {
      window.Android
        ?.stopStepSensor?.();
    } catch {
      // Android 브리지 미지원 환경에서도 정상 종료합니다.
    }

    segmentBaseSteps.current =
      liveGameRef.current.todaySteps;

    setSessionSteps(
      liveGameRef.current.todaySteps,
    );

    setWalking(false);
    setSensorMode("none");
    setSeconds(0);
    setSensorError("");
  };

  const statusText =
    walking
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
        ? "모바일웹은 발을 디딜 때처럼 짧고 강한 충격이 발생했다가 가라앉는 순간을 1걸음으로 기록합니다. 미세한 진동과 부드러운 움직임은 무시합니다."
        : "";

  return (
    <Guard>
      <main
        className={styles.root}
      >
        <section
          className={styles.phone}
        >
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
              className={
                styles.background
              }
            />

            <div
              className={
                styles.stageShade
              }
            />

            <header
              className={
                styles.header
              }
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
              <span>
                오늘의 걸음
              </span>

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

                  <small>
                    kcal
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
                    {timeText(
                      seconds,
                    )}
                  </strong>

                  <small>
                    시간
                  </small>
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

          {isAndroidApp ===
            false && (
            <section
              className={
                styles.appInstallCard
              }
              aria-label="TTOK LIFE 앱 설치 안내"
            >
              <div
                className={
                  styles.appInstallIcon
                }
                aria-hidden="true"
              >
                📱
              </div>

              <div
                className={
                  styles.appInstallContent
                }
              >
                <span>
                  더 정확한 걸음 측정
                </span>

                <strong>
                  TTOK LIFE 앱으로 걸어보세요
                </strong>

                <p>
                  모바일웹은 부정 측정 방지를 위해
                  걸음 수가 보수적으로 기록될 수
                  있습니다.
                </p>

                <ul>
                  <li>
                    화면을 꺼도 자동 측정
                  </li>

                  <li>
                    더 안정적인 걸음 기록
                  </li>

                  <li>
                    보상 누락 방지
                  </li>
                </ul>

                <button
                  type="button"
                  className={
                    styles.appInstallButton
                  }
                  onClick={
                    openAppInstall
                  }
                >
                  <span
                    aria-hidden="true"
                  >
                    📲
                  </span>

                  TTOK LIFE 앱 설치하기
                </button>
              </div>
            </section>
          )}

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
              onClick={
                handleWalkButtonClick
              }
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
                {walking
                  ? "Ⅱ"
                  : "👟"}
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

        {showPermissionGuide && (
          <div
            className={
              styles.installModalBackdrop
            }
            role="presentation"
          >
            <section
              className={
                styles.installModal
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="walk-permission-title"
            >
              <div
                className={
                  styles.installModalIcon
                }
                aria-hidden="true"
              >
                🚶
              </div>

              <span>
                TTOK LIFE WALK
              </span>

              <h2 id="walk-permission-title">
                정확한 걸음 측정을 위해
                <br />
                권한이 필요해요
              </h2>

              <p>
                산책 중 걸음 수를 정확하게 기록하고,
                화면을 끄거나 다른 앱을 사용해도 측정을
                계속하기 위해 아래 권한을 사용합니다.
              </p>

              <div
                className={
                  styles.installBenefits
                }
              >
                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  <span>
                    <strong>
                      신체 활동
                    </strong>
                    <br />
                    휴대폰의 걸음 센서로 걷기와 달리기를
                    측정합니다.
                  </span>
                </div>

                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  <span>
                    <strong>
                      알림
                    </strong>
                    <br />
                    화면을 꺼도 걸음 측정이 계속되고 있음을
                    알려드립니다.
                  </span>
                </div>

                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  <span>
                    권한은 걸음 측정 기능에만 사용됩니다.
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.installPrimaryButton
                }
                onClick={
                  confirmAndroidPermissionGuide
                }
              >
                권한 허용하고 산책 시작하기
              </button>

              <button
                type="button"
                className={
                  styles.installSecondaryButton
                }
                onClick={() =>
                  setShowPermissionGuide(
                    false,
                  )
                }
              >
                다음에 하기
              </button>
            </section>
          </div>
        )}

        {showInstallModal && (
          <div
            className={
              styles.installModalBackdrop
            }
            role="presentation"
            onClick={() =>
              setShowInstallModal(
                false,
              )
            }
          >
            <section
              className={
                styles.installModal
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="walk-install-title"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className={
                  styles.installModalClose
                }
                onClick={() =>
                  setShowInstallModal(
                    false,
                  )
                }
                aria-label="닫기"
              >
                ×
              </button>

              <div
                className={
                  styles.installModalIcon
                }
                aria-hidden="true"
              >
                📱
              </div>

              <span>
                더 정확한 걸음 측정
              </span>

              <h2 id="walk-install-title">
                앱에서는 화면을 꺼도
                <br />
                걸음이 기록돼요
              </h2>

              <p>
                현재 모바일웹으로 이용 중입니다.
                웹에서는 기기 환경에 따라 걸음 수가
                적게 측정되거나 화면을 끄면 측정이
                중단될 수 있어요.
              </p>

              <div
                className={
                  styles.installBenefits
                }
              >
                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  화면을 꺼도 자동 측정
                </div>

                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  더 안정적인 걸음 기록
                </div>

                <div>
                  <b
                    aria-hidden="true"
                  >
                    ✓
                  </b>

                  보상 누락 방지
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.installPrimaryButton
                }
                onClick={
                  openAppInstall
                }
              >
                📲 TTOK LIFE 앱 설치하기
              </button>

              <button
                type="button"
                className={
                  styles.installSecondaryButton
                }
                onClick={
                  continueWithWeb
                }
              >
                계속 웹으로 이용하기
              </button>
            </section>
          </div>
        )}
      </main>
    </Guard>
  );
}