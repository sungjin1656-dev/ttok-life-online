"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";

function timeText(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export default function WalkPage() {
  const { game, addSteps } = useGame();

  /*
    테스트 버전에서는 true였지만,
    실제 버전에서는 사용자가 버튼을 눌러 산책을 시작합니다.
  */
  const [walking, setWalking] = useState(false);

  /*
    오늘 저장된 걸음 수부터 시작합니다.
    저장된 값이 없으면 0으로 시작합니다.
  */
  const [sessionSteps, setSessionSteps] = useState(
    game.todaySteps || 0
  );

  const [seconds, setSeconds] = useState(0);
  const [sensorError, setSensorError] = useState("");

  const timer = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  /*
    걸음 감지에 사용하는 값입니다.
  */
  const lastStepAt = useRef(0);
  const previousSignal = useRef(0);
  const filteredSignal = useRef(0);

  /*
    산책 중인 시간만 증가시킵니다.
  */
  useEffect(() => {
    if (!walking) {
      return;
    }

    timer.current = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [walking]);

  /*
    휴대폰 움직임 센서로 걸음을 감지합니다.
  */
  useEffect(() => {
    if (!walking) {
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration =
        event.accelerationIncludingGravity;

      if (
        acceleration?.x == null ||
        acceleration?.y == null ||
        acceleration?.z == null
      ) {
        return;
      }

      const { x, y, z } = acceleration;

      /*
        휴대폰 방향과 관계없이 전체 움직임 크기를 계산합니다.
      */
      const magnitude = Math.sqrt(
        x * x + y * y + z * z
      );

      /*
        중력값 약 9.81을 제외한 움직임 강도입니다.
      */
      const motion = Math.abs(magnitude - 9.81);

      /*
        센서의 순간적인 흔들림을 완화합니다.
      */
      filteredSignal.current =
        filteredSignal.current * 0.78 +
        motion * 0.22;

      const currentSignal = filteredSignal.current;
      const previous = previousSignal.current;
      const now = Date.now();

      /*
        임계치를 아래에서 위로 통과할 때만
        한 걸음으로 판단합니다.
      */
      const crossedThreshold =
        previous < 1.05 && currentSignal >= 1.05;

      /*
        너무 빠른 흔들기를 걸음으로 중복 인식하지 않도록
        최소 280ms 간격을 둡니다.
      */
      const enoughTimePassed =
        now - lastStepAt.current >= 280;

      if (crossedThreshold && enoughTimePassed) {
        lastStepAt.current = now;

        setSessionSteps((steps) => steps + 1);
      }

      previousSignal.current = currentSignal;
    };

    window.addEventListener(
      "devicemotion",
      handleMotion,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "devicemotion",
        handleMotion
      );
    };
  }, [walking]);

  const calories = Math.round(sessionSteps * 0.07);
  const water = Math.floor(sessionSteps / 10);

  /*
    여성 캐릭터 ID를 여러 형식으로 인식합니다.
  */
  const characterId = String(game.characterId ?? "")
    .trim()
    .toLowerCase();

  const femaleCharacterIds = [
    "harin",
    "hani",
    "girl",
    "female",
  ];

  const isFemaleCharacter =
    femaleCharacterIds.includes(characterId);

  const characterSrc = walking
    ? isFemaleCharacter
      ? "/assets/characters/girl-running-clean.png"
      : "/assets/characters/boy-running-clean.png"
    : isFemaleCharacter
      ? "/assets/characters/girl-standing.png"
      : "/assets/characters/boy-standing.png";

  /*
    아이폰에서는 버튼을 누른 순간 센서 권한을 요청해야 합니다.
    갤럭시는 권한 함수가 없으면 바로 시작합니다.
  */
  const startWalking = async () => {
    setSensorError("");

    try {
      if (typeof DeviceMotionEvent === "undefined") {
        setSensorError(
          "이 기기에서는 움직임 센서를 사용할 수 없습니다."
        );
        return;
      }

      const MotionEvent =
        DeviceMotionEvent as DeviceMotionEventWithPermission;

      if (
        typeof MotionEvent.requestPermission === "function"
      ) {
        const permission =
          await MotionEvent.requestPermission();

        if (permission !== "granted") {
          setSensorError(
            "산책을 시작하려면 동작 센서 권한이 필요합니다."
          );
          return;
        }
      }

      lastStepAt.current = 0;
      previousSignal.current = 0;
      filteredSignal.current = 0;

      setWalking(true);
    } catch (error) {
      console.error(
        "움직임 센서 시작 오류:",
        error
      );

      setSensorError(
        "움직임 센서를 시작하지 못했습니다."
      );
    }
  };

  const toggleWalking = () => {
    if (walking) {
      setWalking(false);
      return;
    }

    void startWalking();
  };

  const finish = () => {
    const added = Math.max(
      0,
      sessionSteps - (game.todaySteps || 0)
    );

    if (added > 0) {
      addSteps(added);
    }

    setWalking(false);
  };

  return (
    <Guard>
      <main className="walk-master-app">
        <section className="walk-master-phone">
          <div
            className={`walk-master-stage ${
              walking ? "is-walking" : "is-paused"
            }`}
          >
            <header className="walk-master-header">
              <strong>
                {walking
                  ? "산책 중..."
                  : seconds > 0
                    ? "산책 일시정지"
                    : "산책 준비"}
              </strong>

              <button
                className="walk-end-button"
                onClick={finish}
              >
                종료
              </button>
            </header>

            <div className="walk-cloud wm-cloud-one" />
            <div className="walk-cloud wm-cloud-two" />

            <div className="walk-city" />

            <div className="walk-bridge">
              <span />
              <span />
              <span />
            </div>

            <div className="walk-sea" />
            <div className="walk-ground" />
            <div className="walk-path-ribbon" />

            <div className="walk-flowers">
              ✿　✿　✿　✿
            </div>

            <div
              className={`walk-runner-wrap ${
                walking
                  ? "is-walking"
                  : "is-paused"
              }`}
            >
              <Image
                src={characterSrc}
                alt={
                  isFemaleCharacter
                    ? "산책 중인 하니"
                    : "산책 중인 남성 캐릭터"
                }
                width={250}
                height={390}
                priority
              />
            </div>
          </div>

          <section className="walk-info-panel">
            <div className="walk-step-count">
              <strong>
                {sessionSteps.toLocaleString()}
              </strong>

              <span>걸음</span>
            </div>

            <div className="walk-info-divider" />

            <div className="walk-mini-stats">
              <article>
                <span className="walk-mini-icon fire">
                  🔥
                </span>

                <div>
                  <strong>{calories}</strong>
                  <small>kcal</small>
                </div>
              </article>

              <article>
                <span className="walk-mini-icon drop">
                  💧
                </span>

                <div>
                  <strong>{water}</strong>
                  <small>물방울</small>
                </div>
              </article>

              <article>
                <span className="walk-mini-icon clock">
                  ◷
                </span>

                <div>
                  <strong>
                    {timeText(seconds)}
                  </strong>

                  <small>시간</small>
                </div>
              </article>
            </div>

            {sensorError && (
              <p
                className="walk-sensor-error"
                role="alert"
              >
                {sensorError}
              </p>
            )}
          </section>

          <section className="walk-control-panel">
            <button
              className={`walk-pause-button ${
                walking ? "" : "paused"
              }`}
              onClick={toggleWalking}
              aria-label={
                walking
                  ? "산책 일시정지"
                  : seconds > 0
                    ? "산책 다시 시작"
                    : "산책 시작"
              }
            >
              <span>
                {walking ? "Ⅱ" : "▶"}
              </span>
            </button>
          </section>

          <BottomNav />
        </section>
      </main>
    </Guard>
  );
}