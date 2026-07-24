import { CharacterId } from "@/lib/game";

const configs: Record<CharacterId, { hair:string; shirt:string; accent:string; skin:string; cheek:string }> = {
  hani:{hair:"#281B1A",shirt:"#FFD84E",accent:"#267AD8",skin:"#FFD9C1",cheek:"#FFADB7"},
  harin:{hair:"#6D4231",shirt:"#FF9FC2",accent:"#FFFFFF",skin:"#FFD9C1",cheek:"#FFADB7"},
  hajun:{hair:"#34251E",shirt:"#72C979",accent:"#F6FBFF",skin:"#FFD1B3",cheek:"#FFA8A8"},
  minjun:{hair:"#172D4D",shirt:"#4EA3F1",accent:"#EAF5FF",skin:"#FFD1B3",cheek:"#FFA8A8"},
};

export function CharacterAvatar({ id, size=150, running=false }:{ id:CharacterId; size?:number; running?:boolean }) {
  const c=configs[id];
  return (
    <svg width={size} height={size*1.15} viewBox="0 0 150 175" role="img" aria-label="선택한 캐릭터">
      <g className={running ? "run-character" : "idle-character"}>
        <ellipse cx="75" cy="164" rx="42" ry="8" fill="rgba(26,77,119,.14)"/>
        <path d="M47 101 Q48 76 75 76 Q103 76 104 101 L105 146 L46 146 Z" fill={c.shirt}/>
        <path d="M59 100 H92 V133 Q75 144 59 133 Z" fill={c.accent} opacity=".94"/>
        <circle cx="75" cy="53" r="34" fill={c.skin}/>
        <path d="M40 55 Q42 14 76 13 Q110 13 113 51 Q99 43 91 25 Q73 47 40 55" fill={c.hair}/>
        <path d="M45 48 Q37 72 52 90 Q39 89 34 82 Q42 66 45 48" fill={c.hair}/>
        <path d="M108 47 Q119 70 102 91 Q117 88 121 80 Q114 63 108 47" fill={c.hair}/>
        <circle cx="63" cy="57" r="3.5" fill="#26374A"/><circle cx="88" cy="57" r="3.5" fill="#26374A"/>
        <path d="M57 66 Q75 84 93 66" fill="none" stroke="#BE5661" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="52" cy="68" r="5" fill={c.cheek} opacity=".65"/><circle cx="99" cy="68" r="5" fill={c.cheek} opacity=".65"/>
        <path d={running?"M56 96 L34 120":"M56 96 L41 117"} stroke={c.skin} strokeWidth="10" strokeLinecap="round"/>
        <path d={running?"M95 96 L117 111":"M95 96 L110 117"} stroke={c.skin} strokeWidth="10" strokeLinecap="round"/>
        <path d={running?"M62 145 L49 166":"M62 145 L59 165"} stroke={c.accent} strokeWidth="13" strokeLinecap="round"/>
        <path d={running?"M89 145 L104 164":"M89 145 L93 165"} stroke={c.accent} strokeWidth="13" strokeLinecap="round"/>
        <path d="M44 167 H59" stroke="#FFF" strokeWidth="8" strokeLinecap="round"/><path d="M98 167 H113" stroke="#FFF" strokeWidth="8" strokeLinecap="round"/>
      </g>
      <style>{`
        .idle-character{transform-origin:75px 120px;animation:idle 1.8s ease-in-out infinite}
        .run-character{transform-origin:75px 120px;animation:run .42s ease-in-out infinite alternate}
        @keyframes idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes run{from{transform:translateY(0) rotate(-1.5deg)}to{transform:translateY(-7px) rotate(1.5deg)}}
      `}</style>
    </svg>
  );
}
