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

export default function WalkPage() {
  const { game, addSteps, patchGame } = useGame();
  const [walking, setWalking] = useState(true);
  const [sessionSteps, setSessionSteps] = useState(game.todaySteps || 3642);
  const [seconds, setSeconds] = useState(32 * 60 + 18);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!walking) return;
    timer.current = setInterval(() => {
      setSeconds((v) => v + 1);
      setSessionSteps((v) => v + (Math.random() > 0.45 ? 1 : 0));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [walking]);

  const calories = Math.round(sessionSteps * 0.0423);
  const water = Math.floor(sessionSteps / 10);
  const characterSrc = game.characterId === "harin" ? "/assets/characters/girl-running-clean.png" : "/assets/characters/boy-running-clean.png";

  const finish = () => {
    const added = Math.max(0, sessionSteps - game.todaySteps);
    if (added > 0) addSteps(added);
    setWalking(false);
  };

  return (
    <Guard>
      <main className="walk-master-app">
        <section className="walk-master-phone">
          <div className="walk-master-stage">
            <header className="walk-master-header">
              <strong>{walking ? "산책 중..." : "산책 일시정지"}</strong>
              <button className="walk-end-button" onClick={finish}>종료</button>
            </header>

            <button
              className="walk-dev-water"
              onClick={() => patchGame({ water: game.water + 500 })}
              aria-label="테스트 물방울 500개 추가"
            >
              테스트 💧 +500
            </button>

            <div className="walk-cloud wm-cloud-one" />
            <div className="walk-cloud wm-cloud-two" />
            <div className="walk-city" />
            <div className="walk-bridge"><span /><span /><span /></div>
            <div className="walk-sea" />
            <div className="walk-ground" />
            <div className="walk-path-ribbon" />
            <div className="walk-flowers">✿　✿　✿　✿</div>

            <div className="walk-runner-wrap">
              <Image src={characterSrc} alt="산책 중인 캐릭터" width={250} height={390} priority />
            </div>
          </div>

          <section className="walk-info-panel">
            <div className="walk-step-count">
              <strong>{sessionSteps.toLocaleString()}</strong>
              <span>걸음</span>
            </div>

            <div className="walk-info-divider" />

            <div className="walk-mini-stats">
              <article>
                <span className="walk-mini-icon fire">🔥</span>
                <div><strong>{calories}</strong><small>kcal</small></div>
              </article>
              <article>
                <span className="walk-mini-icon drop">💧</span>
                <div><strong>{water}</strong><small>물방울</small></div>
              </article>
              <article>
                <span className="walk-mini-icon clock">◷</span>
                <div><strong>{timeText(seconds)}</strong><small>시간</small></div>
              </article>
            </div>
          </section>

          <section className="walk-control-panel">
            <button className={`walk-pause-button ${walking ? "" : "paused"}`} onClick={() => setWalking((v) => !v)}>
              <span>{walking ? "Ⅱ" : "▶"}</span>
            </button>
            <strong>{walking ? "일시 정지" : "다시 시작"}</strong>
          </section>

          <BottomNav />
        </section>
      </main>
    </Guard>
  );
}
