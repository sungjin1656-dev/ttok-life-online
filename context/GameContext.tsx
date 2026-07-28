"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GameState,
  initialGameState,
} from "@/lib/game";

import {
  inviteRewards,
} from "@/lib/invite";

import {
  attendanceRewards,
} from "@/lib/attendance";

type GameContextValue = {

  game: GameState;

  ready: boolean;

  patchGame:
    (patch: Partial<GameState>) => void;

  setNickname:
    (nickname: string) => void;

  addSteps:
    (steps: number) => void;

addPurchase:
  (amount: number) => void;

checkAttendance:
  () => void;

addInvite:
  () => void;

  completeInviteReward:
  () => void;

resetGame:
  () => void;
};



const GameContext =
  createContext<GameContextValue | null>(null);



const STORAGE_KEY =
  "ttok-life-farm-preview-v12";



export function GameProvider({
  children,
}: {
  children: React.ReactNode;
}) {


  const [game, setGame] =
    useState<GameState>(initialGameState);


  const [ready, setReady] =
    useState(false);



  useEffect(() => {

    const saved =
      window.localStorage.getItem(
        STORAGE_KEY
      );


    if (saved) {

      try {

        const parsed =
          JSON.parse(saved) as Partial<GameState>;


        setGame({

          ...initialGameState,

          ...parsed,

        });


      } catch {

        window.localStorage.removeItem(
          STORAGE_KEY
        );

      }

    }


    setReady(true);


  }, []);





  useEffect(() => {

    if (!ready) {

      return;

    }


    window.localStorage.setItem(

      STORAGE_KEY,

      JSON.stringify(game)

    );


  }, [game, ready]);






  const value =
    useMemo<GameContextValue>(
      () => ({

        game,

        ready,



        patchGame:
          (patch) => {

            setGame((current) => ({

              ...current,

              ...patch,

            }));

          },




        setNickname:
          (nickname) => {

            setGame((current) => ({

              ...current,

              nickname:
                nickname.trim(),

            }));

          },





        addSteps:
          (steps) => {


            if (
              !Number.isFinite(steps)
              ||
              steps <= 0
            ) {

              return;

            }


            const normalizedSteps =
              Math.floor(steps);



            setGame((current) => {


              const nextTodaySteps =
                current.todaySteps +
                normalizedSteps;



              return {

                ...current,


                todaySteps:
                  nextTodaySteps,


                weeklySteps:
                  current.weeklySteps +
                  normalizedSteps,


                calories:
                  Math.round(
                    nextTodaySteps * 0.04
                  ),


                water:
                  current.water +
                  Math.floor(
                    normalizedSteps / 100
                  ),


                exp:
                  current.exp +
                  Math.floor(
                    normalizedSteps / 100
                  ),

              };


            });


          },





        addPurchase:
          (amount) => {


            if (
              !Number.isFinite(amount)
              ||
              amount <= 0
            ) {

              return;

            }



            setGame((current) => {


              const baseWater =
                Math.floor(
                  amount / 1000
                );



              let bonus = 0;



              if (current.level === 2) {

                bonus = 10;

              }


              if (current.level === 3) {

                bonus = 30;

              }


              if (current.level === 4) {

                bonus = 50;

              }



              const rewardWater =
                Math.floor(
                  baseWater *
                  (1 + bonus / 100)
                );



              return {

                ...current,


                totalPurchase:
                  current.totalPurchase +
                  amount,


                water:
                  current.water +
                  rewardWater,

              };


            });


          },


checkAttendance:
  () => {


    const today =
      new Date()
        .toLocaleDateString("ko-KR");



    setGame((current) => {


      // 오늘 이미 출석한 경우
      if (
        current.lastAttendanceDate === today
      ) {

        return current;

      }



      const nextAttendanceCount =
        current.attendanceCount + 1;



      const reward =
        attendanceRewards[nextAttendanceCount]
        ??
        attendanceRewards[1];



      return {

        ...current,


        lastAttendanceDate:
          today,


        attendanceCount:
          nextAttendanceCount,


        water:
          current.water + reward.water,

      };


    });


  },
addInvite:
  () => {


    setGame((current) => {


      const nextCount =
        current.invitedCount + 1;



      let reward = 0;



      if (
        inviteRewards[nextCount as keyof typeof inviteRewards]
      ) {

        reward =
          inviteRewards[
            nextCount as keyof typeof inviteRewards
          ];

      }



      return {

        ...current,


        invitedCount:
          nextCount,


        water:
          current.water + reward,

      };


    });


  },

   completeInviteReward:
  () => {


    setGame((current) => {


      if (
        !current.invitedBy
      ) {

        return current;

      }



      const inviteId =
        `invite-${Date.now()}`;



      const history = {

        id:
          inviteId,


        inviterCode:
          current.invitedBy,


        joinedAt:
          new Date()
            .toLocaleDateString("ko-KR"),


        reward:
          500,

      };



      return {

        ...current,


        water:
          current.water + 500,


        invitedResidents:
          current.invitedResidents + 1,


        invitedCount:
          current.invitedCount + 1,


        inviteHistory:
          [
            ...(current.inviteHistory ?? []),
            history,
          ],

      };


    });


  },
        resetGame:
          () => {


            window.localStorage.removeItem(
              STORAGE_KEY
            );


            setGame({
              ...initialGameState
            });


          },


      }),

      [game, ready]

    );





  return (

    <GameContext.Provider value={value}>

      {children}

    </GameContext.Provider>

  );

}





export function useGame() {


  const value =
    useContext(GameContext);



  if (!value) {

    throw new Error(
      "useGame must be used inside GameProvider"
    );

  }


  return value;


}