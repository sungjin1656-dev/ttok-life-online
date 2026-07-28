"use client";

import { useState } from "react";

import { Guard } from "@/components/ui/Guard";
import { TTAppShell, TTBottomNav } from "@/components/ttok";
import { useGame } from "@/context/GameContext";
import TreasureCard from "@/components/treasure/TreasureCard";



export default function StoragePage() {


  const {
    game,
    patchGame,
  } = useGame();



  const [selectedId, setSelectedId] =
    useState<string>("");



  const [showDeliveryInfo, setShowDeliveryInfo] =
    useState(false);



  const rewards =
    game.rewards ?? [];




  const selectedReward =
    rewards.find(
      (item)=>
        item.id === selectedId
    );





  const requestDelivery = () => {


    if(!selectedId){

      return;

    }



    const updatedRewards =
      rewards.map((item)=>{


        if(item.id === selectedId){

          return {

            ...item,

            status:
              "배송 요청" as const,

          };

        }


        return item;

      });



    patchGame({

      rewards:
        updatedRewards,

    });



    setShowDeliveryInfo(false);


  };





  return (

    <Guard>

      <TTAppShell>


        <main className="screen treasure-page">



          <header className="treasure-header">


            <h1 className="title">

              ✨ 내 보물창고

            </h1>


            <p>

              내가 키운 행운의 꽃이
              <br/>
              소중한 보물이 되었어요 🌱

            </p>


          </header>





          <div
            className="treasure-summary"
          >

            <div>

              🧰

            </div>


            <div>

              <span>
                보유 보물
              </span>


              <strong>
                {rewards.length}개
              </strong>


            </div>


          </div>






          {
            rewards.length === 0 ? (


              <div
                className="treasure-empty"
              >

                🌱


                <br/>


                아직 태어난 보물이 없어요.


                <br/>


                행운의 꽃을 키워보세요!


              </div>


            )


            :


            (


              <div
                className="treasure-list"
              >


                {
                  rewards.map((item)=>{


                    const selected =
                      selectedId === item.id;



                    return (

                      <TreasureCard

                        key={item.id}

                        item={item}

                        selected={selected}

                        onSelect={()=>{

                          setSelectedId(item.id);

                        }}

                      />

                    );


                  })

                }


              </div>


            )

          }





          {
            selectedId &&
            selectedReward?.status === "보관 중" && (


              <button

                className="treasure-main-button"

                onClick={()=>{

                  setShowDeliveryInfo(true);

                }}

              >

                🚚 선택한 보물 확인하기


              </button>


            )
          }
              <button

                className="treasure-main-button"

                onClick={()=>{

                  setShowDeliveryInfo(true);

                }}

              >

                🚚 선택한 보물 확인하기


              </button>


            )
          }





          {
            showDeliveryInfo &&
            selectedReward && (


              <div
                className="treasure-modal"
              >



                <div
                  className="treasure-modal-inner"
                >



                  <h2>

                    📦 보물 배송 안내

                  </h2>




                  <div
                    className="treasure-selected-item"
                  >


                    <span>

                      {selectedReward.emoji}

                    </span>


                    <strong>

                      행운의 꽃 보물

                    </strong>


                  </div>





                  <p>

                    내가 키운 행운의 꽃이

                    <br/>

                    소중한 보물이 되었어요 ✨

                  </p>





                  <div
                    className="treasure-shipping-info"
                  >

                    🎁 보물은 주문 상품과 함께 배송돼요.


                    <br/>
                    <br/>


                    TTOKTOK 배송 정책에 따라

                    <br/>

                    최소 주문금액 19,000원 이상 주문 시

                    <br/>

                    상품과 함께 받을 수 있어요.


                    <br/>
                    <br/>


                    19,000원 미만 주문 시

                    <br/>

                    배달팁이 발생할 수 있어요.


                  </div>






                  <button

                    className="treasure-main-button"

                    onClick={requestDelivery}

                  >

                    🎁 이 보물 받기


                  </button>






                  <button

                    className="treasure-sub-button"

                  >

                    🛒 상품 주문하러 가기


                  </button>




                </div>


              </div>


            )

          }





        </main>




        <TTBottomNav />



      </TTAppShell>


    </Guard>


  );


}