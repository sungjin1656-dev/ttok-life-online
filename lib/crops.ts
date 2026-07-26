export type CropId = "carrot" | "potato" | "tomato";

export type CropDefinition = {
  id: CropId;
  name: string;
  emoji: string;
  difficulty: "쉬움" | "보통";
  totalWater: number;
  growthCount: number;
  rewardName: string;
  unlockText: string;
  unlockAfter?: CropId;
  accent: string;
  soft: string;
};

export const crops: CropDefinition[] = [
  {
    id: "carrot",
    name: "당근",
    emoji: "🥕",
    difficulty: "쉬움",
    totalWater: 300,
    growthCount: 10,
    rewardName: "당근 1kg",
    unlockText: "처음부터 선택 가능",
    accent: "#ff8b32",
    soft: "#fff1e6",
  },
  {
    id: "potato",
    name: "감자",
    emoji: "🥔",
    difficulty: "쉬움",
    totalWater: 500,
    growthCount: 8,
    rewardName: "감자 1kg",
    unlockText: "당근 1회 수확 시 해제",
    unlockAfter: "carrot",
    accent: "#c6904b",
    soft: "#fff4df",
  },
  {
    id: "tomato",
    name: "토마토",
    emoji: "🍅",
    difficulty: "보통",
    totalWater: 800,
    growthCount: 12,
    rewardName: "토마토 1kg",
    unlockText: "감자 1회 수확 시 해제",
    unlockAfter: "potato",
    accent: "#ef5350",
    soft: "#ffe9e8",
  },
];

export function getCrop(id?: string) {
  return crops.find((crop) => crop.id === id) ?? crops[0];
}

export function wateringCost(crop: CropDefinition) {
  return Math.ceil(crop.totalWater / crop.growthCount);
}
