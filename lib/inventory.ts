export type InventoryItemCode =
  | "lucky_flower"
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
  lucky_flower: {
    itemCode: "lucky_flower",
    productName: "행운의 꽃",
    shortName: "행운의 꽃",
    emoji: "🌸",
    image:
      "/crops/lucky-pot/stage10.png",
    description:
      "행운의 화분을 완성해 받은 수확 보상입니다.",
    quantityLabel: "개",
    deliveryAvailable: false,
    unavailableMessage:
      "행운의 꽃은 포인트 보상으로 교환됩니다.",
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
