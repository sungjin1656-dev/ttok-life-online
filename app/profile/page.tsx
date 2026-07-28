"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import { lifeLevels } from "@/lib/lifeLevels";
import { createInviteLink } from "@/lib/inviteLink";


export default function ProfilePage() {

  const {
    game,
    resetGame,
    patchGame,
    addPurchase,
    checkAttendance,
    addInvite,
  } = useGame();


  const router = useRouter();


  const inviteLink =
    createInviteLink(game.inviteCode);



  const [
    showAttendanceMessage,
    setShowAttendanceMessage,
  ] = useState(false);



  const [
    showInviteMessage,
    setShowInviteMessage,
  ] = useState(false);



  const [
    showLinkMessage,
    setShowLinkMessage,
  ] = useState(false);




  const currentLife =
    lifeLevels.find(
      (item) =>
        item.level === game.level
    ) ?? lifeLevels[0];



  const nextLife =
    lifeLevels.find(
      (item) =>
        item.level === game.level + 1
    );



  const progress =
    nextLife
      ? Math.min(
          100,
          Math.round(
            (game.totalPurchase /
              nextLife.requiredPurchase) *
              100
          )
        )
      : 100;



  const remainPurchase =
    nextLife
      ? Math.max(
          0,
          nextLife.requiredPurchase -
            game.totalPurchase
        )
      : 0;




  const copyInviteCode = async () => {

    await navigator.clipboard.writeText(
      game.inviteCode
    );


    setShowInviteMessage(true);


    window.setTimeout(() => {

      setShowInviteMessage(false);

    },2000);

  };




  const copyInviteLink = async () => {

    await navigator.clipboard.writeText(
      inviteLink
    );


    setShowLinkMessage(true);


    window.setTimeout(() => {

      setShowLinkMessage(false);

    },2000);

  };




  return (

    <Guard>

      <section className="screen">


        <h1 className="title">
          내 정보
        </h1>




        {/* 프로필 */}

        <div
          className="game-card"
          style={{
            padding:22,
            marginTop:14,
            textAlign:"center",
          }}
        >

          <CharacterAvatar
            id={game.characterId}
            size={160}
          />


          <h2 style={{margin:0}}>
            {game.nickname}
          </h2>


          <div className="muted">
            📍 {game.region}
          </div>


          <div
            className="muted"
            style={{
              marginTop:6,
              fontWeight:700,
            }}
          >
            🌱 LV.{currentLife.level} {currentLife.name}
          </div>


        </div>





        {/* 성장 */}

        <div
          className="game-card"
          style={{
            padding:20,
            marginTop:14,
          }}
        >

          <h3>
            🌱 TTOK LIFE 성장
          </h3>


          <p>
            현재 LV
            <b>
              {" "}
              {currentLife.level} {currentLife.name}
            </b>
          </p>


          <p>
            누적 구매
            <br />

            <b>
              {game.totalPurchase.toLocaleString()}원
            </b>
          </p>



          {
            nextLife && (

              <>

                <p>
                  다음 레벨까지
                  <br />

                  <b>
                    {remainPurchase.toLocaleString()}원
                  </b>
                  남음
                </p>


                <div
                  style={{
                    height:10,
                    background:"#eee",
                    borderRadius:10,
                    overflow:"hidden",
                  }}
                >

                  <div
                    style={{
                      width:`${progress}%`,
                      height:"100%",
                      background:"#4EA3F1",
                    }}
                  />

                </div>


              </>

            )
          }



          <div
            style={{
              marginTop:14,
            }}
          >

            현재 혜택

            <br />

            💧 구매 물방울 +
            {currentLife.waterBonus}%


            <br />

            🎁 {currentLife.reward}

          </div>


        </div>






        {/* 통계 */}

        <div
          style={{
            display:"grid",
            gridTemplateColumns:"repeat(3,1fr)",
            gap:10,
            marginTop:14,
          }}
        >

          <div className="game-card">
            👟
            <b>
              {game.weeklySteps.toLocaleString()}
            </b>
            <small>
              누적 걸음
            </small>
          </div>


          <div className="game-card">
            💧
            <b>
              {game.water}
            </b>
            <small>
              물방울
            </small>
          </div>


          <div className="game-card">
            🎁
            <b>
              {game.rewards.length}
            </b>
            <small>
              수확
            </small>
          </div>


        </div>






        {/* 출석 메시지 */}

        {
          showAttendanceMessage && (

            <div
              className="game-card"
              style={{
                marginTop:14,
                padding:16,
                textAlign:"center",
              }}
            >

              <strong>
                🎉 출석 완료!
              </strong>

              <br />

              <span>
                💧 물방울 +10 획득
              </span>


              <br />

              <small>
                🔥 연속 출석 {game.attendanceCount}일
              </small>

            </div>

          )
        }







        {/* 친구 초대 */}

        <div
          className="game-card"
          style={{
            padding:20,
            marginTop:14,
            textAlign:"center",
          }}
        >

          <h3>
            👥 친구 초대
          </h3>


          <p>
            내 추천 코드
          </p>


          <div
            style={{
              fontSize:22,
              fontWeight:700,
            }}
          >
            {game.inviteCode}
          </div>



          <button
            className="game-button secondary"
            style={{
              marginTop:10,
            }}
            onClick={copyInviteCode}
          >
            📋 코드 복사
          </button>



          {
            showInviteMessage && (

              <p>
                ✅ 추천 코드가 복사됐어요
              </p>

            )
          }




          <p
            style={{
              marginTop:14,
            }}
          >
            🔗 초대 링크
          </p>


          <div
            style={{
              fontSize:14,
              wordBreak:"break-all",
            }}
          >
            {inviteLink}
          </div>



          <button
            className="game-button secondary"
            style={{
              marginTop:10,
            }}
            onClick={copyInviteLink}
          >
            🔗 초대 링크 복사
          </button>



          {
            showLinkMessage && (

              <p>
                ✅ 초대 링크가 복사됐어요
              </p>

            )
          }





          <p
            style={{
              marginTop:14,
            }}
          >
            초대한 친구

            <br />

            <b>
              {game.invitedCount}명
            </b>

          </p>


          <p>
            친구 초대 보상

            <br />

            💧 물방울 지급
          </p>

          {
  game.inviteHistory &&
  game.inviteHistory.length > 0 && (

    <div
      style={{
        marginTop:16,
        paddingTop:16,
        borderTop:"1px solid #eee",
      }}
    >

      <strong>
        📋 최근 초대 기록
      </strong>


      {
        game.inviteHistory
          .slice(-3)
          .reverse()
          .map((item) => (

            <div
              key={item.id}
              style={{
                marginTop:10,
                fontSize:14,
              }}
            >

              <div>
                📅 {item.joinedAt}
              </div>

              <div>
                💧 {item.reward.toLocaleString()} 획득
              </div>

            </div>

          ))
      }

    </div>

  )
}


        </div>







        {/* 테스트 */}

        <button
          className="game-button secondary"
          style={{
            marginTop:16,
          }}
          onClick={()=>{
            addPurchase(30000);
          }}
        >
          테스트 구매 3만원
        </button>




        <button
          className="game-button secondary"
          style={{
            marginTop:10,
          }}
          onClick={()=>{
            addInvite();
          }}
        >
          👥 친구 초대 테스트
        </button>





        <button
          className="game-button secondary"
          style={{
            marginTop:10,
          }}
          onClick={()=>{

            checkAttendance();

            setShowAttendanceMessage(true);


            window.setTimeout(()=>{

              setShowAttendanceMessage(false);

            },2500);

          }}
        >
          📅 오늘 출석하기
        </button>





        <button
          className="game-button secondary"
          style={{
            marginTop:10,
          }}
          onClick={()=>{

            patchGame({
              onboardingComplete:false,
            });


            router.push("/onboarding");

          }}
        >
          캐릭터 다시 선택
        </button>





        <button
          className="game-button secondary"
          style={{
            marginTop:10,
            color:"#EB5757",
          }}
          onClick={()=>{

            resetGame();

            router.replace("/onboarding");

          }}
        >
          게임 데이터 초기화
        </button>



      </section>


      <BottomNav />


    </Guard>

  );

}