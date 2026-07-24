export type CharacterId = "hani" | "harin" | "hajun" | "minjun";

export type RewardItem = {
  id: string;
  productName: string;
  emoji: string;
  status: "보관 중" | "배송 예정" | "사용 완료";
  harvestedAt: string;
};

export type GameState = {
  onboardingComplete: boolean;
  characterId: CharacterId;
  nickname: string;
  region: string;
  level: number;
  exp: number;
  water: number;
  todaySteps: number;
  weeklySteps: number;
  calories: number;
  cropName: string;
  cropEmoji: string;
  cropGrowth: number;
  rewards: RewardItem[];
  invitedResidents: number;
  currentCropId: "carrot" | "potato" | "tomato";
  cropWaterings: number;
  harvestedCrops: Record<string, number>;
};

export const initialGameState: GameState = {
  onboardingComplete: true,
  characterId: "hani",
  nickname: "똑똑이",
  region: "명지동",
  level: 1,
  exp: 0,
  water: 1000,
  todaySteps: 0,
  weeklySteps: 0,
  calories: 0,
  cropName: "당근",
  cropEmoji: "🥕",
  cropGrowth: 0,
  rewards: [],
  invitedResidents: 0,
  currentCropId: "carrot",
  cropWaterings: 0,
  harvestedCrops: {},
};

export const characters = [
  { id: "hani", name: "하니", personality: "유쾌한 에너지", subtitle: "밝고 긍정적인 달리기 친구", theme: "#FFD862" },
  { id: "harin", name: "하린", personality: "러블리 똑순이", subtitle: "예쁘고 다정한 건강 친구", theme: "#FFB8D0" },
  { id: "hajun", name: "하준", personality: "신나는 모험가", subtitle: "활동적이고 유쾌한 도전 친구", theme: "#A5E0B7" },
  { id: "minjun", name: "민준", personality: "차분한 리더", subtitle: "믿음직하고 멋진 목표 친구", theme: "#B9DAFF" },
] as const;
