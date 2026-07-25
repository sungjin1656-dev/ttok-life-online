"use client";

import { useRouter } from "next/navigation";

import { Guard } from "@/components/ui/Guard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGame } from "@/context/GameContext";
import { getCrop, wateringCost } from "@/lib/crops";



function getStage(growth:number){

  if(growth >= 100) return 10;
  if(growth >= 90) return 9;
  if(growth >= 80) return 8;
  if(growth >= 70) return 7;
  if(growth >= 60) return 6;
  if(growth >= 50) return 5;
  if(growth >= 40) return 4;
  if(growth >= 30) return 3;
  if(growth >= 20) return 2;

  return 1;

}



function stageText(stage:number){

  const list = [

    "씨앗을 심었어요",

    "새싹이 올라왔어요",

    "잎이 자라고 있어요",

    "당근이 조금 보이기 시작했어요",

    "당근이 자라고 있어요",

    "잎이 풍성해지고 있어요",

    "수확을 준비하고 있어요",

    "수확 직전이에요",

    "수확 준비 완료!",

    "완성된 당근이에요"

  ];


  return list[stage-1] ?? list[0];

}




// 당근 성장 이미지 매칭

function getCarrotImage(stage:number){

  const images = [

    "seed.png",

    "sprout.png",

    "leaf.png",

    "leaf_big.png",

    "growth.png",

    "carrot_root.png",

    "carrot_small.png",

    "carrot_growing.png",

    "carrot_ready.png",

    "carrot_harvest.png"

  ];


 return `/crops/carrot/${images[stage-1]}`;

}







export default function FarmPage(){


  const router = useRouter();



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

  const waterCrop = ()=>{


    if(ready)

      return;



    const next = Math.min(

      crop.growthCount,

      waterings + 1

    );



    patchGame({


      water:99999,


      cropWaterings:next,


      cropGrowth:

      Math.round(

        (next / crop.growthCount) * 100

      ),



      cropName:

      crop.name,



      cropEmoji:

      crop.emoji


    });


  };







  const harvestCrop = ()=>{


    if(!ready)

      return;



    patchGame({


      cropGrowth:0,


      cropWaterings:0,



      level:

      game.level + 1,





      harvestedCrops:{


        ...(game.harvestedCrops ?? {}),


        [crop.id]:


        (game.harvestedCrops?.[crop.id] ?? 0)+1


      },





      rewards:[


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

                onClick={()=>


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

                className={

                  `farm-v40-crop stage-${stage}`

                }

              >




                <img


                  src={getCarrotImage(stage)}


                  alt={`carrot stage ${stage}`}


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

              >


                {

                  ready

                  ?

                  "수확하기"

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

                  width:`${growth}%`

                }}

              />


            </div>









            <div className="farm-v40-stages">



              {


                Array.from(

                  {length:10},

                  (_,index)=>index+1

                )


                .map(


                  (item)=>(


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


                        src={getCarrotImage(item)}


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


              💧 물방울로 당근을 키워


              <br />


              완성 후 수확 보상을 받아보세요



            </p>





          </section>







          <BottomNav />






        </div>


      </main>


    </Guard>


  );


}
