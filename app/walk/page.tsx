"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";


function timeText(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


/*
 Android → WebView Bridge 타입

 Android에서:

 window.updateSteps(123)

 형태로 전달
*/
declare global {
  interface Window {

    updateSteps?: (
      steps: number
    ) => void;


    setStartSteps?: (
      steps: number
    ) => void;


    Android?: {

      startStepSensor?: () => void;

    };

  }
}


export default function WalkPage() {

  const {
    game,
    addSteps,
  } = useGame();


  /*
    산책 상태
  */
  const [walking, setWalking] =
    useState(false);


  /*
    현재 산책 걸음수

    Android STEP_COUNTER 값을
    여기로 받을 예정
  */
  const [sessionSteps, setSessionSteps] =
    useState(
      game.todaySteps || 0
    );


  /*
    산책 시간
  */
  const [seconds, setSeconds] =
    useState(0);
const [flyFrame, setFlyFrame] = useState(1);

  /*
    오류 표시
  */
  const [sensorError, setSensorError] =
    useState("");


  /*
    타이머
  */
  const timer =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );


  /*
    Android에서 전달받은
    시작 시점 걸음수

    예:

    시작:
    4191

    현재:
    4250

    결과:
    59걸음
  */
  const startSensorSteps =
    useRef(0);


  /*
    Android Bridge 연결

    Android:
    window.updateSteps(value)

    호출하면 실행
  */
  useEffect(() => {


  window.setStartSteps =
    (steps:number)=>{

      startSensorSteps.current =
        steps;

    };



  window.updateSteps =
    (currentSteps:number)=>{

        if (!walking) {
          return;
        }


        const walkingSteps =
          Math.max(
            0,
            currentSteps -
              startSensorSteps.current
          );


        setSessionSteps(
          (game.todaySteps || 0) +
          walkingSteps
        );

      };


  return ()=>{

  delete window.updateSteps;
  delete window.setStartSteps;

};

  }, [
    walking,
    game.todaySteps
  ]);



  /*
    산책 시간 증가
  */
  useEffect(()=>{

    if(!walking){

      return;

    }


    timer.current =
      setInterval(()=>{

        setSeconds(
          value=>value + 1
        );

      },1000);



    return ()=>{

      if(timer.current){

        clearInterval(
          timer.current
        );

        timer.current=null;

      }

    };


  },[
    walking
  ]);


// 비행 프레임 애니메이션


// 여기에 추가


useEffect(()=>{

  if(!walking){
    setFlyFrame(1);
    return;
  }

  const flyTimer =
    setInterval(()=>{

      setFlyFrame(prev =>
        prev >= 4 ? 1 : prev + 1
      );

    },180);


  return ()=>{
    clearInterval(flyTimer);
  };

},[walking]);
    /*
    Android 현재 걸음값 저장

    산책 시작 순간의 센서값을 기억합니다.

    예:
    시작 4191
    현재 4201

    = 10걸음
  */



  /*
    칼로리 / 물방울 계산

    기존 게임 규칙 유지
  */
  const calories =
    Math.round(
      sessionSteps * 0.07
    );


  const water =
    Math.floor(
      sessionSteps / 10
    );



  /*
    캐릭터 확인
  */
  const characterId =
    String(
      game.characterId ?? ""
    )
      .trim()
      .toLowerCase();



  const femaleCharacterIds = [
  "harin",
  "hani",
  "girl",
  "female",
];



  const isFemaleCharacter =
    femaleCharacterIds.includes(
      characterId
    );



  const characterSrc =
  walking
    ? isFemaleCharacter
      ? `/assets/characters/flying/girl_flying_0${flyFrame}.png`
      : `/assets/characters/flying/boy_flying_0${flyFrame}.png`

    : isFemaleCharacter
      ? "/assets/characters/flying/girl_flying_idle.png"
      : "/assets/characters/flying/boy_flying_idle.png";




  /*
    산책 시작

    Android에서 실제 STEP_COUNTER를
    전달하면 여기 기준점 저장
  */
const startWalking =
  async()=>{

    setSensorError("");

    try{

      setSeconds(0);

      setWalking(true);


      if(
        typeof window.Android !== "undefined"
      ){

        window.Android.startStepSensor?.();

      }
      else {

        setSensorError(
          "Android 센서를 찾을 수 없습니다."
        );

        return;

      }


    }catch(error){

      console.error(
        "산책 시작 오류",
        error
      );


      setSensorError(
        "산책을 시작할 수 없습니다."
      );

    }

};




  /*
    시작 / 일시정지 버튼
  */
  const toggleWalking =
    ()=>{


      if(walking){

        setWalking(false);

        return;

      }


      void startWalking();


    };




  /*
    산책 종료

    이번 산책 증가분만 저장
  */
  const finish =
    ()=>{


      const added =
        Math.max(
          0,
          sessionSteps -
          (game.todaySteps || 0)
        );



      if(added > 0){

        addSteps(
          added
        );

      }



      setWalking(false);


    };
      return (
    <Guard>

      <main className="walk-master-app">

        <section className="walk-master-phone">


          <div
            className={`walk-master-stage ${
              walking
                ? "is-walking"
                : "is-paused"
            }`}
          >


            <header className="walk-master-header">

              <strong>

                {
                  walking
                    ? "산책 중..."
                    : seconds > 0
                      ? "산책 일시정지"
                      : "산책 준비"
                }

              </strong>


              <button
                className="walk-end-button"
                onClick={finish}
              >
                종료
              </button>

            </header>



            <div
 className={`walk-runner-wrap ${
 walking
 ? "is-walking"
 : "is-paused"
 }`}
>

{/* 마법진 */}
<Image
 src="/assets/effects/magic-circle.png"
 alt=""
 width={240}
 height={240}
 className="magic-circle"
/>


{/* 비행 흔적 */}
<Image
 src="/assets/effects/magic-trail.png"
 alt=""
 width={260}
 height={130}
 className="magic-trail"
/>


{/* 캐릭터 */}
<Image
 src={characterSrc}
 alt="마법 양탄자를 타고 이동하는 모험가"
 width={350}
 height={350}
  className="runner-character"
 priority
/>


{/* 별빛 */}
<Image
 src="/assets/effects/sparkle.png"
 alt=""
 width={40}
 height={40}
 className="sparkle sparkle-one"
/>

<Image
 src="/assets/effects/sparkle.png"
 alt=""
 width={32}
 height={32}
 className="sparkle sparkle-two"
/>


</div>


            


          </div>





          <section className="walk-info-panel">


            <div className="walk-step-count">

              <strong>

                {
                  sessionSteps.toLocaleString()
                }

              </strong>


              <span>
                걸음
              </span>


            </div>




            <div className="walk-info-divider" />




            <div className="walk-mini-stats">


              <article>

               <span className="walk-mini-icon fire">
  <Image
    src="/assets/icons/calorie.png"
    alt="calorie"
    width={32}
    height={32}
  />
</span>


                <div>

                  <strong>
                    {calories}
                  </strong>


                  <small>
                    kcal
                  </small>

                </div>

              </article>





              <article>

              <span className="walk-mini-icon drop">

  <Image
    src="/assets/icons/droplet.png"
    alt="droplet"
    width={32}
    height={32}
  />

</span>


                <div>

                  <strong>
                    {water}
                  </strong>


                  <small>
                    물방울
                  </small>

                </div>

              </article>





              <article>

                <span className="walk-mini-icon clock">

  <Image
    src="/assets/icons/time.png"
    alt="time"
    width={32}
    height={32}
  />

</span>


                <div>

                  <strong>
                    {timeText(seconds)}
                  </strong>


                  <small>
                    시간
                  </small>

                </div>

              </article>


            </div>




            {
              sensorError && (

                <p
                  className="walk-sensor-error"
                  role="alert"
                >

                  {sensorError}

                </p>

              )
            }


          </section>






          <section className="walk-control-panel">


  <Image
    src="/assets/effects/magic-circle.png"
    alt=""
    width={260}
    height={260}
    className="control-magic-circle"
  />

  <Image
 src="/assets/effects/sparkle.png"
 alt=""
 width={36}
 height={36}
 className="control-sparkle left"
/>


<Image
 src="/assets/effects/sparkle.png"
 alt=""
 width={36}
 height={36}
 className="control-sparkle right"
/>


  <button
              className={
                `walk-pause-button ${
                  walking
                    ? ""
                    : "paused"
                }`
              }


              onClick={toggleWalking}


              aria-label={
                walking
                  ? "산책 일시정지"
                  : "산책 시작"
              }

            >

              <div className="magic-button-icon">

{
  walking
    ? "Ⅱ"
    : "✨"
}

</div>


<div className="magic-button-text">

{
  walking
    ? "비행 중"
    : "마법 비행"
}

</div>

            </button>


          </section>






          <BottomNav />


        </section>


      </main>


    </Guard>
  );
}