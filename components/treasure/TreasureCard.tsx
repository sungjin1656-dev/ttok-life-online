"use client";

import type { RewardItem } from "@/lib/game";


type Props = {
  item: RewardItem;
  selected: boolean;
  onSelect: () => void;
};



export default function TreasureCard({
  item,
  selected,
  onSelect,
}: Props) {


  const statusText =
    item.status === "배송 요청"
      ? "🚚 보물이 이동 중"
      : item.deliveryAvailable
      ? "✨ 꺼낼 준비 완료"
      : "🌱 꽃이 쉬고 있어요";



  return (

    <div
      className={`treasure-card ${
        selected ? "selected" : ""
      }`}

      onClick={()=>{

        if(
          item.deliveryAvailable &&
          item.status === "보관 중"
        ){

          onSelect();

        }

      }}
    >


      <div className="treasure-card-image">

        <div className="treasure-crystal">
          ✨
        </div>


        <div className="treasure-flower">
          🌸
        </div>

      </div>




      <h3>
        행운의 꽃 보물
      </h3>



      <p>
        ⭐ 일반 보물
      </p>



      <p>
        보유 {item.quantity}
      </p>




      <div
        className={
          item.status === "배송 요청"
          ? "status-moving"
          : item.deliveryAvailable
          ? "status-ready"
          : "status-rest"
        }
      >

        {statusText}

      </div>




      <button
        type="button"
        className="treasure-button"
      >

        🎁 보물 꺼내기

      </button>



    </div>

  );

}