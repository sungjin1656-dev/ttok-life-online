"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  type GameState,
  initialGameState,
} from "@/lib/game";
import { inviteRewards } from "@/lib/invite";
import { attendanceRewards } from "@/lib/attendance";
import { useFlexMember } from "@/context/FlexMemberContext";

type GameContextValue = {
  game: GameState;
  ready: boolean;

  patchGame: (patch: Partial<GameState>) => void;
  setNickname: (nickname: string) => void;
  addSteps: (steps: number) => void;
  addPurchase: (amount: number) => void;
  checkAttendance: () => void;
  addInvite: () => void;
  completeInviteReward: () => void;
  resetGame: () => void;
};

type GameStateApiRow = {
  member_id: string;
  water: number;
  points: number;
  today_steps: number;
  weekly_steps: number;
  total_steps: number;
  calories: number;
  level: number;
  exp: number;
  total_purchase: number;
  attendance_count: number;
  last_attendance_date: string | null;
  invited_count: number;
  version: number;
  created_at?: string;
  updated_at?: string;
};

type GameStateApiResponse = {
  ok?: boolean;
  member_id?: string;
  game_state?: GameStateApiRow;
  message?: string;
  detail?: string;
};

const GameContext =
  createContext<GameContextValue | null>(null);

const STORAGE_KEY =
  "ttok-life-farm-preview-v12";

const MIGRATION_KEY_PREFIX =
  "ttok-life-supabase-migrated-v1:";

const REMOTE_SAVE_DELAY = 600;

function normalizeNumber(
  value: unknown,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeLevel(
  value: unknown,
  fallback: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function getLocalDateKey(
  date = new Date(),
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * GameState 내부에서는 lastAttendanceDate를
 * null이 아닌 빈 문자열로 관리합니다.
 */
function normalizeStoredDate(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
  ) {
    return trimmed;
  }

  const koreanMatch = trimmed.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/,
  );

  if (koreanMatch) {
    const year = koreanMatch[1];

    const month = koreanMatch[2].padStart(
      2,
      "0",
    );

    const day = koreanMatch[3].padStart(
      2,
      "0",
    );

    return `${year}-${month}-${day}`;
  }

  return "";
}

function loadLocalGame(): GameState {
  const saved =
    window.localStorage.getItem(
      STORAGE_KEY,
    );

  if (!saved) {
    return {
      ...initialGameState,
    };
  }

  try {
    const parsed =
      JSON.parse(saved) as Partial<GameState>;

    return {
      ...initialGameState,
      ...parsed,

      points:
        typeof parsed.points === "number"
          ? parsed.points
          : initialGameState.points,

      lastAttendanceDate:
        normalizeStoredDate(
          parsed.lastAttendanceDate,
        ),

      rewards: Array.isArray(parsed.rewards)
        ? parsed.rewards
        : initialGameState.rewards,

      inviteHistory: Array.isArray(
        parsed.inviteHistory,
      )
        ? parsed.inviteHistory
        : initialGameState.inviteHistory,
    };
  } catch {
    window.localStorage.removeItem(
      STORAGE_KEY,
    );

    return {
      ...initialGameState,
    };
  }
}

function getGameNumber(
  game: GameState,
  key: string,
  fallback = 0,
): number {
  const record =
    game as unknown as Record<
      string,
      unknown
    >;

  return normalizeNumber(
    record[key],
    fallback,
  );
}

function createApiPayload(
  memberId: string,
  game: GameState,
) {
  const lastAttendanceDate =
    normalizeStoredDate(
      game.lastAttendanceDate,
    );

  return {
    member_id: memberId,

    water: normalizeNumber(
      game.water,
      0,
    ),

    points: normalizeNumber(
      game.points,
      0,
    ),

    today_steps: normalizeNumber(
      game.todaySteps,
      0,
    ),

    weekly_steps: normalizeNumber(
      game.weeklySteps,
      0,
    ),

    total_steps: getGameNumber(
      game,
      "totalSteps",
      0,
    ),

    calories: normalizeNumber(
      game.calories,
      0,
    ),

    level: normalizeLevel(
      game.level,
      1,
    ),

    exp: normalizeNumber(
      game.exp,
      0,
    ),

    total_purchase: normalizeNumber(
      game.totalPurchase,
      0,
    ),

    attendance_count:
      normalizeNumber(
        game.attendanceCount,
        0,
      ),

    last_attendance_date:
      lastAttendanceDate || null,

    invited_count: normalizeNumber(
      game.invitedCount,
      0,
    ),
  };
}

function applyApiState(
  current: GameState,
  remote: GameStateApiRow,
): GameState {
  const syncedFields = {
    water: normalizeNumber(
      remote.water,
      current.water,
    ),

    points: normalizeNumber(
      remote.points,
      current.points,
    ),

    todaySteps: normalizeNumber(
      remote.today_steps,
      current.todaySteps,
    ),

    weeklySteps: normalizeNumber(
      remote.weekly_steps,
      current.weeklySteps,
    ),

    totalSteps: normalizeNumber(
      remote.total_steps,
      getGameNumber(
        current,
        "totalSteps",
        0,
      ),
    ),

    calories: normalizeNumber(
      remote.calories,
      current.calories,
    ),

    level: normalizeLevel(
      remote.level,
      current.level,
    ),

    exp: normalizeNumber(
      remote.exp,
      current.exp,
    ),

    totalPurchase: normalizeNumber(
      remote.total_purchase,
      current.totalPurchase,
    ),

    attendanceCount:
      normalizeNumber(
        remote.attendance_count,
        current.attendanceCount,
      ),

    lastAttendanceDate:
      normalizeStoredDate(
        remote.last_attendance_date,
      ),

    invitedCount: normalizeNumber(
      remote.invited_count,
      current.invitedCount,
    ),
  } as Partial<GameState>;

  return {
    ...current,
    ...syncedFields,
  };
}

function isRemoteStateEmpty(
  remote: GameStateApiRow,
): boolean {
  return (
    normalizeNumber(remote.water, 0) === 0 &&
    normalizeNumber(remote.points, 0) === 0 &&
    normalizeNumber(
      remote.today_steps,
      0,
    ) === 0 &&
    normalizeNumber(
      remote.weekly_steps,
      0,
    ) === 0 &&
    normalizeNumber(
      remote.total_steps,
      0,
    ) === 0 &&
    normalizeNumber(
      remote.calories,
      0,
    ) === 0 &&
    normalizeNumber(remote.exp, 0) === 0 &&
    normalizeNumber(
      remote.total_purchase,
      0,
    ) === 0 &&
    normalizeNumber(
      remote.attendance_count,
      0,
    ) === 0 &&
    normalizeNumber(
      remote.invited_count,
      0,
    ) === 0 &&
    !remote.last_attendance_date &&
    normalizeNumber(remote.version, 1) <= 1
  );
}

function hasLocalProgress(
  game: GameState,
): boolean {
  return (
    normalizeNumber(game.water, 0) > 0 ||
    normalizeNumber(game.points, 0) > 0 ||
    normalizeNumber(
      game.todaySteps,
      0,
    ) > 0 ||
    normalizeNumber(
      game.weeklySteps,
      0,
    ) > 0 ||
    getGameNumber(
      game,
      "totalSteps",
      0,
    ) > 0 ||
    normalizeNumber(
      game.calories,
      0,
    ) > 0 ||
    normalizeNumber(game.exp, 0) > 0 ||
    normalizeNumber(
      game.totalPurchase,
      0,
    ) > 0 ||
    normalizeNumber(
      game.attendanceCount,
      0,
    ) > 0 ||
    normalizeNumber(
      game.invitedCount,
      0,
    ) > 0 ||
    Boolean(
      normalizeStoredDate(
        game.lastAttendanceDate,
      ),
    ) ||
    normalizeLevel(game.level, 1) !==
      normalizeLevel(
        initialGameState.level,
        1,
      )
  );
}

async function readRemoteGame(
  memberId: string,
): Promise<GameStateApiRow> {
  const response = await fetch(
    `/api/game-state?member_id=${encodeURIComponent(
      memberId,
    )}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const text = await response.text();

  let result: GameStateApiResponse = {};

  try {
    result = text
      ? (JSON.parse(
          text,
        ) as GameStateApiResponse)
      : {};
  } catch {
    throw new Error(
      `게임 상태 조회 응답이 올바르지 않습니다. HTTP ${response.status}`,
    );
  }

  if (
    !response.ok ||
    !result.ok ||
    !result.game_state
  ) {
    throw new Error(
      result.detail ||
        result.message ||
        "게임 상태 조회에 실패했습니다.",
    );
  }

  return result.game_state;
}

async function saveRemoteGame(
  memberId: string,
  game: GameState,
): Promise<GameStateApiRow> {
  const response = await fetch(
    "/api/game-state",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        createApiPayload(
          memberId,
          game,
        ),
      ),

      cache: "no-store",
      keepalive: true,
    },
  );

  const text = await response.text();

  let result: GameStateApiResponse = {};

  try {
    result = text
      ? (JSON.parse(
          text,
        ) as GameStateApiResponse)
      : {};
  } catch {
    throw new Error(
      `게임 상태 저장 응답이 올바르지 않습니다. HTTP ${response.status}`,
    );
  }

  if (
    !response.ok ||
    !result.ok ||
    !result.game_state
  ) {
    throw new Error(
      result.detail ||
        result.message ||
        "게임 상태 저장에 실패했습니다.",
    );
  }

  return result.game_state;
}

export function GameProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { member } = useFlexMember();

  const [game, setGame] =
    useState<GameState>(
      initialGameState,
    );

  const [ready, setReady] =
    useState(false);

  const gameRef = useRef<GameState>(
    initialGameState,
  );

  const activeMemberIdRef =
    useRef("");

  const syncInFlightRef =
    useRef("");

  const saveTimerRef =
    useRef<number | null>(null);

  const skipNextRemoteSaveRef =
    useRef(false);

  useEffect(() => {
    const localGame = loadLocalGame();

    gameRef.current = localGame;

    setGame(localGame);
    setReady(true);
  }, []);

  useEffect(() => {
    gameRef.current = game;

    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(game),
    );
  }, [game, ready]);

  /*
   * 회원 연결 후 최초 동기화
   *
   * 1. Supabase 데이터를 조회합니다.
   * 2. Supabase가 비어 있고 최초 이전 전이면
   *    기존 localStorage 값을 Supabase로 이전합니다.
   * 3. 그 외에는 Supabase 데이터를 원본으로 적용합니다.
   */
  useEffect(() => {
    if (!ready || !member?.memberId) {
      return;
    }

    const memberId =
      member.memberId.trim();

    if (!memberId) {
      return;
    }

    if (
      activeMemberIdRef.current ===
        memberId ||
      syncInFlightRef.current ===
        memberId
    ) {
      return;
    }

    activeMemberIdRef.current =
      memberId;

    syncInFlightRef.current =
      memberId;

    if (saveTimerRef.current !== null) {
      window.clearTimeout(
        saveTimerRef.current,
      );

      saveTimerRef.current = null;
    }

    const migrationKey =
      `${MIGRATION_KEY_PREFIX}${memberId}`;

    const migrationCompleted =
      window.localStorage.getItem(
        migrationKey,
      ) === "1";

    void readRemoteGame(memberId)
      .then(async (remoteState) => {
        const localGame =
          gameRef.current;

        const shouldMigrate =
          !migrationCompleted &&
          isRemoteStateEmpty(
            remoteState,
          ) &&
          hasLocalProgress(localGame);

        if (shouldMigrate) {
          const migratedState =
            await saveRemoteGame(
              memberId,
              localGame,
            );

          skipNextRemoteSaveRef.current =
            true;

          setGame((current) =>
            applyApiState(
              current,
              migratedState,
            ),
          );
        } else {
          skipNextRemoteSaveRef.current =
            true;

          setGame((current) =>
            applyApiState(
              current,
              remoteState,
            ),
          );
        }

        window.localStorage.setItem(
          migrationKey,
          "1",
        );
      })
      .catch((error: unknown) => {
        console.error(
          "[TTOK LIFE] Supabase 초기 동기화 실패:",
          error,
        );
      })
      .finally(() => {
        if (
          syncInFlightRef.current ===
          memberId
        ) {
          syncInFlightRef.current = "";
        }
      });
  }, [
    ready,
    member?.memberId,
  ]);

  /*
   * 게임 값이 변경되면:
   *
   * localStorage에는 즉시 캐시하고,
   * Supabase에는 600ms 후 저장합니다.
   */
  useEffect(() => {
    if (
      !ready ||
      !member?.memberId
    ) {
      return;
    }

    const memberId =
      member.memberId.trim();

    if (!memberId) {
      return;
    }

    if (
      skipNextRemoteSaveRef.current
    ) {
      skipNextRemoteSaveRef.current =
        false;

      return;
    }

    if (
      activeMemberIdRef.current !==
      memberId
    ) {
      return;
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(
        saveTimerRef.current,
      );
    }

    saveTimerRef.current =
      window.setTimeout(() => {
        saveTimerRef.current = null;

        const currentGame =
          gameRef.current;

        void saveRemoteGame(
          memberId,
          currentGame,
        )
          .then((savedState) => {
            skipNextRemoteSaveRef.current =
              true;

            setGame((current) =>
              applyApiState(
                current,
                savedState,
              ),
            );
          })
          .catch(
            (error: unknown) => {
              console.error(
                "[TTOK LIFE] Supabase 저장 실패:",
                error,
              );
            },
          );
      }, REMOTE_SAVE_DELAY);

    return () => {
      if (
        saveTimerRef.current !== null
      ) {
        window.clearTimeout(
          saveTimerRef.current,
        );

        saveTimerRef.current = null;
      }
    };
  }, [
    game,
    ready,
    member?.memberId,
  ]);

  const value =
    useMemo<GameContextValue>(
      () => ({
        game,
        ready,

        patchGame: (patch) => {
          setGame((current) => ({
            ...current,
            ...patch,
          }));
        },

        setNickname: (nickname) => {
          setGame((current) => ({
            ...current,

            nickname:
              nickname.trim(),
          }));
        },

        addSteps: (steps) => {
          if (
            !Number.isFinite(steps) ||
            steps <= 0
          ) {
            return;
          }

          const normalizedSteps =
            Math.floor(steps);

          setGame((current) => {
            const nextTodaySteps =
              current.todaySteps +
              normalizedSteps;

            const currentTotalSteps =
              getGameNumber(
                current,
                "totalSteps",
                0,
              );

            const nextValues = {
              todaySteps:
                nextTodaySteps,

              weeklySteps:
                current.weeklySteps +
                normalizedSteps,

              totalSteps:
                currentTotalSteps +
                normalizedSteps,

              calories: Math.round(
                nextTodaySteps * 0.04,
              ),

              water:
                current.water +
                Math.floor(
                  normalizedSteps /
                    100,
                ),

              exp:
                current.exp +
                Math.floor(
                  normalizedSteps /
                    100,
                ),
            } as Partial<GameState>;

            return {
              ...current,
              ...nextValues,
            };
          });
        },

        addPurchase: (amount) => {
          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            return;
          }

          const normalizedAmount =
            Math.floor(amount);

          setGame((current) => {
            const baseWater =
              Math.floor(
                normalizedAmount /
                  1000,
              );

            let bonusPercent = 0;

            if (current.level === 2) {
              bonusPercent = 10;
            } else if (
              current.level === 3
            ) {
              bonusPercent = 30;
            } else if (
              current.level >= 4
            ) {
              bonusPercent = 50;
            }

            const rewardWater =
              Math.floor(
                baseWater *
                  (
                    1 +
                    bonusPercent / 100
                  ),
              );

            return {
              ...current,

              totalPurchase:
                current.totalPurchase +
                normalizedAmount,

              water:
                current.water +
                rewardWater,
            };
          });
        },

        checkAttendance: () => {
          const today =
            getLocalDateKey();

          setGame((current) => {
            const savedDate =
              normalizeStoredDate(
                current.lastAttendanceDate,
              );

            if (savedDate === today) {
              return current;
            }

            const nextAttendanceCount =
              current.attendanceCount +
              1;

            const reward =
              attendanceRewards[
                nextAttendanceCount
              ] ??
              attendanceRewards[1];

            return {
              ...current,

              lastAttendanceDate:
                today,

              attendanceCount:
                nextAttendanceCount,

              water:
                current.water +
                reward.water,
            };
          });
        },

        addInvite: () => {
          setGame((current) => {
            const nextCount =
              current.invitedCount +
              1;

            const reward =
              inviteRewards[
                nextCount as keyof typeof inviteRewards
              ] ?? 0;

            return {
              ...current,

              invitedCount:
                nextCount,

              water:
                current.water +
                reward,
            };
          });
        },

        completeInviteReward:
          () => {
            setGame((current) => {
              if (
                !current.invitedBy
              ) {
                return current;
              }

              const history = {
                id: `invite-${Date.now()}`,

                inviterCode:
                  current.invitedBy,

                joinedAt:
                  getLocalDateKey(),

                reward: 500,
              };

              return {
                ...current,

                water:
                  current.water + 500,

                invitedResidents:
                  current.invitedResidents +
                  1,

                invitedCount:
                  current.invitedCount +
                  1,

                inviteHistory: [
                  ...(
                    current.inviteHistory ??
                    []
                  ),
                  history,
                ],
              };
            });
          },

        resetGame: () => {
          window.localStorage.removeItem(
            STORAGE_KEY,
          );

          setGame({
            ...initialGameState,
          });
        },
      }),
      [game, ready],
    );

  return (
    <GameContext.Provider
      value={value}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const value =
    useContext(GameContext);

  if (!value) {
    throw new Error(
      "useGame must be used inside GameProvider",
    );
  }

  return value;
}