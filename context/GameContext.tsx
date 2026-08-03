"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  type CharacterId,
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
  character_id: CharacterId;
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

type GameUpdater = (
  current: GameState,
) => GameState;

const GameContext =
  createContext<GameContextValue | null>(null);

const STORAGE_KEY =
  "ttok-life-farm-preview-v12";

const MIGRATION_KEY_PREFIX =
  "ttok-life-supabase-migrated-v3:";

const REMOTE_SAVE_DELAY = 700;

const CHARACTER_IDS =
  new Set<CharacterId>([
    "hani",
    "harin",
    "hajun",
    "minjun",
  ]);

function normalizeCharacterId(
  value: unknown,
  fallback: CharacterId,
): CharacterId {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized =
    value.trim().toLowerCase();

  return CHARACTER_IDS.has(
    normalized as CharacterId,
  )
    ? (normalized as CharacterId)
    : fallback;
}

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

  return Math.max(
    0,
    Math.floor(value),
  );
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

  return Math.max(
    1,
    Math.floor(value),
  );
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

  const koreanDateMatch =
    trimmed.match(
      /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/,
    );

  if (!koreanDateMatch) {
    return "";
  }

  const year =
    koreanDateMatch[1];

  const month =
    koreanDateMatch[2].padStart(
      2,
      "0",
    );

  const day =
    koreanDateMatch[3].padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function createInitialGameCopy(): GameState {
  return {
    ...initialGameState,

    characterId:
      normalizeCharacterId(
        initialGameState.characterId,
        "hani",
      ),

    rewards: Array.isArray(
      initialGameState.rewards,
    )
      ? [...initialGameState.rewards]
      : initialGameState.rewards,

    inviteHistory: Array.isArray(
      initialGameState.inviteHistory,
    )
      ? [...initialGameState.inviteHistory]
      : initialGameState.inviteHistory,
  };
}

function cloneGameState(
  game: GameState,
): GameState {
  return {
    ...game,

    characterId:
      normalizeCharacterId(
        game.characterId,
        "hani",
      ),

    rewards: Array.isArray(
      game.rewards,
    )
      ? [...game.rewards]
      : game.rewards,

    inviteHistory: Array.isArray(
      game.inviteHistory,
    )
      ? [...game.inviteHistory]
      : game.inviteHistory,
  };
}

function loadLocalGame(): GameState {
  const saved =
    window.localStorage.getItem(
      STORAGE_KEY,
    );

  if (!saved) {
    return createInitialGameCopy();
  }

  try {
    const parsed =
      JSON.parse(
        saved,
      ) as Partial<GameState>;

    return {
      ...createInitialGameCopy(),
      ...parsed,

      characterId:
        normalizeCharacterId(
          parsed.characterId,
          initialGameState.characterId,
        ),

      points:
        typeof parsed.points === "number"
          ? parsed.points
          : initialGameState.points,

      lastAttendanceDate:
        normalizeStoredDate(
          parsed.lastAttendanceDate,
        ),

      rewards: Array.isArray(
        parsed.rewards,
      )
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

    return createInitialGameCopy();
  }
}

function saveLocalGame(
  game: GameState,
): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(game),
    );
  } catch (error) {
    console.error(
      "[TTOK LIFE] localStorage 저장 실패:",
      error,
    );
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

    character_id:
      normalizeCharacterId(
        game.characterId,
        initialGameState.characterId,
      ),

    water: normalizeNumber(
      game.water,
      0,
    ),

    /*
     * 현금성 포인트는 클라이언트 저장 요청에 포함하지 않습니다.
     * 포인트 증감은 farm-harvest 등 서버 전용 API만 처리합니다.
     */
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

    total_purchase:
      normalizeNumber(
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

    invited_count:
      normalizeNumber(
        game.invitedCount,
        0,
      ),
  };
}

function applyApiState(
  current: GameState,
  remote: GameStateApiRow,
): GameState {
  const remoteFields = {
    characterId:
      normalizeCharacterId(
        remote.character_id,
        current.characterId,
      ),

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

    totalPurchase:
      normalizeNumber(
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

    invitedCount:
      normalizeNumber(
        remote.invited_count,
        current.invitedCount,
      ),
  } as Partial<GameState>;

  return {
    ...current,
    ...remoteFields,
  };
}

function isRemoteStateEmpty(
  remote: GameStateApiRow,
): boolean {
  return (
    normalizeNumber(
      remote.water,
      0,
    ) === 0 &&
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
    normalizeNumber(
      remote.exp,
      0,
    ) === 0 &&
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
    normalizeNumber(
      remote.version,
      1,
    ) <= 1
  );
}

function hasLocalProgress(
  game: GameState,
): boolean {
  return (
    normalizeNumber(
      game.water,
      0,
    ) > 0 ||
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
    normalizeNumber(
      game.exp,
      0,
    ) > 0 ||
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
    normalizeLevel(
      game.level,
      1,
    ) !==
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

  const text =
    await response.text();

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

/*
 * 일반 게임 상태 저장입니다.
 * 현금성 points는 createApiPayload에서 제외되어
 * 이 경로로는 서버 포인트를 변경할 수 없습니다.
 */
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

  const text =
    await response.text();

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

  const gameRef =
    useRef<GameState>(
      initialGameState,
    );

  const activeMemberIdRef =
    useRef("");

  const remoteReadyRef =
    useRef(false);

  const syncSequenceRef =
    useRef(0);

  const saveTimerRef =
    useRef<number | null>(null);

  const saveQueueRef =
    useRef<Promise<void>>(
      Promise.resolve(),
    );

  const localReadyRef =
    useRef(false);

  const remoteRefreshPromiseRef =
    useRef<Promise<void> | null>(
      null,
    );

  /*
   * Supabase 초기 조회 전 발생한 최신 변경사항입니다.
   *
   * 이전 버전에서는 remoteReady가 false일 때
   * 저장 요청이 사라졌지만, 이제 이 ref에 보관합니다.
   */
  const pendingSaveRef =
    useRef<GameState | null>(null);

  const clearSaveTimer =
    useCallback(() => {
      if (
        saveTimerRef.current === null
      ) {
        return;
      }

      window.clearTimeout(
        saveTimerRef.current,
      );

      saveTimerRef.current = null;
    }, []);

  const enqueueRemoteSave =
    useCallback(
      (
        memberId: string,
        snapshot: GameState,
      ) => {
        const safeSnapshot =
          cloneGameState(snapshot);

        saveQueueRef.current =
          saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
              if (
                activeMemberIdRef.current !==
                memberId
              ) {
                return;
              }

              await saveRemoteGame(
                memberId,
                safeSnapshot,
              );
            })
            .catch(
              (error: unknown) => {
                /*
                 * 저장 실패 시 최신 상태를 다시 대기시켜
                 * 다음 변경이나 화면 이탈 시 재시도합니다.
                 */
                if (
                  activeMemberIdRef.current ===
                  memberId
                ) {
                  pendingSaveRef.current =
                    cloneGameState(
                      gameRef.current,
                    );
                }

                console.error(
                  "[TTOK LIFE] Supabase 저장 실패:",
                  error,
                );
              },
            );
      },
      [],
    );

  const scheduleRemoteSave =
    useCallback(
      (
        nextGame: GameState,
        immediate = false,
      ) => {
        const memberId =
          activeMemberIdRef.current;

        const snapshot =
          cloneGameState(nextGame);

        /*
         * 아직 회원 ID가 전달되지 않았거나
         * Supabase 최초 조회가 끝나지 않았다면
         * 최신 데이터를 pending에 보관합니다.
         */
        if (
          !memberId ||
          !remoteReadyRef.current
        ) {
          pendingSaveRef.current =
            snapshot;

          return;
        }

        pendingSaveRef.current =
          null;

        clearSaveTimer();

        if (immediate) {
          enqueueRemoteSave(
            memberId,
            snapshot,
          );

          return;
        }

        saveTimerRef.current =
          window.setTimeout(() => {
            saveTimerRef.current =
              null;

            enqueueRemoteSave(
              memberId,
              snapshot,
            );
          }, REMOTE_SAVE_DELAY);
      },
      [
        clearSaveTimer,
        enqueueRemoteSave,
      ],
    );

  /*
   * Supabase 준비 완료 후 pending 상태를 즉시 저장합니다.
   */
  const flushPendingSave =
    useCallback(
      (
        memberId: string,
        fallbackGame: GameState,
      ) => {
        if (
          activeMemberIdRef.current !==
          memberId
        ) {
          return;
        }

        remoteReadyRef.current =
          true;

        const pendingGame =
          pendingSaveRef.current;

        if (!pendingGame) {
          return;
        }

        pendingSaveRef.current =
          null;

        const pendingSnapshot =
          cloneGameState(
            pendingGame ??
              fallbackGame,
          );

        /*
         * 초기 조회 중 발생한 걸음·물방울 변경은 유지하되,
         * 현금성 포인트는 반드시 서버 값을 사용합니다.
         */
        const latestGame: GameState = {
          ...pendingSnapshot,

          points:
            fallbackGame.points,

          characterId:
            fallbackGame.characterId,
        };

        gameRef.current =
          latestGame;

        setGame(latestGame);
        saveLocalGame(latestGame);

        enqueueRemoteSave(
          memberId,
          latestGame,
        );
      },
      [enqueueRemoteSave],
    );

  const updateGame =
    useCallback(
      (
        updater: GameUpdater,
        persist = true,
      ) => {
        const current =
          gameRef.current;

        const next =
          updater(current);

        if (next === current) {
          return;
        }

        gameRef.current =
          next;

        setGame(next);

        if (
          localReadyRef.current
        ) {
          saveLocalGame(next);
        }

        if (persist) {
          scheduleRemoteSave(
            next,
          );
        }
      },
      [scheduleRemoteSave],
    );

  const refreshRemoteGame =
    useCallback(
      async () => {
        const memberId =
          activeMemberIdRef.current;

        if (
          !memberId ||
          !remoteReadyRef.current
        ) {
          return;
        }

        if (
          remoteRefreshPromiseRef.current
        ) {
          return remoteRefreshPromiseRef.current;
        }

        const refreshTask =
          (async () => {
            try {
              const remoteState =
                await readRemoteGame(
                  memberId,
                );

              if (
                activeMemberIdRef.current !==
                memberId
              ) {
                return;
              }

              const current =
                gameRef.current;

              /*
               * 저장 대기 중인 로컬 변경이 있으면 걸음 등은 유지하고,
               * 현금성 포인트만 서버값으로 즉시 교정합니다.
               * 대기 변경이 없으면 모든 서버 게임값을 적용합니다.
               */
              const nextGame =
                pendingSaveRef.current
                  ? {
                      ...current,

                      points:
                        normalizeNumber(
                          remoteState.points,
                          current.points,
                        ),

                      characterId:
                        normalizeCharacterId(
                          remoteState.character_id,
                          current.characterId,
                        ),
                    }
                  : applyApiState(
                      current,
                      remoteState,
                    );

              gameRef.current =
                nextGame;

              setGame(nextGame);
              saveLocalGame(nextGame);
            } catch (error) {
              console.error(
                "[TTOK LIFE] 서버 게임 상태 새로고침 실패:",
                error,
              );
            }
          })();

        remoteRefreshPromiseRef.current =
          refreshTask;

        try {
          await refreshTask;
        } finally {
          if (
            remoteRefreshPromiseRef.current ===
            refreshTask
          ) {
            remoteRefreshPromiseRef.current =
              null;
          }
        }
      },
      [],
    );

  useEffect(() => {
    const localGame =
      loadLocalGame();

    gameRef.current =
      localGame;

    localReadyRef.current =
      true;

    setGame(localGame);
    setReady(true);
  }, []);

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
      activeMemberIdRef.current ===
        memberId &&
      remoteReadyRef.current
    ) {
      return;
    }

    const syncSequence =
      syncSequenceRef.current + 1;

    syncSequenceRef.current =
      syncSequence;

    clearSaveTimer();

    activeMemberIdRef.current =
      memberId;

    remoteReadyRef.current =
      false;

    const migrationKey =
      `${MIGRATION_KEY_PREFIX}${memberId}`;

    const migrationCompleted =
      window.localStorage.getItem(
        migrationKey,
      ) === "1";

    void readRemoteGame(memberId)
      .then(async (remoteState) => {
        if (
          syncSequenceRef.current !==
            syncSequence ||
          activeMemberIdRef.current !==
            memberId
        ) {
          return;
        }

        const currentLocalGame =
          gameRef.current;

        const shouldMigrate =
          !migrationCompleted &&
          isRemoteStateEmpty(
            remoteState,
          ) &&
          hasLocalProgress(
            currentLocalGame,
          );

        let nextGame: GameState;

        if (shouldMigrate) {
          const migratedRemoteState =
            await saveRemoteGame(
              memberId,
              currentLocalGame,
            );

          if (
            syncSequenceRef.current !==
              syncSequence ||
            activeMemberIdRef.current !==
              memberId
          ) {
            return;
          }

          nextGame =
            applyApiState(
              currentLocalGame,
              migratedRemoteState,
            );
        } else {
          nextGame =
            applyApiState(
              currentLocalGame,
              remoteState,
            );
        }

        /*
         * 초기 조회 중 로컬 변경이 있더라도 현금성 포인트는
         * 서버값을 즉시 적용합니다.
         */
        if (
          pendingSaveRef.current
        ) {
          const pendingWithServerFields: GameState = {
            ...pendingSaveRef.current,

            points:
              nextGame.points,

            characterId:
              nextGame.characterId,
          };

          pendingSaveRef.current =
            pendingWithServerFields;

          gameRef.current =
            pendingWithServerFields;

          setGame(
            pendingWithServerFields,
          );

          saveLocalGame(
            pendingWithServerFields,
          );
        } else {
          gameRef.current =
            nextGame;

          setGame(nextGame);
          saveLocalGame(nextGame);
        }

        window.localStorage.setItem(
          migrationKey,
          "1",
        );

        remoteReadyRef.current =
          true;

        /*
         * 초기 조회 중 걸음이나 게임값이 변경됐다면
         * 해당 최신 상태를 즉시 Supabase에 저장합니다.
         */
        flushPendingSave(
          memberId,
          nextGame,
        );
      })
      .catch(
        (error: unknown) => {
          if (
            syncSequenceRef.current !==
            syncSequence
          ) {
            return;
          }

          remoteReadyRef.current =
            false;

          /*
           * 조회 실패 시에도 최신 로컬 상태를
           * pending에 유지합니다.
           */
          pendingSaveRef.current =
            cloneGameState(
              gameRef.current,
            );

          console.error(
            "[TTOK LIFE] Supabase 초기 동기화 실패:",
            error,
          );
        },
      );

    return () => {
      if (
        syncSequenceRef.current ===
        syncSequence
      ) {
        syncSequenceRef.current += 1;
      }
    };
  }, [
    ready,
    member?.memberId,
    clearSaveTimer,
    flushPendingSave,
  ]);

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshRemoteGame();
        }
      };

    const handleFocus =
      () => {
        void refreshRemoteGame();
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [refreshRemoteGame]);

  useEffect(() => {
    const flushLatestGame = () => {
      const memberId =
        activeMemberIdRef.current;

      const latestGame =
        cloneGameState(
          gameRef.current,
        );

      saveLocalGame(
        latestGame,
      );

      clearSaveTimer();

      if (!memberId) {
        pendingSaveRef.current =
          latestGame;

        return;
      }

      if (
        !remoteReadyRef.current
      ) {
        pendingSaveRef.current =
          latestGame;

        return;
      }

      pendingSaveRef.current =
        null;

      enqueueRemoteSave(
        memberId,
        latestGame,
      );
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          flushLatestGame();
        }
      };

    window.addEventListener(
      "pagehide",
      flushLatestGame,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener(
        "pagehide",
        flushLatestGame,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    clearSaveTimer,
    enqueueRemoteSave,
  ]);

  useEffect(() => {
    return () => {
      clearSaveTimer();
    };
  }, [clearSaveTimer]);

  const patchGame =
    useCallback(
      (
        patch: Partial<GameState>,
      ) => {
        updateGame(
          (current) => ({
            ...current,
            ...patch,

            characterId:
              patch.characterId === undefined
                ? current.characterId
                : normalizeCharacterId(
                    patch.characterId,
                    current.characterId,
                  ),
          }),
        );

        /*
         * patch에 points가 포함돼도 화면 표시만 갱신됩니다.
         * createApiPayload가 points를 전송하지 않으므로
         * 클라이언트가 서버 포인트를 덮어쓸 수 없습니다.
         */
      },
      [updateGame],
    );

  const setNickname =
    useCallback(
      (nickname: string) => {
        updateGame(
          (current) => ({
            ...current,

            nickname:
              nickname.trim(),
          }),
        );
      },
      [updateGame],
    );

  const addSteps =
    useCallback(
      (steps: number) => {
        if (
          !Number.isFinite(steps) ||
          steps <= 0
        ) {
          return;
        }

        const normalizedSteps =
          Math.floor(steps);

        updateGame((current) => {
          const nextTodaySteps =
            current.todaySteps +
            normalizedSteps;

          const currentTotalSteps =
            getGameNumber(
              current,
              "totalSteps",
              0,
            );

          const previousWaterUnits =
            Math.floor(
              current.todaySteps /
                100,
            );

          const nextWaterUnits =
            Math.floor(
              nextTodaySteps /
                100,
            );

          const earnedWater =
            Math.max(
              0,
              nextWaterUnits -
                previousWaterUnits,
            );

          const nextFields = {
            todaySteps:
              nextTodaySteps,

            weeklySteps:
              current.weeklySteps +
              normalizedSteps,

            totalSteps:
              currentTotalSteps +
              normalizedSteps,

            calories:
              Math.round(
                nextTodaySteps *
                  0.04,
              ),

            water:
              current.water +
              earnedWater,

            exp:
              current.exp +
              earnedWater,
          } as Partial<GameState>;

          return {
            ...current,
            ...nextFields,
          };
        });
      },
      [updateGame],
    );

  const addPurchase =
    useCallback(
      (amount: number) => {
        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          return;
        }

        const normalizedAmount =
          Math.floor(amount);

        updateGame((current) => {
          const baseWater =
            Math.floor(
              normalizedAmount /
                1000,
            );

          let bonusPercent = 0;

          if (
            current.level === 2
          ) {
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
                  bonusPercent /
                    100
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
      [updateGame],
    );

  const checkAttendance =
    useCallback(() => {
      const today =
        getLocalDateKey();

      updateGame((current) => {
        const savedDate =
          normalizeStoredDate(
            current.lastAttendanceDate,
          );

        if (
          savedDate === today
        ) {
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
    }, [updateGame]);

  const addInvite =
    useCallback(() => {
      updateGame((current) => {
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
    }, [updateGame]);

  const completeInviteReward =
    useCallback(() => {
      updateGame((current) => {
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
            current.water +
            500,

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
    }, [updateGame]);

  const resetGame =
    useCallback(() => {
      const resetState =
        createInitialGameCopy();

      window.localStorage.removeItem(
        STORAGE_KEY,
      );

      gameRef.current =
        resetState;

      setGame(resetState);
      saveLocalGame(resetState);

      scheduleRemoteSave(
        resetState,
        true,
      );
    }, [scheduleRemoteSave]);

  const value =
    useMemo<GameContextValue>(
      () => ({
        game,
        ready,

        patchGame,
        setNickname,
        addSteps,
        addPurchase,
        checkAttendance,
        addInvite,
        completeInviteReward,
        resetGame,
      }),
      [
        game,
        ready,
        patchGame,
        setNickname,
        addSteps,
        addPurchase,
        checkAttendance,
        addInvite,
        completeInviteReward,
        resetGame,
      ],
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