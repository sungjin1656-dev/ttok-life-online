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
      (item) =>
        item.id === selectedId
    );




  const requestDelivery = () => {


    if (!selectedId) {

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

        <main className="screen">


          <h1 className="title">
            📦 내 보물창고
          </h1>





          <div
            className="game-card"
            style={{
              padding:20,
              marginTop:14,
            }}
          >

            <h3>
              내가 모은 보물
            </h3>


            <p>
              보유 보물
              <br />

              <b>
                {rewards.length}개
              </b>
            </p>


          </div>





          {
            rewards.length === 0 ? (


              <div
                className="game-card"
                style={{
                  marginTop:14,
                  padding:20,
                  textAlign:"center",
                }}
              >

                🌱

                <br />

                아직 모은 보물이 없어요.

                <br />

                농장에서 작물을 키워보세요!


              </div>


            ) : (


              rewards.map((item)=>{


                const selected =
                  selectedId === item.id;



                return (

                  <div
                    key={item.id}
                    className="game-card"
                    style={{

                      marginTop:14,

                      padding:20,

                      border:
                        selected
                        ? "2px solid #4EA3F1"
                        : undefined,

                    }}



                    onClick={()=>{


                      if(
                        item.deliveryAvailable &&
                        item.status === "보관 중"
                      ){

                        setSelectedId(item.id);

                      }


                    }}

                  >



                    <div
                      style={{
                        display:"flex",
                        justifyContent:"space-between",
                        alignItems:"center",
                      }}
                    >


                      <div>


                        <h3>

                          {item.emoji}
                          {" "}
                          {item.productName}

                        </h3>



                        <p>

                          수량:
                          {" "}
                          {item.quantity}

                        </p>



                        <p>

                          상태:
                          {" "}

                          {
                            item.status === "배송 요청"

                            ?

                            "📦 배송 요청 완료"

                            :

                            item.status

                          }

                        </p>
           <div>

                        {
                          item.status === "배송 요청"

                          ?

                          (
                            <span>
                              📦 준비 중
                            </span>
                          )

                          :

                          item.deliveryAvailable

                          ?

                          (
                            <span>
                              🟢 배송 가능
                            </span>
                          )

                          :

                          (
                            <span>
                              🟡 준비 중
                            </span>
                          )

                        }

                      </div>
                           
                           

                          :

                          item.deliveryAvailable

                          ?

                          (
                            <span>
                              🟢 배송 가능
                            </span>
                          )

                          :

                          (
                            <span>
                              🟡 준비 중
                            </span>
                          )

                        )


                      </div>


                    </div>
                                        {
                      !item.deliveryAvailable && (

                        <p
                          style={{
                            marginTop:12,
                            fontSize:14,
                          }}
                        >

                          {
                            item.unavailableMessage ??
                            "현재 배송 준비 중인 보물이에요."
                          }


                          <br />


                          {
                            item.availableDate &&
                            `배송 가능 예정: ${item.availableDate}`
                          }


                        </p>

                      )
                    }





                    {
                      item.deliveryAvailable &&
                      item.status === "보관 중" && (

                        <div
                          style={{
                            marginTop:12,
                          }}
                        >

                          {
                            selected
                            ?
                            "◉ 배송 선택됨"
                            :
                            "○ 배송 선택"
                          }


                        </div>

                      )
                    }



                  </div>

                );


              })


            )

          }





          {
            selectedId &&
            selectedReward?.status === "보관 중" && (

              <button
                className="game-button"
                style={{
                  marginTop:20,
                }}

                onClick={()=>{

                  setShowDeliveryInfo(true);

                }}

              >

                🚚 선택한 보물 배송받기

              </button>

            )
          }





          {
            showDeliveryInfo &&
            selectedReward && (

              <div
                className="game-card"
                style={{
                  marginTop:16,
                  padding:20,
                  textAlign:"center",
                }}
              >


                <h3>
                  📦 보물 배송 안내
                </h3>



                <p>

                  선택 상품

                  <br />

                  <b>
                    {selectedReward.emoji}
                    {" "}
                    {selectedReward.productName}
                  </b>

                </p>




                <p>
                  🎁 보물은 주문 상품과 함께 배송돼요.
                </p>



                <p
                  style={{
                    fontSize:14,
                  }}
                >

                  TTOKTOK 배송 정책에 따라

                  <br />

                  최소 주문금액 19,000원 이상 주문 시

                  <br />

                  상품과 함께 받을 수 있어요.

                </p>




                <p
                  style={{
                    fontSize:14,
                    marginTop:10,
                  }}
                >

                  19,000원 미만 주문 시

                  <br />

                  배달팁이 발생할 수 있어요.

                </p>




                <button
                  className="game-button"
                  style={{
                    marginTop:10,
                  }}

                  onClick={requestDelivery}

                >

                  📦 이 보물 받기 

                </button>




                <button
                  className="game-button secondary"
                  style={{
                    marginTop:10,
                  }}

                >

                  🛒 상품 주문하러 가기

                </button>



              </div>


            )

          }





        </main>


        <TTBottomNav />


      </TTAppShell>


    </Guard>

  );

}