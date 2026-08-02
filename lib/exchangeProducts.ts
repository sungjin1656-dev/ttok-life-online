export type ExchangeCategory =
  | "전체"
  | "채소"
  | "과일"
  | "계란"
  | "유제품"
  | "음료";

export type ExchangeProduct = {
  id: string;
  name: string;
  category: Exclude<ExchangeCategory, "전체">;
  emoji: string;
  quantity: string;
  pointCost: number;
  description: string;
  deliveryNote: string;
  isAvailable: boolean;
};

export const exchangeCategories: ExchangeCategory[] = [
  "전체",
  "채소",
  "과일",
  "계란",
  "유제품",
  "음료",
];

export const exchangeProducts: ExchangeProduct[] = [
  {
    id: "carrot-1kg",
    name: "당근 1kg",
    category: "채소",
    emoji: "🥕",
    quantity: "1kg",
    pointCost: 500,
    description: "매일 식탁에 활용하기 좋은 신선한 당근이에요.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
  {
    id: "onion-1kg",
    name: "양파 1kg",
    category: "채소",
    emoji: "🧅",
    quantity: "1kg",
    pointCost: 700,
    description: "다양한 요리에 편하게 사용할 수 있는 양파예요.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
  {
    id: "egg-10",
    name: "신선 계란 10구",
    category: "계란",
    emoji: "🥚",
    quantity: "10구",
    pointCost: 1000,
    description: "간편한 한 끼와 반찬에 활용하기 좋은 계란이에요.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
  {
    id: "tomato-5kg",
    name: "토마토 5kg",
    category: "채소",
    emoji: "🍅",
    quantity: "5kg",
    pointCost: 1500,
    description: "온 가족이 넉넉하게 즐길 수 있는 토마토 구성입니다.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
  {
    id: "potato-5kg",
    name: "감자 5kg",
    category: "채소",
    emoji: "🥔",
    quantity: "5kg",
    pointCost: 2000,
    description: "구이, 찜, 국물 요리에 두루 활용하기 좋은 감자예요.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
  {
    id: "shine-muscat",
    name: "샤인머스켓",
    category: "과일",
    emoji: "🍇",
    quantity: "1박스",
    pointCost: 4000,
    description: "특별한 날을 더욱 달콤하게 만들어 줄 과일 보상이에요.",
    deliveryNote: "다음 상품 주문 시 함께 배송",
    isAvailable: true,
  },
];
