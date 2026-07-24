"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import type { CharacterId } from "@/lib/game";

const characters: Array<{id: CharacterId; number: number; label: string; image: string}> = [
  { id: "hani", number: 1, label: "여자 캐릭터", image: "/assets/characters/girl-profile.png" },
  { id: "hajun", number: 2, label: "남자 캐릭터", image: "/assets/characters/boy-profile.png" },
];

export default function OnboardingPage() {
  const { game, patchGame } = useGame();
  const router = useRouter();
  const [characterId, setCharacterId] = useState<CharacterId>(game.characterId === "hajun" ? "hajun" : "hani");

  const startGame = () => {
    patchGame({ characterId, onboardingComplete: true });
    router.push("/home");
  };

  return (
    <main className="start-v4" aria-label="TTOK LIFE 시작화면">
      <div className="start-v4-phone">
        <div className="start-v4-sky" aria-hidden="true">
          <i className="v4-cloud c1"/><i className="v4-cloud c2"/><i className="v4-cloud c3"/>
          <div className="v4-city city-left"/><div className="v4-city city-right"/>
          <div className="v4-bridge"><i/><i/><i/></div>
        </div>

        <header className="v4-header">
          <div className="v4-logo"><b>TTOK</b><strong>LIFE</strong><em>◆</em></div>
          <p>걷기만 해도<br/>실제 상품을 받는 게임!</p>
        </header>

        <section className="v4-hero" aria-label="달리는 캐릭터">
          <img className="v4-runner girl" src="/assets/characters/girl-running.png" alt="달리는 여자 캐릭터" />
          <img className="v4-runner boy" src="/assets/characters/boy-running.png" alt="달리는 남자 캐릭터" />
          <div className="v4-bubble">건강도 챙기고<br/>상품도 받자!</div>
          <span className="v4-flower f1">✿</span><span className="v4-flower f2">✿</span><span className="v4-flower f3">✿</span>
        </section>

        <section className="v4-panel">
          <h1>캐릭터를 선택해주세요</h1>
          <div className="v4-options">
            {characters.map((character) => {
              const selected = character.id === characterId;
              return (
                <button key={character.id} type="button" className={`v4-option ${selected ? "selected" : ""}`} onClick={() => setCharacterId(character.id)} aria-pressed={selected}>
                  <span className="v4-num">{character.number}</span>
                  {selected && <span className="v4-check">✓</span>}
                  <span className="v4-portrait"><img src={character.image} alt="" /></span>
                  <b>{character.label}</b>
                </button>
              );
            })}
          </div>
          <button type="button" className="v4-start" onClick={startGame}>시작하기</button>
          <small className="v4-build">START V4</small>
        </section>
      </div>
    </main>
  );
}
