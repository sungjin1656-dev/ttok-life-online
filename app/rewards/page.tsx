"use client";

import { useState } from "react";

import { Guard } from "@/components/ui/Guard";
import { TTAppShell, TTBottomNav } from "@/components/ttok";
import { useGame } from "@/context/GameContext";
import type { RewardItem } from "@/lib/game";


const previewRewards: RewardItem[] = [

  {
    id:"preview-apple",
    productId:"apple",
    productName:"사과",
    emoji:"🍎",
    quantity:"1kg",
    status:"보관 중",
    deliveryAvailable:true,
    harvestedAt:"오늘",
  },

  {
    id:"preview-potato",
    productId:"potato",
    productName:"감자",
    emoji:"🥔",
    quantity:"1kg",
    status:"보관 중",
    deliveryAvailable:true,
    harvestedAt:"오늘",
  },

  {
    id:"preview-tomato",
    productId:"tomato",
    productName:"토마토",
    emoji:"🍅",
    quantity:"1kg",
    status:"보관 중",
    deliveryAvailable:true,
    harvestedAt:"오늘",
  },

];



export default function StoragePage(){


const {
 game,
 patchGame,
}=useGame();



const [selectedId,setSelectedId]
=
useState("");



const [showDeliveryInfo,setShowDeliveryInfo]
=
useState(false);




const rewards =
(game.rewards.length > 0
?
game.rewards
:
previewRewards
).slice(0,3);


const selectedReward =
rewards.find(
(item)=>item.id===selectedId
);



const requestDelivery = ()=>{


if(!selectedId){

return;

}



const updatedRewards =
rewards.map((item)=>{


if(item.id===selectedId){

return {

...item,

status:"배송 요청" as const,

};

}


return item;


});



patchGame({

rewards:updatedRewards,

});


setShowDeliveryInfo(false);


};



return (

<Guard>

<TTAppShell>


<main className="reward-storage-screen">


<header className="reward-header">


<button className="reward-back">

←

</button>



<div className="reward-title">


<h1>

🎁 내 보물창고

</h1>


<p>

농장에서 얻은 보물을 확인하세요

</p>


</div>



<button className="reward-help">

?

</button>



</header>











<section className="reward-grid">


{

rewards.map((item)=>{


const selected =
selectedId===item.id;



return (


<article

key={item.id}

className={
`reward-card ${
selected
?"selected"
:""
}`
}


onClick={()=>{


if(
item.deliveryAvailable &&
item.status==="보관 중"
){

setSelectedId(item.id);

}


}}


>



<div className="reward-card-icon">


{item.emoji}


</div>



<h3>

{item.productName}

보물

</h3>



<p>

{item.quantity}

</p>



<span>


{
item.status==="배송 요청"

?

"📦 배송 준비 중"

:

"🟢 배송 가능"

}


</span>



{
selected && (

<div className="reward-selected">

선택됨

</div>

)

}



</article>


);


})


}


</section>
// 배송 버튼

{
selectedId &&
selectedReward?.status==="보관 중" && (

<button

className="reward-delivery-button"

onClick={()=>{

setShowDeliveryInfo(true);

}}

>

🚚 선택한 보물 배송받기

</button>

)

}





// 배송 안내

{
showDeliveryInfo &&
selectedReward && (


<section className="reward-delivery-panel">


<h3>

📦 보물 배송 안내

</h3>



<p>

선택 상품

</p>



<strong>

{selectedReward.emoji}

{" "}

{selectedReward.productName}

</strong>




{

game.totalPurchase >= 19000

?

(


<>

<p>

✅ 무료배송 조건 충족

</p>


<p>

주문 상품과 함께
<br/>

보물을 보내드려요.

</p>



<button

className="reward-confirm-button"

onClick={requestDelivery}

>

📦 보물 배송 요청하기

</button>


</>


)

:

(

<>

<p>

현재 주문금액

<br/>

<strong>

{game.totalPurchase.toLocaleString()}원

</strong>

</p>



<p>

무료배송 기준

<br/>

<strong>

19,000원 이상

</strong>

</p>



<button

className="reward-confirm-button"

>

🛒 상품 구매 후 함께 받기

</button>



<button

className="reward-confirm-button secondary"

>

🚚 배송비 3,000원 결제하기

</button>


</>


)


}



</section>


)

}





</main>



<TTBottomNav />



</TTAppShell>



</Guard>


);


}