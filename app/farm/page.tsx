"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import { getCrop, wateringCost } from "@/lib/crops";



function getStage(growth: number) {

  if (growth >= 100) return 10;
  if (growth >= 90) return 9;
  if (growth >= 80) return 8;
  if (growth >= 70) return 7;
  if (growth >= 60) return 6;
  if (growth >= 50) return 5;
  if (growth >= 40) return 4;
  if (growth >= 30) return 3;
  if (growth >= 20) return 2;

  return 1;

}



/*
  행운의 화분 성장 단계 문구
*/
function stageText(stage: number) {

  const list = [

    "빈 화분을 준비했어요",

    "화분에 흙을 채웠어요",

    "작은 새싹이 올라왔어요",

    "새싹의 잎이 자라고 있어요",

    "잎이 더욱 풍성해졌어요",

    "줄기가 튼튼하게 자라고 있어요",

    "꽃봉오리가 생겼어요",

    "예쁜 꽃이 피었어요",

    "행운의 꽃이 빛나고 있어요",

    "행운의 화분이 완성됐어요"

  ];


  return list[stage - 1] ?? list[0];

}



/*
  행운의 화분 이미지 매칭

  Stage 1  → stage01.png
  Stage 2  → stage02.png
  Stage 10 → stage10.png
*/
function getPotImage(stage: number) {

  const safeStage = Math.min(
    10,
    Math.max(1, stage)
  );


  const stageNumber = String(
    safeStage
  ).padStart(2, "0");


 return `/crops/lucky-pot/stage${stageNumber}.png`;

}





export default function FarmPage() {


  const router = useRouter();


  const [isWatering, setIsWatering] = useState(false);

  const [showWaterEffect, setShowWaterEffect] = useState(false);



  const {

    game,

    patchGame

  } = useGame();





  const crop = getCrop(

    game.currentCropId

  );



  const cost = wateringCost(crop);



  const waterings =

    game.cropWaterings ?? 0;



  const growth = Math.min(

    100,

    Math.round(

      (waterings / crop.growthCount) * 100

    )

  );



  const stage = getStage(growth);



  const ready =

    waterings >= crop.growthCount;





  const waterCrop = () => {


    if (ready || isWatering)

      return;



    /*
      물주기 연출 시작

      1) 하니 이미지를 watering으로 변경
      2) 물방울 3개 표시
      3) 물방울이 화분에 닿을 때 성장 처리
      4) 연출 종료 후 idle로 복귀
    */
    setIsWatering(true);

    setShowWaterEffect(true);



    const next = Math.min(

      crop.growthCount,

      waterings + 1

    );



    /*
      물방울이 화분에 닿는 타이밍에 성장 처리
    */
    window.setTimeout(() => {

      patchGame({


        water: 99999,


        cropWaterings: next,


        cropGrowth:

          Math.round(

            (next / crop.growthCount) * 100

          ),


        cropName:

          crop.name,


        cropEmoji:

          crop.emoji


      });

    }, 650);



    /*
      전체 물주기 연출 종료
    */
    window.setTimeout(() => {

      setShowWaterEffect(false);

      setIsWatering(false);

    }, 1200);


  };





  const harvestCrop = () => {


    if (!ready)

      return;



    patchGame({


      cropGrowth: 0,


      cropWaterings: 0,


      level:

        game.level + 1,



      harvestedCrops: {


        ...(game.harvestedCrops ?? {}),


        [crop.id]:

          (game.harvestedCrops?.[crop.id] ?? 0) + 1


      },



      rewards: [

        {

          id:

            `reward-${Date.now()}`,


          productName:

            crop.rewardName,


          emoji:

            crop.emoji,


          status:

            "보관 중",


          harvestedAt:

            new Date()

              .toLocaleDateString("ko-KR")

        },


        ...game.rewards

      ]

    });



    router.push("/rewards");


  };





  return (

    <Guard>


      <main className="farm-world-v40">


        <div className="farm-world-v40-phone">



          <header className="farm-v40-header">


            <div>


              <h1>

                내 농장

              </h1>


              <button

                type="button"

                onClick={() =>

                  router.push("/crops")

                }

              >

                작물 선택

              </button>


            </div>



            <div className="farm-v40-water">

              💧 {game.water.toLocaleString()}

            </div>


          </header>





          <section className="farm-v40-world">



            {/* BACKGROUND MASTER */}

            <div className="farm-background">

              <img

                src="/farm/background/farm_world_bg.png"

                className="farm-bg-world"

                alt="farm background"

              />

            </div>



            {/* MISSION */}

            <div className="farm-v40-mission">


              <strong>

                오늘의 미션

              </strong>


              <span>

                💧 물주기

              </span>


              <small>

                {waterings}/{crop.growthCount}

              </small>


            </div>





            {/* EVENT */}

            <div className="farm-v40-event">


              🎁


              <small>

                이벤트

              </small>


            </div>





            {/* CROP FIELD */}

           <div className="farm-v40-field">

  <div
    className={`farm-v40-crop stage-${stage}`}
  >

    <img
      src={getPotImage(stage)}
      alt={`lucky pot stage ${stage}`}
    />

  </div>

  {/* WATER DROP EFFECT */}

  {
    showWaterEffect && (

      <div
        className="farm-water-effect"
        aria-hidden="true"
      >

        <img
          src="/effects/water_drop01.png"
          className="farm-water-drop farm-water-drop-1"
          alt=""
        />

        <img
          src="/effects/water_drop02.png"
          className="farm-water-drop farm-water-drop-2"
          alt=""
        />

        <img
          src="/effects/water_drop03.png"
          className="farm-water-drop farm-water-drop-3"
          alt=""
        />

        <img
          src="/effects/water_drop01.png"
          className="farm-water-drop farm-water-drop-1"
          alt=""
        />

        <img
          src="/effects/water_drop02.png"
          className="farm-water-drop farm-water-drop-2"
          alt=""
        />

        <img
          src="/effects/water_drop01.png"
          className="farm-water-drop farm-water-drop-1"
          alt=""
        />

        <img
          src="/effects/water_drop02.png"
          className="farm-water-drop farm-water-drop-2"
          alt=""
        />

        <img
          src="/effects/water_drop01.png"
          className="farm-water-drop farm-water-drop-1"
          alt=""
        />

        <img
          src="/effects/water_drop02.png"
          className="farm-water-drop farm-water-drop-2"
          alt=""
        />


      </div>

    )
  }



  {/* HANI */}

  <div
    className={`farm-hani ${isWatering ? "watering" : "idle"}`}
  >

    <img
      src={
        isWatering
          ? "/character/hani_watering.png"
          : "/character/hani_idle.png"
      }
      alt={isWatering ? "물을 주는 하니" : "하니"}
    />

  </div>

</div>


          </section>





          <section className="farm-v40-panel">



            <div className="farm-v40-title">



              <div>


                <h2>

                  {crop.name}

                </h2>


                <span>

                  LV.{game.level}

                </span>


              </div>



              <button

                type="button"

                onClick={

                  ready

                    ?

                    harvestCrop

                    :

                    waterCrop

                }

                disabled={!ready && isWatering}

              >


                {

                  ready

                    ?

                    "수확하기"

                    :

                    isWatering

                      ?

                      "물을 주는 중..."

                      :

                      <>

                        💧 물주기 {cost}

                      </>

                }


              </button>


            </div>





            <div className="farm-v40-growth">


              성장률 {growth}%


              ·


              {waterings}/{crop.growthCount}


            </div>





            <div className="farm-v40-progress">


              <i

                style={{

                  width: `${growth}%`

                }}

              />


            </div>





            <div className="farm-v40-stages">


              {

                Array.from(

                  { length: 10 },

                  (_, index) => index + 1

                )

                  .map(

                    (item) => (

                      <div

                        key={item}

                        className={

                          stage >= item

                            ?

                            "active"

                            :

                            ""

                        }

                      >


                        <img

                          src={getPotImage(item)}

                          alt={`stage ${item}`}

                        />


                        <small>

                          {item * 10}%

                        </small>


                      </div>

                    )

                  )

              }


            </div>





            <p className="farm-v40-info">


              💧 물방울로 행운의 화분을 키워


              <br />


              완성 후 수확 보상을 받아보세요


            </p>



          </section>





          {/* WATER EFFECT STYLE */}

          <style>{`

            /*
              물방울 효과 위치

              left: 화분 기준 좌우 위치
              bottom: 화분 기준 높이
            */
            .farm-water-effect {

              position: absolute;

              left: 50%;

              bottom: 105px;

              width: 150px;

              height: 150px;

              transform: translateX(-50%);

              z-index: 70;

              pointer-events: none;

              overflow: visible;

            }



            .farm-water-drop {

              position: absolute;

              left: 50%;

              top: 0;

              width: 26px;

              height: 26px;

              object-fit: contain;

              opacity: 0;

              will-change: transform, opacity;

              animation-name: farm-water-drop-fall;

              animation-duration: 0.8s;

              animation-timing-function: ease-in;

              animation-fill-mode: forwards;

            }



            .farm-water-drop-1 {

              margin-left: -52px;

              animation-delay: 0s;

            }



            .farm-water-drop-2 {

              margin-left: -20px;

              animation-delay: 0.14s;

            }



            .farm-water-drop-3 {

              margin-left: 12px;

              animation-delay: 0.28s;

            }



            @keyframes farm-water-drop-fall {

              0% {

                opacity: 0;

                transform:

                  translate(-38px, -42px)

                  scale(0.72)

                  rotate(-8deg);

              }



              18% {

                opacity: 1;

              }



              82% {

                opacity: 1;

              }



              100% {

                opacity: 0;

                transform:

                  translate(18px, 88px)

                  scale(1)

                  rotate(5deg);

              }

            }



            /*
              물주는 동안 하니 이미지 전환을 부드럽게 표시
            */
            .farm-hani.watering img {

              animation:

                farm-hani-watering-motion

                0.55s

                ease-in-out

                infinite

                alternate;

            }



            @keyframes farm-hani-watering-motion {

              from {

                transform:

                  translateY(0)

                  rotate(0deg);

              }



              to {

                transform:

                  translateY(2px)

                  rotate(-1deg);

              }

            }



            /*
              물주는 동안 버튼 시각 처리
            */
            .farm-v40-title button:disabled {

              cursor: default;

              opacity: 0.72;

            }

          `}</style>



          <BottomNav />



        </div>


      </main>


    </Guard>

  );

}