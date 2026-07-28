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
  {
    id: "hani",
    label: "여성 모험가",
    image: "/assets/characters/girl-profile-clean.png",
  },
  {
    id: "hajun",
    label: "남성 모험가",
    image: "/assets/characters/boy-profile-clean.png",
  },
];

export default function StartPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();

  const initialChoice: CharacterId =
    game.characterId === "hajun" || game.characterId === "minjun"
      ? "hajun"
      : "hani";

  const [selected, setSelected] =
    useState<CharacterId>(initialChoice);


  const startGame = () => {
    patchGame({
      characterId: selected,
      onboardingComplete: true,
    });

    router.push("/home");
  };


  return (
    <main className="start-page-v6">

      <section
        className="start-stage"
        aria-label="TTOKTTOK LIFE 시작화면"
      >

        {/* 기존 하늘/도시/다리 제거
            배경 이미지에 모두 포함되어 있음 */}

        <section
          className="character-picker"
          aria-labelledby="character-title"
        >

          <h1 id="character-title">
            모험가를 선택해주세요
          </h1>


          <div className="character-options">

            {choices.map((choice, index) => {

              const active = selected === choice.id;

              return (
                <button
                  key={choice.id}
                  type="button"
                  className={`character-choice ${
                    active ? "selected" : ""
                  }`}
                  onClick={() =>
                    setSelected(choice.id)
                  }
                  aria-pressed={active}
                >

                  <span className="choice-number">
                    {index + 1}
                  </span>


                  <span className="choice-portrait">

                    <Image
                      src={choice.image}
                      alt=""
                      width={88}
                      height={88}
                    />

                  </span>


                  <span className="choice-label">
                    {choice.label}
                  </span>


                  <span
                    className="choice-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>


                </button>
              );

            })}

          </div>


          <button
            type="button"
            className="start-main-button"
            onClick={startGame}
          >
            마법 세계 입장하기
          </button>


        </section>

      </section>

    </main>
  );
}