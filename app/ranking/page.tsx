"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";

type RankingTab = "주간 랭킹" | "누적 랭킹" | "동네 4명전";

type RankingUser = {
  rank: number;
  name: string;
  steps: number;
  character: "boy" | "girl";
};

const weeklyLeaders: RankingUser[] = [
  { rank: 1, name: "김하니", steps: 58420, character: "girl" },
  { rank: 2, name: "박하니", steps: 45210, character: "boy" },
  { rank: 3, name: "최하니", steps: 42380, character: "girl" },
  { rank: 4, name: "정하니", steps: 38450, character: "girl" },
  { rank: 5, name: "이하니", steps: 34220, character: "boy" },
  { rank: 6, name: "강하니", steps: 32180, character: "girl" },
];

const totalLeaders: RankingUser[] = weeklyLeaders.map((user, index) => ({
  ...user,
  steps: user.steps * 7 + (index + 1) * 1240,
}));

function avatarPath(character: RankingUser["character"]) {
  return character === "boy"
    ? "/assets/characters/boy-profile-clean.png"
    : "/assets/characters/girl-profile-clean.png";
}

export default function RankingPage() {
  const { game } = useGame();
  const [tab, setTab] = useState<RankingTab>("주간 랭킹");
  const [region, setRegion] = useState(game.region || "명지동");

  const leaders = useMemo(() => {
    if (tab === "누적 랭킹") return totalLeaders;
    if (tab === "동네 4명전") return weeklyLeaders.slice(0, 4);
    return weeklyLeaders;
  }, [tab]);

  const mySteps = tab === "누적 랭킹"
    ? Math.max(game.weeklySteps * 7, game.todaySteps)
    : game.weeklySteps;

  return (
    <Guard>
      <main className="rank-app">
        <div className="rank-phone">
          <section className="rank-content">
            <header className="rank-header">
              <h1>우리 동네 걷기왕</h1>
              <label className="rank-region">
                <span className="sr-only">지역 선택</span>
                <select value={region} onChange={(event) => setRegion(event.target.value)}>
                  <option>명지동</option>
                  <option>에코델타</option>
                  <option>국제신도시</option>
                  <option>오션시티</option>
                </select>
              </label>
            </header>

            <div className="rank-tabs" role="tablist" aria-label="랭킹 종류">
              {(["주간 랭킹", "누적 랭킹", "동네 4명전"] as RankingTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={tab === item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <section className="rank-card" aria-label={`${tab} 순위`}>
              <div className="rank-podium">
                {leaders.slice(0, 3).map((user) => (
                  <article
                    className={`podium-user podium-${user.rank}`}
                    key={`${tab}-${user.rank}`}
                  >
                    {user.rank === 1 && <div className="rank-crown">♛</div>}
                    <div className="podium-avatar-wrap">
                      <Image
                        src={avatarPath(user.character)}
                        alt={`${user.name} 캐릭터`}
                        fill
                        sizes="100px"
                        className="podium-avatar"
                      />
                    </div>
                    <strong>{user.name}</strong>
                    <span>{user.steps.toLocaleString()} 걸음</span>
                  </article>
                ))}
              </div>

              <div className="rank-list">
                {leaders.slice(3).map((user) => (
                  <article className="rank-row" key={`${tab}-${user.rank}`}>
                    <b className="rank-number">{user.rank}</b>
                    <div className="rank-mini-avatar">
                      <Image
                        src={avatarPath(user.character)}
                        alt=""
                        fill
                        sizes="38px"
                      />
                    </div>
                    <strong>{user.name}</strong>
                    <span>{user.steps.toLocaleString()} 걸음</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="my-rank" aria-label="내 순위">
              <b className="my-rank-number">18</b>
              <div className="my-rank-avatar">
                <Image
                  src={game.characterId === "hajun" || game.characterId === "minjun"
                    ? "/assets/characters/boy-profile-clean.png"
                    : "/assets/characters/girl-profile-clean.png"}
                  alt="내 캐릭터"
                  fill
                  sizes="38px"
                />
              </div>
              <strong>{game.nickname || "똑똑이"}</strong>
              <span>{mySteps.toLocaleString()} 걸음</span>
            </section>
          </section>

          <BottomNav />
        </div>
      </main>
    </Guard>
  );
}
