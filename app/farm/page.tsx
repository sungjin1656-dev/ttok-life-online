"use client";

import { useRouter } from "next/navigation";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import { getCrop, wateringCost } from "@/lib/crops";
import { BottomNav } from "@/components/ui/BottomNav";


export default function FarmPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();
  const crop = getCrop(game.currentCropId);
  const cost = wateringCost(crop);
  const waterings = game.cropWaterings ?? 0;
  const growth = Math.min(100, Math.round((waterings / crop.growthCount) * 100));
  const readyToHarvest = waterings >= crop.growthCount;

  const waterCrop = () => {
    if (readyToHarvest || game.water < cost) return;
    const nextWaterings = Math.min(crop.growthCount, waterings + 1);
    patchGame({
      water: game.water - cost,
      cropWaterings: nextWaterings,
      cropGrowth: Math.round((nextWaterings / crop.growthCount) * 100),
      cropName: crop.name,
      cropEmoji: crop.emoji,
    });
  };

  const harvestCrop = () => {
    if (!readyToHarvest) return;
    patchGame({
      cropGrowth: 0,
      cropWaterings: 0,
      level: game.level + 1,
      harvestedCrops: {
        ...(game.harvestedCrops ?? {}),
        [crop.id]: (game.harvestedCrops?.[crop.id] ?? 0) + 1,
      },
      rewards: [
        {
          id: `reward-${Date.now()}`,
          productName: crop.rewardName,
          emoji: crop.emoji,
          status: "보관 중",
          harvestedAt: new Date().toLocaleDateString("ko-KR"),
        },
        ...game.rewards,
      ],
    });
    router.push("/rewards");
  };

  return (
    <Guard>
      <main className="farm-v9-app">
        <div className="farm-v9-phone">
          <section className="farm-v9-content">
            <header className="farm-v9-header">
              <div className="farm-v9-title-row">
                <h1>내 농장</h1>
                <button className="farm-crop-change" type="button" onClick={() => router.push("/crops")}>작물 선택</button>
              </div>
              <div className="farm-v9-wallet" aria-label={`보유 물방울 ${game.water}`}>
                <img src="/assets/icons/droplet.png" alt="" />
                <strong>{game.water.toLocaleString()}</strong>
                <button type="button" aria-label="물방울 안내">＋</button>
              </div>
            </header>

            <section className="farm-v9-card">
              <div className="farm-crop-stage" style={{ "--crop-accent": crop.accent, "--crop-soft": crop.soft } as React.CSSProperties}>
                <div className={`farm-crop-emoji stage-${Math.min(5, Math.max(1, Math.ceil((growth || 1) / 20)))}`}>{crop.emoji}</div>
                <span className="farm-crop-ground" />
                <small>{growth < 20 ? "씨앗을 심었어요" : growth < 60 ? "쑥쑥 자라고 있어요" : growth < 100 ? "수확이 가까워요" : "수확할 준비가 됐어요!"}</small>
              </div>

              <div className="farm-v9-status">
                <div>
                  <strong>{crop.name}</strong>
                  <span>성장률 {growth}% · {waterings}/{crop.growthCount}회</span>
                </div>
                <button
                  type="button"
                  className="farm-v9-inline-action"
                  onClick={readyToHarvest ? harvestCrop : waterCrop}
                  disabled={!readyToHarvest && game.water < cost}
                  style={{
                    WebkitAppearance: "none",
                    appearance: "none",
                    background: readyToHarvest
                      ? "linear-gradient(180deg, #45c878 0%, #21a95c 100%)"
                      : "linear-gradient(180deg, #45a7ff 0%, #147ce5 100%)",
                    backgroundColor: readyToHarvest ? "#21a95c" : "#147ce5",
                    color: "#ffffff",
                    border: "0",
                  }}
                >
                  {readyToHarvest ? <>수확하기</> : game.water < cost ? <>물방울 부족</> : <><span>물주기</span><img src="/assets/icons/droplet.png" alt="" /><b>{cost}</b></>}
                </button>
              </div>

              <div className="farm-v9-progress" aria-label={`성장률 ${growth}%`}><i style={{ width: `${growth}%` }} /></div>
              <p className="farm-v9-caption">총 {crop.totalWater.toLocaleString()} 물방울 · 물주기 {crop.growthCount}회 · 보상 {crop.rewardName}</p>
            </section>
          </section>
          <BottomNav />
        </div>
      </main>
    </Guard>
  );
}
