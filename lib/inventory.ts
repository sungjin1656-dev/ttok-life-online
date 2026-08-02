export type InventoryItemCode =
  | "carrot-1kg"
  | "onion-1kg"
  | "egg-10"
  | "tomato-5kg"
  | "potato-5kg"
  | "shine-muscat"
  | "egg30"
  | "apple5"
  | "coupon5000"
  | "potato10";

export type InventoryItemMaster = {
  itemCode: string;
  productName: string;
  shortName: string;
  emoji: string;
  image?: string;
  description: string;
  quantityLabel: string;
  deliveryAvailable: boolean;
  unavailableMessage?: string;
};

const UNKNOWN_ITEM: InventoryItemMaster = {
  itemCode: "unknown",
  productName: "알 수 없는 보상",
  shortName: "보상",
  emoji: "🎁",
  description:
    "등록 정보가 없는 보상입니다.",
  quantityLabel: "개",
  deliveryAvailable: false,
  unavailableMessage:
    "상품 정보를 확인하고 있어요.",
};

export const INVENTORY_ITEM_MASTER: Record<
  string,
  InventoryItemMaster
> = {
  "carrot-1kg": {
    itemCode: "carrot-1kg",
    productName: "당근 1kg",
    shortName: "당근 1kg",
    emoji: "🥕",
    description:
      "포인트로 교환한 당근 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  "onion-1kg": {
    itemCode: "onion-1kg",
    productName: "양파 1kg",
    shortName: "양파 1kg",
    emoji: "🧅",
    description:
      "포인트로 교환한 양파 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  "egg-10": {
    itemCode: "egg-10",
    productName: "신선 계란 10구",
    shortName: "계란 10구",
    emoji: "🥚",
    description:
      "포인트로 교환한 계란 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  "tomato-5kg": {
    itemCode: "tomato-5kg",
    productName: "토마토 5kg",
    shortName: "토마토 5kg",
    emoji: "🍅",
    description:
      "포인트로 교환한 토마토 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  "potato-5kg": {
    itemCode: "potato-5kg",
    productName: "감자 5kg",
    shortName: "감자 5kg",
    emoji: "🥔",
    description:
      "포인트로 교환한 감자 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  "shine-muscat": {
    itemCode: "shine-muscat",
    productName: "샤인머스켓",
    shortName: "샤인머스켓",
    emoji: "🍇",
    description:
      "포인트로 교환한 과일 상품입니다.",
    quantityLabel: "개",
    deliveryAvailable: true,
  },

  egg30: {
    itemCode: "egg30",
    productName: "신선 계란 30구",
    shortName: "계란 30구",
    emoji: "🥚",
    description:
      "다음 주문 상품과 함께 받을 수 있는 보상입니다.",
    quantityLabel: "판",
    deliveryAvailable: true,
  },

  apple5: {
    itemCode: "apple5",
    productName: "사과 5개입",
    shortName: "사과 5개",
    emoji: "🍎",
    description:
      "다음 주문 상품과 함께 받을 수 있는 과일 보상입니다.",
    quantityLabel: "세트",
    deliveryAvailable: true,
  },

  coupon5000: {
    itemCode: "coupon5000",
    productName: "5,000원 할인쿠폰",
    shortName: "5천원 쿠폰",
    emoji: "🎟️",
    description:
      "쇼핑몰 주문 시 사용할 수 있는 할인쿠폰입니다.",
    quantityLabel: "장",
    deliveryAvailable: false,
    unavailableMessage:
      "쿠폰 자동 발급 기능은 준비 중이에요.",
  },

  potato10: {
    itemCode: "potato10",
    productName: "감자 1kg",
    shortName: "감자 1kg",
    emoji: "🥔",
    description:
      "다음 주문 상품과 함께 받을 수 있는 농산물 보상입니다.",
    quantityLabel: "봉",
    deliveryAvailable: true,
  },
};

export function normalizeInventoryItemCode(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:\-.]/g, "")
    .slice(0, 100);
}

export function getInventoryItem(
  itemCode: unknown,
): InventoryItemMaster {
  const normalizedCode =
    normalizeInventoryItemCode(
      itemCode,
    );

  const item =
    INVENTORY_ITEM_MASTER[
      normalizedCode
    ];

  if (item) {
    return item;
  }

  return {
    ...UNKNOWN_ITEM,
    itemCode:
      normalizedCode || "unknown",
  };
}

export function formatInventoryQuantity(
  itemCode: unknown,
  quantity: unknown,
): string {
  const item =
    getInventoryItem(
      itemCode,
    );

  const safeQuantity =
    typeof quantity === "number" &&
    Number.isFinite(quantity)
      ? Math.max(
          0,
          Math.floor(quantity),
        )
      : 0;

  return `${safeQuantity.toLocaleString()}${item.quantityLabel}`;
}

export function getInventoryItemCodes(): string[] {
  return Object.keys(
    INVENTORY_ITEM_MASTER,
  );
}
