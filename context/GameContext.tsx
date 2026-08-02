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

type GameUpdater = (
  current: GameState,
) => GameState;

const GameContext =
  createContext<GameContextValue | null>(null);

const STORAGE_KEY =
  "ttok-life-farm-preview-v12";

const MIGRATION_KEY_PREFIX =
  "ttok-life-supabase-migrated-v2:";

const REMOTE_SAVE_DELAY = 700;

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

/*
 * React GameState 내부에서는
 * lastAttendanceDate를 string으로 유지합니다.
 *
 * 날짜가 없으면 빈 문자열을 사용하고,
 * Supabase로 전송할 때만 null로 변환합니다.
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
      remote.points,
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
      game.points,
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

  /*
   * React state와 별도로 현재 최신 게임값을
   * 즉시 참조하기 위한 ref입니다.
   */
  const gameRef =
    useRef<GameState>(
      initialGameState,
    );

  /*
   * 현재 Supabase와 연결된 회원 ID입니다.
   */
  const activeMemberIdRef =
    useRef("");

  /*
   * 현재 회원의 최초 Supabase 조회 및 적용이
   * 완료되었는지 나타냅니다.
   */
  const remoteReadyRef =
    useRef(false);

  /*
   * 회원이 바뀌거나 다시 연결될 때
   * 이전 비동기 요청 결과가 적용되는 것을 방지합니다.
   */
  const syncSequenceRef =
    useRef(0);

  /*
   * 연속된 상태 변경을 하나의 저장 요청으로
   * 합치기 위한 타이머입니다.
   */
  const saveTimerRef =
    useRef<number | null>(null);

  /*
   * Supabase POST 요청이 순서대로 실행되도록
   * 저장 요청을 직렬화합니다.
   */
  const saveQueueRef =
    useRef<Promise<void>>(
      Promise.resolve(),
    );

  /*
   * 최초 localStorage 로딩 완료 여부입니다.
   */
  const localReadyRef =
    useRef(false);

  /*
   * 현재 예약된 Supabase 저장을 취소합니다.
   */
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

  /*
   * Supabase 저장 요청을 순서대로 실행합니다.
   *
   * 먼저 시작한 저장이 늦게 끝나서
   * 최신 데이터를 덮어쓰는 문제를 방지합니다.
   */
  const enqueueRemoteSave =
    useCallback(
      (
        memberId: string,
        snapshot: GameState,
      ) => {
        saveQueueRef.current =
          saveQueueRef.current
            .catch(() => undefined)
            .then(async () => {
              /*
               * 저장 대기 중 회원이 바뀌었다면
               * 이전 회원 데이터는 저장하지 않습니다.
               */
              if (
                activeMemberIdRef.current !==
                memberId
              ) {
                return;
              }

              await saveRemoteGame(
                memberId,
                snapshot,
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
      },
      [],
    );

  /*
   * 가장 최신 게임 상태를 일정 시간 뒤
   * Supabase에 저장하도록 예약합니다.
   */
  const scheduleRemoteSave =
    useCallback(
      (
        nextGame: GameState,
        immediate = false,
      ) => {
        const memberId =
          activeMemberIdRef.current;

        if (
          !memberId ||
          !remoteReadyRef.current
        ) {
          return;
        }

        clearSaveTimer();

        const snapshot = {
          ...nextGame,
        };

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
   * 모든 게임 상태 변경은 이 함수 하나를 통합니다.
   *
   * 1. gameRef 즉시 변경
   * 2. React state 변경
   * 3. localStorage 캐시 저장
   * 4. Supabase 저장 예약
   */
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

        gameRef.current = next;

        setGame(next);

        if (localReadyRef.current) {
          saveLocalGame(next);
        }

        if (persist) {
          scheduleRemoteSave(next);
        }
      },
      [scheduleRemoteSave],
    );

  /*
   * localStorage 캐시를 최초 1회 불러옵니다.
   */
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

  /*
   * Cafe24/Flex 회원이 연결되면
   * 해당 회원의 Supabase 상태를 불러옵니다.
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

    /*
     * 같은 회원이 이미 완전히 연결된 상태라면
     * 다시 초기화하지 않습니다.
     */
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

        const localGame =
          gameRef.current;

        const shouldMigrate =
          !migrationCompleted &&
          isRemoteStateEmpty(
            remoteState,
          ) &&
          hasLocalProgress(
            localGame,
          );

        let nextGame: GameState;

        if (shouldMigrate) {
          /*
           * 최초 회원 연결이며 서버 데이터가 비어 있다면
           * 기존 모바일웹 localStorage 값을 살립니다.
           */
          const migratedRemoteState =
            await saveRemoteGame(
              memberId,
              localGame,
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
              localGame,
              migratedRemoteState,
            );
        } else {
          /*
           * 이미 서버 데이터가 있으면
           * Supabase 값을 최종 원본으로 사용합니다.
           *
           * 닉네임, 보상함 등 game_state에 없는 값은
           * 현재 로컬 값을 유지합니다.
           */
          nextGame =
            applyApiState(
              localGame,
              remoteState,
            );
        }

        gameRef.current =
          nextGame;

        setGame(nextGame);
        saveLocalGame(nextGame);

        window.localStorage.setItem(
          migrationKey,
          "1",
        );

        remoteReadyRef.current =
          true;
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

          console.error(
            "[TTOK LIFE] Supabase 초기 동기화 실패:",
            error,
          );
        },
      );

    return () => {
      /*
       * 회원 ID가 바뀌거나 Provider가 해제되면
       * 이전 동기화 요청을 무효화합니다.
       */
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
  ]);

  /*
   * 브라우저가 닫히거나 백그라운드로 이동할 때
   * 마지막 최신 상태 저장을 한 번 더 요청합니다.
   */
  useEffect(() => {
    const flushLatestGame = () => {
      const memberId =
        activeMemberIdRef.current;

      if (
        !memberId ||
        !remoteReadyRef.current
      ) {
        return;
      }

      clearSaveTimer();

      enqueueRemoteSave(
        memberId,
        gameRef.current,
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

  /*
   * Provider 해제 시 저장 타이머를 정리합니다.
   */
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
          }),
        );
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

          const nextFields = {
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
                normalizedSteps / 100,
              ),

            exp:
              current.exp +
              Math.floor(
                normalizedSteps / 100,
              ),
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

        if (savedDate === today) {
          return current;
        }

        const nextAttendanceCount =
          current.attendanceCount + 1;

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
          current.invitedCount + 1;

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
        if (!current.invitedBy) {
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
            current.invitedCount + 1,

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

      /*
       * resetGame도 회원의 Supabase 데이터에
       * 동일하게 반영합니다.
       */
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