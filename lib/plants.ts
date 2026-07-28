export type PlantDifficulty =
  | "easy"
  | "normal"
  | "hard"
  | "legend";


export type Plant = {
  id: string;

  name: string;

  emoji: string;

  difficulty: PlantDifficulty;

  // TTOK LIFE 레벨 해금 조건
  requiredLevel: number;

  // 성장에 필요한 물방울 기준
  requiredWater: number;

  // 수확 보상
  reward: string;

  // 예상 성장 기간
  days: string;
};


export const plants: Plant[] = [

  {
    id: "carrot",

    name: "당근",

    emoji: "🥕",

    difficulty: "easy",

    requiredLevel: 1,

    requiredWater: 300,

    reward: "당근 1kg",

    days: "3~5일",
  },


  {
    id: "potato",

    name: "감자",

    emoji: "🥔",

    difficulty: "normal",

    requiredLevel: 2,

    requiredWater: 1200,

    reward: "감자 5kg",

    days: "10~15일",
  },


  {
    id: "premium",

    name: "프리미엄 농산물",

    emoji: "🍎",

    difficulty: "hard",

    requiredLevel: 3,

    requiredWater: 3000,

    reward: "프리미엄 과일 세트",

    days: "25~35일",
  },


  {
    id: "legend",

    name: "전설 보상",

    emoji: "👑",

    difficulty: "legend",

    requiredLevel: 4,

    requiredWater: 7000,

    reward: "코스트코 프리미엄 스테이크 세트",

    days: "60일+",
  },

];