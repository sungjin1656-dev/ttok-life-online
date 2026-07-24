"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/context/GameContext";
import type { CharacterId } from "@/lib/game";

const choices: Array<{
  id: CharacterId;
  label: string;
  image: string;
}> = [
  { id: "hani", label: "여자 캐릭터", image: "/assets/characters/girl-profile-clean.png" },
  { id: "hajun", label: "남자 캐릭터", image: "/assets/characters/boy-profile-clean.png" },
];

export default function StartPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();
  const initialChoice: CharacterId = game.characterId === "hajun" || game.characterId === "minjun" ? "hajun" : "hani";
  const [selected, setSelected] = useState<CharacterId>(initialChoice);

  const startGame = () => {
    patchGame({ characterId: selected, onboardingComplete: true });
    router.push("/home");
  };

  return (
    <main className="start-page-v6">
      <section className="start-stage" aria-label="TTOK LIFE 시작화면">
        <div className="start-sky" aria-hidden="true">
          <span className="start-cloud cloud-a" />
          <span className="start-cloud cloud-b" />
          <span className="start-cloud cloud-c" />
          <div className="start-city city-left"><i/><i/><i/><i/><i/></div>
          <div className="start-city city-right"><i/><i/><i/><i/></div>
          <div className="start-bridge">
            <span className="bridge-deck" />
            <span className="bridge-tower tower-left" />
            <span className="bridge-tower tower-right" />
            <span className="bridge-cable cable-one" />
            <span className="bridge-cable cable-two" />
          </div>
          <div className="start-water" />
          <div className="start-grass">
            <span className="flower f1">✿</span><span className="flower f2">✿</span>
            <span className="flower f3">✿</span><span className="flower f4">✿</span>
            <span className="flower f5">✿</span><span className="flower f6">✿</span>
          </div>
        </div>

        <header className="start-brand-block">
          <Image
            className="start-logo"
            src="/assets/brand/logo-clean.png"
            alt="TTOK LIFE"
            width={270}
            height={195}
            priority
          />
          <p className="start-slogan">걷기만 해도<br/>실제 상품을 받는 게임!</p>
        </header>

        <div className="start-runners" aria-hidden="true">
          <Image
            className="runner runner-girl"
            src="/assets/characters/girl-running-clean.png"
            alt=""
            width={175}
            height={345}
            priority
          />
          <Image
            className="runner runner-boy"
            src="/assets/characters/boy-running-clean.png"
            alt=""
            width={164}
            height={345}
            priority
          />
          <div className="runner-message">건강도 챙기고<br/>상품도 받자!</div>
        </div>

        <section className="character-picker" aria-labelledby="character-title">
          <h1 id="character-title">캐릭터를 선택해주세요</h1>
          <div className="character-options">
            {choices.map((choice, index) => {
              const active = selected === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  className={`character-choice ${active ? "selected" : ""}`}
                  onClick={() => setSelected(choice.id)}
                  aria-pressed={active}
                >
                  <span className="choice-number">{index + 1}</span>
                  <span className="choice-portrait">
                    <Image src={choice.image} alt="" width={88} height={88} />
                  </span>
                  <span className="choice-label">{choice.label}</span>
                  <span className="choice-check" aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="start-main-button" onClick={startGame}>
            시작하기
          </button>
        </section>
      </section>
    </main>
  );
}
