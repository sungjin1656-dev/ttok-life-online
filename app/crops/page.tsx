"use client";

import { useRouter } from "next/navigation";
import { Guard } from "@/components/ui/Guard";
import { useGame } from "@/context/GameContext";
import { crops } from "@/lib/crops";

export default function CropSelectPage() {
  const router = useRouter();
  const { game, patchGame } = useGame();

  const isUnlocked = (id: string, unlockAfter?: string) => {
    if (!unlockAfter) return true;
    return (game.harvestedCrops?.[unlockAfter] ?? 0) > 0;
  };

  const selectCrop = (crop: (typeof crops)[number]) => {
    if (!isUnlocked(crop.id, crop.unlockAfter)) return;
    const changing = game.currentCropId !== crop.id;
    patchGame({
      currentCropId: crop.id,
      cropName: crop.name,
      cropEmoji: crop.emoji,
      ...(changing ? { cropGrowth: 0, cropWaterings: 0 } : {}),
    });
    router.push("/farm");
  };

  return (
    <Guard>
      <main className="crop-select-app">
        <div className="crop-select-phone">
          <header className="crop-select-header">
            <button type="button" onClick={() => router.back()} aria-label="뒤로가기">‹</button>
            <div><span>내 농장</span><h1>키울 작물을 선택해요</h1></div>
            <div className="crop-select-wallet">💧 {game.water.toLocaleString()}</div>
          </header>

          <section className="crop-select-guide">
            <strong>쉬운 작물부터 차근차근!</strong>
            <span>앞 작물을 수확하면 다음 작물이 열려요.</span>
          </section>

          <section className="crop-select-list">
            {crops.map((crop, index) => {
              const unlocked = isUnlocked(crop.id, crop.unlockAfter);
              const selected = game.currentCropId === crop.id;
              return (
                <button
                  type="button"
                  key={crop.id}
                  className={`crop-select-card ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}`}
                  onClick={() => selectCrop(crop)}
                  style={{ "--crop-accent": crop.accent, "--crop-soft": crop.soft } as React.CSSProperties}
                >
                  <span className="crop-select-order">{index + 1}</span>
                  <span className="crop-select-emoji">{crop.emoji}</span>
                  <div className="crop-select-copy">
                    <div className="crop-select-title-row">
                      <strong>{crop.name}</strong>
                      <em>{crop.difficulty}</em>
                      {selected && <b>선택 중</b>}
                    </div>
                    <p>총 💧 {crop.totalWater.toLocaleString()} · 물주기 {crop.growthCount}회</p>
                    <small>수확 보상 · {crop.rewardName}</small>
                    <span className="crop-select-unlock">{unlocked ? crop.unlockText : `🔒 ${crop.unlockText}`}</span>
                  </div>
                  <i>{unlocked ? "›" : "🔒"}</i>
                </button>
              );
            })}
          </section>

          <p className="crop-select-note">작물 변경 시 현재 성장 진행도는 초기화됩니다.</p>
        </div>
      </main>
    </Guard>
  );
}
