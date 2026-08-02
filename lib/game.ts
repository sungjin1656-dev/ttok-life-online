export type CharacterId =
  | "hani"
  | "harin"
  | "hajun"
  | "minjun";

export type InviteHistory = {
  id: string;
  inviterCode: string;
  joinedAt: string;
  reward: number;
};

export type RewardStatus =
  | "보관 중"
  | "배송 요청"
  | "배송 완료";

export type RewardSource =
  | "farm"
  | "exchange"
  | "attendance"
  | "invite"
  | "event";

export type RewardItem = {
  id: string;

  // 상품 식별자
  productId: string;

  // 상품명
  productName: string;

  // 표시 이미지 또는 이모지
  emoji: string;

  // 상품 수량
  quantity: string;

  // 보관 및 배송 상태
  status: RewardStatus;

  // 현재 배송 가능 여부
  deliveryAvailable: boolean;

  // 배송 불가 사유
  unavailableMessage?: string;

  // 배송 가능 예정일
  availableDate?: string;

  // 획득 날짜
  harvestedAt: string;

  // 상품 선택 시 사용한 포인트
  // 기존 농장 보상에는 없어도 되므로 선택값으로 유지
  pointCost?: number;

  // 상품이 추가된 경로
  // 기존 보상 데이터와 호환되도록 선택값으로 유지
  source?: RewardSource;
};

export type GameState = {
  onboardingComplete: boolean;

  characterId: CharacterId;

  nickname: string;

  region: string;

  level: number;

  totalPurchase: number;

  exp: number;

  // 산책 및 농장에 사용하는 물방울
  water: number;

  // 식물 수확 후 상품 선택에 사용하는 포인트
  points: number;

  todaySteps: number;

  weeklySteps: number;

  calories: number;

  cropName: string;

  cropEmoji: string;

  cropGrowth: number;

  rewards: RewardItem[];

  invitedResidents: number;

  // 친구 초대 시스템
  inviteCode: string;

  invitedCount: number;

  invitedBy: string;

  inviteHistory: InviteHistory[];

  currentCropId: string;

  cropWaterings: number;

  harvestedCrops: Record<string, number>;

  // 출석 시스템
  lastAttendanceDate: string;

  attendanceCount: number;
};

export const initialGameState: GameState = {
  onboardingComplete: true,

  characterId: "hani",

  nickname: "똑똑이",

  region: "명지동",

  level: 1,

  totalPurchase: 0,

  exp: 0,

  water: 10,

  // 상품 선택 화면 테스트용 초기 포인트
  // 실제 신규 회원 기본값은 나중에 0으로 변경 가능
  points: 790,

  todaySteps: 0,

  weeklySteps: 0,

  calories: 0,

  cropName: "당근",

  cropEmoji: "🥕",

  cropGrowth: 0,

  rewards: [],

  invitedResidents: 0,

  // 친구 초대 초기값
  inviteCode: "TTOK0001",

  invitedCount: 0,

  invitedBy: "",

  inviteHistory: [],

  currentCropId: "carrot",

  cropWaterings: 0,

  harvestedCrops: {},

  // 출석 초기값
  lastAttendanceDate: "",

  attendanceCount: 0,
};

export const characters = [
  {
    id: "hani",
    name: "하니",
    personality: "유쾌한 에너지",
    subtitle: "밝고 긍정적인 달리기 친구",
    theme: "#FFD862",
  },

  {
    id: "harin",
    name: "하린",
    personality: "러블리 똑순이",
    subtitle: "예쁘고 다정한 건강 친구",
    theme: "#FFB8D0",
  },

  {
    id: "hajun",
    name: "하준",
    personality: "신나는 모험가",
    subtitle: "활동적이고 유쾌한 도전 친구",
    theme: "#A5E0B7",
  },

  {
    id: "minjun",
    name: "민준",
    personality: "차분한 리더",
    subtitle: "믿음직하고 멋진 목표 친구",
    theme: "#B9DAFF",
  },
] as const;