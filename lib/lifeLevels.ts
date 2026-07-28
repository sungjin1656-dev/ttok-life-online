export type LifeLevel = {
  level: number;
  name: string;

  // 누적 구매 금액 기준
  requiredPurchase: number;

  // 다음 해금 콘텐츠
  unlock: "easy" | "normal" | "hard" | "legend";

  // 사용자에게 보여줄 혜택
  reward: string;

  // 구매 시 추가 물방울 보너스 %
  waterBonus: number;

  // 적립률
  pointRate: number;
};


export const lifeLevels: LifeLevel[] = [

  {
    level: 1,
    name: "새싹",

    requiredPurchase: 0,

    unlock: "easy",

    reward:
      "EASY 작물을 키울 수 있어요",

    waterBonus: 0,

    pointRate: 1,
  },


  {
    level: 2,
    name: "성장",

    requiredPurchase: 100000,

    unlock: "normal",

    reward:
      "NORMAL 작물과 물방울 추가 혜택을 받을 수 있어요",

    waterBonus: 10,

    pointRate: 1.5,
  },


  {
    level: 3,
    name: "프리미엄",

    requiredPurchase: 300000,

    unlock: "hard",

    reward:
      "HARD 작물과 특별 성장 혜택을 받을 수 있어요",

    waterBonus: 30,

    pointRate: 2,
  },


  {
    level: 4,
    name: "전설",

    requiredPurchase: 1000000,

    unlock: "legend",

    reward:
      "LEGEND 전설 보상에 도전할 수 있어요",

    waterBonus: 50,

    pointRate: 3,
  },

];