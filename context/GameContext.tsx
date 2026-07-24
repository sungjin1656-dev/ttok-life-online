"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GameState, initialGameState } from "@/lib/game";

type GameContextValue = {
  game: GameState;
  ready: boolean;
  patchGame: (patch: Partial<GameState>) => void;
  addSteps: (steps: number) => void;
  resetGame: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);
const STORAGE_KEY = "ttok-life-farm-preview-v12";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [game, setGame] = useState<GameState>(initialGameState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setGame({ ...initialGameState, ...JSON.parse(saved) }); } catch {}
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, ready]);

  const value = useMemo<GameContextValue>(() => ({
    game,
    ready,
    patchGame: (patch) => setGame((current) => ({ ...current, ...patch })),
    addSteps: (steps) => setGame((current) => ({
      ...current,
      todaySteps: current.todaySteps + steps,
      weeklySteps: current.weeklySteps + steps,
      calories: Math.round((current.todaySteps + steps) * 0.04),
      water: current.water + Math.floor(steps / 10),
      exp: current.exp + Math.floor(steps / 100),
    })),
    resetGame: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setGame(initialGameState);
    },
  }), [game, ready]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error("useGame must be used inside GameProvider");
  return value;
}
