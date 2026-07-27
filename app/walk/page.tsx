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
        ? "/assets/characters/girl-running-clean.png"
        : "/assets/characters/boy-running-clean.png"

      : isFemaleCharacter
        ? "/assets/characters/girl-standing.png"
        : "/assets/characters/boy-standing.png";




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

              <Image

                src={characterSrc}

                alt={
                  isFemaleCharacter
                    ? "산책 중인 하니"
                    : "산책 중인 캐릭터"
                }

                width={250}

                height={390}

                priority

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
                  🔥
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
                  💧
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
                  ◷
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

              <span>

                {
                  walking
                    ? "Ⅱ"
                    : "▶"
                }

              </span>


            </button>


          </section>






          <BottomNav />


        </section>


      </main>


    </Guard>
  );
}