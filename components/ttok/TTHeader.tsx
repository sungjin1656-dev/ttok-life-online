import { TTProgress } from "@/components/ttok/TTProgress";
import { TTCharacter } from "@/components/ttok/TTCharacter";
import type { CharacterId } from "@/lib/game";

type TTHeaderProps = {
  nickname: string;
  characterId: CharacterId;
  level: number;
  exp: number;
  water: number;
};

export function TTHeader({ nickname, characterId, level, exp, water }: TTHeaderProps) {
  const levelMax = 1200;
  return (
    <header className="tt-home-header">
      <div className="tt-profile-avatar">
        <TTCharacter id={characterId} size={62} />
      </div>
      <div className="tt-profile-copy">
        <span>안녕하세요!</span>
        <strong>{nickname}님</strong>
        <div className="tt-level-line">
          <b>Lv.{level}</b>
          <TTProgress value={exp} max={levelMax} compact label="레벨 경험치" />
          <small>{exp.toLocaleString()} / {levelMax.toLocaleString()}</small>
        </div>
      </div>
      <div className="tt-water-wallet">
        <span>물방울</span>
        <strong><i aria-hidden="true">💧</i>{water.toLocaleString()}</strong>
      </div>
    </header>
  );
}
