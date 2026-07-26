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
    사용자가 버튼을 눌렀을 때 산책을 시작합니다.
  */
  const [walking, setWalking] = useState(false);

  /*
    오늘 저장된 걸음 수부터 시작합니다.
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
    걸음 감지에 사용하는 센서 값입니다.
  */
  const lastStepAt = useRef(0);
  const filteredSignal = useRef(0);
  const sensorReady = useRef(false);
  const stepArmed = useRef(true);

  /*
    축별 중력 기준값입니다.
  */
  const gravityX = useRef(0);
  const gravityY = useRef(0);
  const gravityZ = useRef(0);

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

    STEP_THRESHOLD:
    이 값보다 움직임이 커지면 걸음 후보입니다.

    RESET_THRESHOLD:
    움직임이 다시 이 값 아래로 내려와야
    다음 걸음을 받을 준비를 합니다.

    MIN_STEP_INTERVAL:
    너무 짧은 간격의 중복 감지를 막습니다.
  */
  useEffect(() => {
    if (!walking) {
      return;
    }

    const STEP_THRESHOLD = 1.35;
    const RESET_THRESHOLD = 0.65;
    const MIN_STEP_INTERVAL = 360;
    const MAX_VALID_MOTION = 8;

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
        센서를 처음 받았을 때 현재 값을
        중력 기준값으로 저장합니다.

        시작 버튼을 누르는 순간 발생하는 진동이
        걸음으로 인식되는 것을 방지합니다.
      */
      if (!sensorReady.current) {
        gravityX.current = x;
        gravityY.current = y;
        gravityZ.current = z;

        filteredSignal.current = 0;
        stepArmed.current = true;
        sensorReady.current = true;

        return;
      }

      /*
        휴대폰 방향이 조금씩 바뀌어도 대응할 수 있도록
        중력 기준값을 천천히 갱신합니다.
      */
      const gravityFilter = 0.92;

      gravityX.current =
        gravityX.current * gravityFilter +
        x * (1 - gravityFilter);

      gravityY.current =
        gravityY.current * gravityFilter +
        y * (1 - gravityFilter);

      gravityZ.current =
        gravityZ.current * gravityFilter +
        z * (1 - gravityFilter);

      /*
        센서값에서 중력을 제거합니다.
      */
      const linearX = x - gravityX.current;
      const linearY = y - gravityY.current;
      const linearZ = z - gravityZ.current;

      /*
        휴대폰 방향과 관계없이 움직임 크기를 계산합니다.
      */
      const rawMotion = Math.sqrt(
        linearX * linearX +
          linearY * linearY +
          linearZ * linearZ
      );

      /*
        너무 강한 충격이나 휴대폰 흔들기는
        정상적인 걸음으로 인정하지 않습니다.
      */
      if (rawMotion > MAX_VALID_MOTION) {
        stepArmed.current = false;
        filteredSignal.current = 0;

        return;
      }

      /*
        센서의 순간적인 노이즈를 완화합니다.
      */
      filteredSignal.current =
        filteredSignal.current * 0.74 +
        rawMotion * 0.26;

      const signal = filteredSignal.current;
      const now = Date.now();

      /*
        움직임이 충분히 낮아지면
        다음 걸음을 감지할 준비를 합니다.
      */
      if (signal <= RESET_THRESHOLD) {
        stepArmed.current = true;
      }

      const enoughTimePassed =
        now - lastStepAt.current >= MIN_STEP_INTERVAL;

      /*
        준비 상태에서 임계치를 넘고,
        이전 걸음과 충분한 시간 간격이 있을 때만
        한 걸음을 추가합니다.
      */
      if (
        stepArmed.current &&
        signal >= STEP_THRESHOLD &&
        enoughTimePassed
      ) {
        lastStepAt.current = now;
        stepArmed.current = false;

        setSessionSteps((steps) => steps + 1);
      }
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

  /*
    걸음 수를 기준으로 칼로리와 물방울을 계산합니다.
    칼로리값은 걸음 감지 속도에 영향을 주지 않습니다.
  */
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
    아이폰에서는 버튼을 누른 순간
    센서 권한을 요청해야 합니다.

    갤럭시는 별도 권한 함수가 없으면
    바로 산책을 시작합니다.
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

      /*
        산책을 새로 시작하거나 다시 시작할 때
        센서 상태를 초기화합니다.
      */
      lastStepAt.current = 0;
      filteredSignal.current = 0;
      sensorReady.current = false;
      stepArmed.current = true;

      gravityX.current = 0;
      gravityY.current = 0;
      gravityZ.current = 0;

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

  /*
    산책 시작 또는 일시정지 버튼입니다.
  */
  const toggleWalking = () => {
    if (walking) {
      setWalking(false);
      return;
    }

    void startWalking();
  };

  /*
    이번 산책에서 새로 추가된 걸음만
    GameContext에 저장합니다.
  */
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