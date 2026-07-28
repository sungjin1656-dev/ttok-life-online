"use client";

import { useRouter } from "next/navigation";

import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import { plants } from "@/lib/plants";


export default function CropSelectPage() {

  const router = useRouter();

  const {
    game,
    patchGame,
  } = useGame();


  const isUnlocked = (requiredLevel: number) => {

    return game.level >= requiredLevel;

  };


  const selectCrop = (
    plant: (typeof plants)[number]
  ) => {


    const unlocked =
      isUnlocked(plant.requiredLevel);


    if (!unlocked) {
      return;
    }


    const changing =
      game.currentCropId !== plant.id;


    patchGame({

      currentCropId: plant.id,

      cropName: plant.name,

      cropEmoji: plant.emoji,


      ...(changing
        ? {
            cropGrowth: 0,
            cropWaterings: 0,
          }
        : {})

    });


    router.push("/farm");

  };



  return (

    <Guard>

      <main className="crop-select-app">

        <div className="crop-select-phone">


          <header className="crop-select-header">


            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로가기"
            >
              ‹
            </button>


            <div>

              <span>
                내 농장
              </span>

              <h1>
                키울 작물을 선택해요
              </h1>

            </div>


            <div className="crop-select-wallet">

              💧 {game.water.toLocaleString()}

            </div>


          </header>




          <section className="crop-select-guide">

            <strong>
              성장 단계에 따라 새로운 작물이 열려요!
            </strong>

            <span>
              TTOK LIFE 레벨이 올라갈수록 더 좋은 보상을 받을 수 있어요.
            </span>

          </section>




          <section className="crop-select-list">


            {
              plants.map((plant, index) => {


                const unlocked =
                  isUnlocked(
                    plant.requiredLevel
                  );


                const selected =
                  game.currentCropId === plant.id;



                return (

                  <button

                    type="button"

                    key={plant.id}

                    className={
                      `
                      crop-select-card
                      ${selected ? "selected" : ""}
                      ${unlocked ? "" : "locked"}
                      `
                    }


                    onClick={() =>
                      selectCrop(plant)
                    }

                  >


                    <span className="crop-select-order">

                      {index + 1}

                    </span>



                    <span className="crop-select-emoji">

                      {plant.emoji}

                    </span>




                    <div className="crop-select-copy">


                      <div className="crop-select-title-row">


                        <strong>

                          {plant.name}

                        </strong>


                        <em>

                          {plant.difficulty}

                        </em>



                        {
                          selected &&
                          unlocked &&
                          (
                            <b>
                              선택 중
                            </b>
                          )
                        }


                      </div>




                      <p>

                        필요 LV.
                        {plant.requiredLevel}

                        {" · "}

                        💧
                        {plant.requiredWater.toLocaleString()}

                      </p>



                      <small>

                        수확 보상 · {plant.reward}

                      </small>




                      <span className="crop-select-unlock">


                        {
                          unlocked

                            ?

                            "선택 가능"

                            :

                            `🔒 LV.${plant.requiredLevel} 필요`

                        }


                      </span>


                    </div>




                    <i>

                      {
                        unlocked
                          ? "›"
                          : "🔒"
                      }

                    </i>


                  </button>

                );

              })

            }


          </section>




          <p className="crop-select-note">

            작물 변경 시 현재 성장 진행도는 초기화됩니다.

          </p>



        </div>


      </main>


    </Guard>

  );

}