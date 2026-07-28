"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Guard } from "@/components/ui/Guard";
import { TTAppShell, TTBottomNav } from "@/components/ttok";
import { useGame } from "@/context/GameContext";


type InviteStatus =
  | "READY"
  | "SHARED"
  | "JOINED"
  | "REWARDED";



function profileAsset(characterId:string){

  const isBoy =
    characterId === "hajun" ||
    characterId === "minjun";


  return isBoy
    ? "/assets/characters/boy-profile-clean.png"
    : "/assets/characters/girl-profile-clean.png";

}



export default function InvitePage(){


  const {
  game,
  patchGame,
  completeInviteReward,
} = useGame();

const router = useRouter();


  const params = useParams();


  const inviteCode =
    params.code as string;



  const inviteUrl =
    `https://ttoktok.kr/invite/${inviteCode}`;



  const [
    message,
    setMessage
  ] = useState("");



  const [
    status,
    setStatus
  ] = useState<InviteStatus>("READY");



  const [
    rewarded,
    setRewarded
  ] = useState(false);





  function toast(text:string){

    setMessage(text);


    window.setTimeout(()=>{

      setMessage("");

    },2200);

  }





  async function copyInvite(){

    try{

      await navigator.clipboard.writeText(
        inviteUrl
      );


      setStatus("SHARED");


      toast(
        "초대 링크를 복사했어요."
      );


    }catch{

      toast(
        "복사 실패"
      );

    }

  }






  async function shareInvite(){

    const shareData = {

      title:
        "TTOK LIFE 주민 초대",


      text:
        `${game.nickname}님과 함께 키워보세요 🌱`,


      url:
        inviteUrl,

    };



    try{


      if(navigator.share){

        await navigator.share(
          shareData
        );

      }else{

        await navigator.clipboard.writeText(
          inviteUrl
        );

      }


      setStatus("SHARED");


      toast(
        "초대 링크를 보냈어요."
      );


    }catch{

      return;

    }

  }







  function startJoin(){


    // 추천인 저장

    patchGame({

      invitedBy:
        inviteCode,

    });



    localStorage.setItem(
      "ttok_invite_code",
      inviteCode
    );



   toast(
 `추천 코드 ${inviteCode} 저장 완료`
);

window.setTimeout(()=>{

 router.push("/onboarding");

},500);


  }







  function simulateJoinedMember(){


    if(rewarded){

      toast(
        "이미 지급 완료"
      );

      return;

    }



    setStatus("JOINED");



    setTimeout(()=>{


   completeInviteReward();


      setRewarded(true);


      setStatus("REWARDED");


      toast(
        "500 물방울 지급 완료"
      );


    },500);


  }






  const statusCopy = {

    READY:[
      "초대 전",
      "링크를 공유해주세요"
    ],


    SHARED:[
      "가입 대기",
      "친구 가입을 기다리는 중"
    ],


    JOINED:[
      "가입 확인",
      "확인 중"
    ],


    REWARDED:[
      "지급 완료",
      "500 물방울 획득"
    ],

  } as const;





return (

<Guard>

<TTAppShell>

<main className="invite-v14">


<header className="invite-v14-header">

<div>

<span>
초대한 주민이 가입하면
</span>


<h1>
500 물방울 받기
</h1>

</div>


<div className="invite-v14-wallet">

<Image
src="/assets/icons/droplet.png"
alt=""
width={18}
height={18}
/>

{game.water.toLocaleString()}

</div>


</header>





<section className="invite-v14-hero">


<div className="invite-v14-reward-number">

<Image
src="/assets/icons/droplet.png"
alt=""
width={58}
height={58}
/>


<strong>
+500
</strong>

</div>


<h2>
주민 초대하고
<br/>
500 물방울 받기
</h2>



<div className="invite-v14-people">


<div>

<span className="invite-v14-face">

<Image
src={profileAsset(game.characterId)}
alt=""
fill
/>

</span>


<b>
나
</b>


</div>


<i>
→
</i>


<div>

<span className="invite-v14-face invite-v14-friend">
?
</span>


<b>
친구
</b>

</div>


</div>


</section>





<section className={`invite-v14-status ${status.toLowerCase()}`}>

<div>

{statusCopy[status][0]}

<br/>

<strong>
{statusCopy[status][1]}
</strong>


</div>

</section>





<section className="invite-v14-code-card">

<span>
추천 코드
</span>


<strong>
{inviteCode}
</strong>


<button
onClick={copyInvite}
>
복사
</button>


</section>





<button
className="invite-v14-kakao"
onClick={shareInvite}
>

💬 카카오톡 초대하기

</button>





<button
className="invite-v14-link"
onClick={copyInvite}
>
🔗 초대 링크 복사
</button>





<button
className="game-button"
style={{
marginTop:20
}}
onClick={startJoin}
>
🌱 가입 시작하기
</button>





<section className="invite-v14-dev">

<button
onClick={simulateJoinedMember}
disabled={rewarded}
>
친구 가입 완료 테스트
</button>


</section>





{
message && (

<div className="invite-v13-toast">

{message}

</div>

)

}



</main>


<TTBottomNav />

</TTAppShell>


</Guard>

);


}