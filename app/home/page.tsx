"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Guard } from "@/components/ui/Guard";
import { TTAppShell, TTBottomNav } from "@/components/ttok";
import { useGame } from "@/context/GameContext";

const DAILY_GOAL = 10000;
const LEVEL_MAX = 1200;

function assetForCharacter(characterId: string, kind: "profile" | "running") {
  const isBoy = characterId === "hajun" || characterId === "minjun";
  if (kind === "profile") {
    return isBoy ? "/assets/characters/boy-profile-clean.png" : "/assets/characters/girl-profile-clean.png";
  }
  return isBoy ? "/assets/characters/boy-running-clean.png" : "/assets/characters/girl-running-clean.png";
}

export default function HomePage() {
  const router = useRouter();
  const { game } = useGame();

  const stepPercent = Math.min(100, Math.round((game.todaySteps / DAILY_GOAL) * 100));
  const earnedWater = Math.floor(game.todaySteps / 10);
  const gainedExp = Math.floor(game.todaySteps / 10);
  const walkMissionDone = game.todaySteps >= 5000;
  const waterMissionDone = game.cropGrowth >= 30;
  const missionDoneCount = [walkMissionDone, waterMissionDone, true].filter(Boolean).length;

  return (
    <Guard>
      <TTAppShell>
        <main className="home-v8">
          <header className="home-v8-header">
            <div className="home-v8-avatar">
              <Image
                src={assetForCharacter(game.characterId, "profile")}
                alt="선택한 캐릭터"
                fill
                sizes="54px"
                priority
              />
            </div>

            <div className="home-v8-profile">
              <span>안녕하세요!</span>
              <strong>{game.nickname}님</strong>
              <div className="home-v8-level-row">
                <b>Lv.{game.level}</b>
                <div className="home-v8-level-track" aria-label="레벨 경험치">
                  <i style={{ width: `${Math.min(100, (game.exp / LEVEL_MAX) * 100)}%` }} />
                </div>
                <small>{game.exp.toLocaleString()} / {LEVEL_MAX.toLocaleString()}</small>
              </div>
            </div>

            <div className="home-v8-wallet">
              <span>물방울</span>
              <strong>
                <Image src="/assets/icons/droplet.png" alt="" width={21} height={21} />
                {game.water.toLocaleString()}
              </strong>
            </div>
          </header>

          <section className="home-v8-steps-card">
            <div className="home-v8-steps-copy">
              <h1>오늘의 걸음</h1>
              <div className="home-v8-step-value">
                <strong>{game.todaySteps.toLocaleString()}</strong>
                <span>걸음</span>
              </div>
              <div className="home-v8-step-progress-row">
                <div className="home-v8-step-track">
                  <i style={{ width: `${stepPercent}%` }} />
                </div>
                <b>{stepPercent}%</b>
              </div>
              <div className="home-v8-step-goal">목표 {DAILY_GOAL.toLocaleString()} 걸음</div>
            </div>

            <div className="home-v8-runner">
              <Image
                src={assetForCharacter(game.characterId, "running")}
                alt="달리는 캐릭터"
                fill
                sizes="175px"
                priority
              />
            </div>

            <div className="home-v8-stats">
              <article>
                <Image src="/assets/icons/calorie.png" alt="칼로리" width={25} height={25} />
                <div><span>칼로리</span><strong>{game.calories.toLocaleString()} kcal</strong></div>
              </article>
              <article>
                <Image src="/assets/icons/droplet.png" alt="물방울" width={25} height={25} />
                <div><span>획득 물방울</span><strong>{earnedWater.toLocaleString()}</strong></div>
              </article>
              <article>
                <Image src="/assets/icons/xp.png" alt="경험치" width={25} height={25} />
                <div><span>경험치</span><strong>+{gainedExp.toLocaleString()}</strong></div>
              </article>
            </div>
          </section>

          <section className="home-v8-lower-grid">
            <article className="home-v8-missions">
              <div className="home-v8-card-title">
                <h2>오늘의 미션</h2>
                <span>{missionDoneCount}/3</span>
              </div>

              <button type="button" onClick={() => router.push("/walk")}>
                <i className={walkMissionDone ? "done" : ""}>{walkMissionDone ? "✓" : "•"}</i>
                <span>산책으로 5,000걸음 걷기</span>
                <b>{walkMissionDone ? "완료" : `${Math.min(game.todaySteps, 5000).toLocaleString()}/5,000`}</b>
                <em>›</em>
              </button>

              <button type="button" onClick={() => router.push("/farm")}>
                <i className={waterMissionDone ? "done" : ""}>{waterMissionDone ? "✓" : "•"}</i>
                <span>물주기 1회 하기</span>
                <b>{waterMissionDone ? "완료" : "0/1"}</b>
                <em>›</em>
              </button>

              <button type="button">
                <i className="done">✓</i>
                <span>출석하기</span>
                <b>완료</b>
                <em>›</em>
              </button>
            </article>

            <article className="home-v8-farm-card">
              <div className="home-v8-card-title">
                <h2>내 작물</h2>
                <button type="button" onClick={() => router.push("/farm")}>농장으로 ›</button>
              </div>

              <button className="home-v8-farm-visual" type="button" onClick={() => router.push("/farm")} aria-label="농장으로 이동">
                <span className="cloud cloud-a" />
                <span className="cloud cloud-b" />
                <span className="home-v8-tree" aria-hidden="true">
                  <i className="leaf l1" /><i className="leaf l2" /><i className="leaf l3" />
                  <i className="apple a1" /><i className="apple a2" /><i className="apple a3" /><i className="apple a4" /><i className="apple a5" />
                  <i className="trunk" />
                </span>
              </button>

              <div className="home-v8-farm-info">
                <span>농작물</span>
                <strong>{game.cropGrowth}%</strong>
              </div>
              <div className="home-v8-farm-track"><i style={{ width: `${game.cropGrowth}%` }} /></div>
              <button className="home-v8-farm-button" type="button" onClick={() => router.push("/farm")}>농장으로 가기</button>
            </article>
          </section>

          <button className="home-v8-invite-card" type="button" onClick={() => router.push("/invite")}>
            <div className="home-v8-invite-reward">
              <span>주민 초대하고</span>
              <strong><em>+500</em> 물방울 받기</strong>
              <small>친구가 회원가입을 완료하면 지급돼요</small>
            </div>
            <b aria-hidden="true"><Image src="/assets/icons/droplet.png" alt="" width={31} height={31} /></b>
          </button>
        </main>

        <TTBottomNav />
      </TTAppShell>
    </Guard>
  );
}
