"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

type Engine = "legacy" | "rhythm";
type SettingKey =
  | "stepThreshold"
  | "resetThreshold"
  | "minStepInterval"
  | "filterRatio";

type MotionEventConstructorWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type AlgorithmSettings = {
  stepThreshold: number;
  resetThreshold: number;
  minStepInterval: number;
  filterRatio: number;
};

type EngineSettings = Record<Engine, AlgorithmSettings>;

type LegacyRuntime = {
  steps: number;
  candidates: number;
  rejected: number;
  raw: number;
  filtered: number;
  previousFiltered: number;
  gravityX: number;
  gravityY: number;
  gravityZ: number;
  initialized: boolean;
  armed: boolean;
  impactActive: boolean;
  lastStepAt: number;
  previousStepAt: number;
  recentSteps: number[];
};

type GaitMode =
  | "대기"
  | "걷기"
  | "빠른 걷기"
  | "조깅"
  | "달리기";

type AdaptiveTuning = {
  stepThreshold: number;
  resetThreshold: number;
  minStepInterval: number;
  filterRatio: number;
};

type RhythmRuntime = {
  steps: number;
  candidates: number;
  rejected: number;
  raw: number;
  filtered: number;
  previousFiltered: number;
  gravityMagnitude: number;
  initialized: boolean;
  peakArmed: boolean;
  peakArmedAt: number;
  walkingConfirmed: boolean;
  candidateTimes: number[];
  intervalHistory: number[];
  gait: GaitMode;
  effectiveStepThreshold: number;
  effectiveResetThreshold: number;
  effectiveMinStepInterval: number;
  effectiveFilterRatio: number;
  shakeHits: number[];
  highImpactActive: boolean;
  shakeLockUntil: number;
  lastStepAt: number;
  previousStepAt: number;
  recentSteps: number[];
};

type EngineView = {
  steps: number;
  candidates: number;
  rejected: number;
  raw: number;
  filtered: number;
  lastStepAt: number;
  interval: number;
  cadence: number;
  state: string;
  gait: string;
  effectiveStepThreshold: number;
  effectiveResetThreshold: number;
  effectiveMinStepInterval: number;
  effectiveFilterRatio: number;
};

type Snapshot = {
  x: number;
  y: number;
  z: number;
  magnitude: number;
  events: number;
  lastEventAt: number;
  legacy: EngineView;
  rhythm: EngineView;
};

type Outcome = {
  counted: number;
  message?: string;
};

const STORAGE_KEY = "ttok-life-step-test-settings-v1";
const UI_REFRESH_MS = 90;
const MAX_VALID_MOTION = 8;
const MAX_STEP_INTERVAL = 1300;
const WALK_TIMEOUT = 2600;
const SHAKE_LOCK_MS = 900;
const ABSOLUTE_MIN_STEP_INTERVAL = 150;
const RHYTHM_HARD_IMPACT = 22;
const RHYTHM_PEAK_TIMEOUT = 720;
const RHYTHM_HISTORY_SIZE = 8;

const DEFAULT_SETTINGS: EngineSettings = {
  legacy: {
    stepThreshold: 1.2,
    resetThreshold: 0.65,
    minStepInterval: 360,
    filterRatio: 0.26,
  },
  rhythm: {
    stepThreshold: 1.25,
    resetThreshold: 0.34,
    minStepInterval: 350,
    filterRatio: 0.28,
  },
};

const PARAMETERS: Array<{
  key: SettingKey;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  {
    key: "stepThreshold",
    label: "STEP_THRESHOLD",
    help: "걸음 후보로 인정할 움직임 크기",
    min: 0.3,
    max: 3,
    step: 0.05,
    unit: "",
  },
  {
    key: "resetThreshold",
    label: "RESET_THRESHOLD",
    help: "다음 걸음을 받기 위해 내려와야 하는 값",
    min: 0.05,
    max: 1.5,
    step: 0.05,
    unit: "",
  },
  {
    key: "minStepInterval",
    label: "MIN_STEP_INTERVAL",
    help: "중복 감지를 막는 최소 걸음 간격",
    min: 180,
    max: 800,
    step: 10,
    unit: "ms",
  },
  {
    key: "filterRatio",
    label: "FILTER_RATIO",
    help: "현재 센서값을 필터에 반영하는 비율",
    min: 0.05,
    max: 0.8,
    step: 0.01,
    unit: "",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function classifyGait(intervals: number[]): GaitMode {
  const recent = intervals.slice(-5);
  const middle = median(recent);

  if (!middle) return "대기";
  if (middle <= 230) return "달리기";
  if (middle <= 315) return "조깅";
  if (middle <= 445) return "빠른 걷기";
  return "걷기";
}

function getAdaptiveTuning(
  gait: GaitMode,
  settings: AlgorithmSettings,
): AdaptiveTuning {
  const profile =
    gait === "달리기"
      ? {
          thresholdRatio: 0.8,
          resetRatio: 1.35,
          minInterval: 150,
          filterFloor: 0.38,
        }
      : gait === "조깅"
        ? {
            thresholdRatio: 0.88,
            resetRatio: 1.22,
            minInterval: 205,
            filterFloor: 0.34,
          }
        : gait === "빠른 걷기"
          ? {
              thresholdRatio: 0.95,
              resetRatio: 1.1,
              minInterval: 280,
              filterFloor: 0.3,
            }
          : {
              thresholdRatio: 1,
              resetRatio: 1,
              minInterval: settings.minStepInterval,
              filterFloor: settings.filterRatio,
            };

  const stepThreshold = round(
    clamp(settings.stepThreshold * profile.thresholdRatio, 0.3, 3),
  );
  const resetThreshold = round(
    clamp(
      settings.resetThreshold * profile.resetRatio,
      0.05,
      Math.max(0.05, stepThreshold - 0.05),
    ),
  );

  return {
    stepThreshold,
    resetThreshold,
    minStepInterval: Math.round(
      clamp(
        Math.min(settings.minStepInterval, profile.minInterval),
        ABSOLUTE_MIN_STEP_INTERVAL,
        800,
      ),
    ),
    filterRatio: round(
      clamp(Math.max(settings.filterRatio, profile.filterFloor), 0.05, 0.8),
    ),
  };
}

function applyAdaptiveTuning(
  runtime: RhythmRuntime,
  settings: AlgorithmSettings,
) {
  const tuning = getAdaptiveTuning(runtime.gait, settings);
  runtime.effectiveStepThreshold = tuning.stepThreshold;
  runtime.effectiveResetThreshold = tuning.resetThreshold;
  runtime.effectiveMinStepInterval = tuning.minStepInterval;
  runtime.effectiveFilterRatio = tuning.filterRatio;
  return tuning;
}

function isRhythmConsistent(intervals: number[], gait: GaitMode) {
  if (intervals.length < 2) return false;
  const middle = median(intervals);
  const tolerance =
    gait === "달리기"
      ? Math.max(55, middle * 0.34)
      : gait === "조깅"
        ? Math.max(70, middle * 0.36)
        : Math.max(95, middle * 0.42);

  return intervals.every(
    (interval) => Math.abs(interval - middle) <= tolerance,
  );
}

function signalText(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "0.000";
}

function clockText(timestamp: number) {
  if (!timestamp) return "없음";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function logClock(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 1,
    hour12: false,
  }).format(new Date(timestamp));
}

function engineName(engine: Engine) {
  return engine === "legacy" ? "기존 알고리즘" : "신규 적응형 알고리즘 V2";
}

function createLegacy(steps = 0): LegacyRuntime {
  return {
    steps,
    candidates: 0,
    rejected: 0,
    raw: 0,
    filtered: 0,
    previousFiltered: 0,
    gravityX: 0,
    gravityY: 0,
    gravityZ: 0,
    initialized: false,
    armed: true,
    impactActive: false,
    lastStepAt: 0,
    previousStepAt: 0,
    recentSteps: [],
  };
}

function createRhythm(
  steps = 0,
  settings: AlgorithmSettings = DEFAULT_SETTINGS.rhythm,
): RhythmRuntime {
  const tuning = getAdaptiveTuning("대기", settings);

  return {
    steps,
    candidates: 0,
    rejected: 0,
    raw: 0,
    filtered: 0,
    previousFiltered: 0,
    gravityMagnitude: 9.81,
    initialized: false,
    peakArmed: false,
    peakArmedAt: 0,
    walkingConfirmed: false,
    candidateTimes: [],
    intervalHistory: [],
    gait: "대기",
    effectiveStepThreshold: tuning.stepThreshold,
    effectiveResetThreshold: tuning.resetThreshold,
    effectiveMinStepInterval: tuning.minStepInterval,
    effectiveFilterRatio: tuning.filterRatio,
    shakeHits: [],
    highImpactActive: false,
    shakeLockUntil: 0,
    lastStepAt: 0,
    previousStepAt: 0,
    recentSteps: [],
  };
}

function resetLegacySignal(runtime: LegacyRuntime) {
  const next = createLegacy(runtime.steps);
  next.candidates = runtime.candidates;
  next.rejected = runtime.rejected;
  next.lastStepAt = runtime.lastStepAt;
  next.previousStepAt = runtime.previousStepAt;
  next.recentSteps = [...runtime.recentSteps];
  return next;
}

function resetRhythmSignal(
  runtime: RhythmRuntime,
  settings: AlgorithmSettings = DEFAULT_SETTINGS.rhythm,
) {
  const next = createRhythm(runtime.steps, settings);
  next.candidates = runtime.candidates;
  next.rejected = runtime.rejected;
  next.lastStepAt = runtime.lastStepAt;
  next.previousStepAt = runtime.previousStepAt;
  next.recentSteps = [...runtime.recentSteps];
  return next;
}

function processLegacy(
  runtime: LegacyRuntime,
  x: number,
  y: number,
  z: number,
  now: number,
  settings: AlgorithmSettings,
): Outcome {
  if (!runtime.initialized) {
    runtime.gravityX = x;
    runtime.gravityY = y;
    runtime.gravityZ = z;
    runtime.initialized = true;
    return { counted: 0 };
  }

  const gravityFilter = 0.92;
  runtime.gravityX = runtime.gravityX * gravityFilter + x * (1 - gravityFilter);
  runtime.gravityY = runtime.gravityY * gravityFilter + y * (1 - gravityFilter);
  runtime.gravityZ = runtime.gravityZ * gravityFilter + z * (1 - gravityFilter);

  const linearX = x - runtime.gravityX;
  const linearY = y - runtime.gravityY;
  const linearZ = z - runtime.gravityZ;
  const raw = Math.sqrt(
    linearX * linearX + linearY * linearY + linearZ * linearZ,
  );
  runtime.raw = raw;

  if (raw > MAX_VALID_MOTION) {
    if (!runtime.impactActive) {
      runtime.rejected += 1;
      runtime.impactActive = true;
    }
    runtime.armed = false;
    runtime.filtered = 0;
    runtime.previousFiltered = 0;
    return { counted: 0, message: "기존 엔진: 강한 충격 제외" };
  }

  if (runtime.impactActive && raw <= settings.resetThreshold) {
    runtime.impactActive = false;
  }

  runtime.previousFiltered = runtime.filtered;
  runtime.filtered =
    runtime.filtered * (1 - settings.filterRatio) +
    raw * settings.filterRatio;

  if (runtime.filtered <= settings.resetThreshold) {
    runtime.armed = true;
  }

  if (
    runtime.armed &&
    runtime.filtered >= settings.stepThreshold &&
    now - runtime.lastStepAt >= settings.minStepInterval
  ) {
    runtime.previousStepAt = runtime.lastStepAt;
    runtime.lastStepAt = now;
    runtime.steps += 1;
    runtime.candidates += 1;
    runtime.recentSteps.push(now);
    runtime.armed = false;
    return { counted: 1 };
  }

  return { counted: 0 };
}

function confirmRhythmCandidate(
  runtime: RhythmRuntime,
  now: number,
  settings: AlgorithmSettings,
): Outcome {
  const previousCandidate = runtime.candidateTimes.at(-1) ?? 0;
  const previousGait = runtime.gait;

  if (previousCandidate) {
    const interval = now - previousCandidate;

    if (interval < ABSOLUTE_MIN_STEP_INTERVAL) {
      runtime.rejected += 1;
      runtime.candidateTimes = [now];
      runtime.intervalHistory = [];
      runtime.walkingConfirmed = false;
      runtime.gait = "대기";
      applyAdaptiveTuning(runtime, settings);
      return {
        counted: 0,
        message: "신규 V2: 150ms 미만 초고속 움직임 제외",
      };
    }

    if (interval > MAX_STEP_INTERVAL) {
      runtime.candidateTimes = [now];
      runtime.intervalHistory = [];
      runtime.walkingConfirmed = false;
      runtime.gait = "대기";
      applyAdaptiveTuning(runtime, settings);
      return { counted: 0, message: "신규 V2: 활동 리듬 재확인" };
    }

    runtime.intervalHistory.push(interval);
    if (runtime.intervalHistory.length > RHYTHM_HISTORY_SIZE) {
      runtime.intervalHistory.shift();
    }

    runtime.gait = classifyGait(runtime.intervalHistory);
    const tuning = applyAdaptiveTuning(runtime, settings);

    if (interval < tuning.minStepInterval) {
      runtime.rejected += 1;
      runtime.candidateTimes = [now];
      runtime.intervalHistory = [];
      runtime.walkingConfirmed = false;
      runtime.gait = "대기";
      applyAdaptiveTuning(runtime, settings);
      return { counted: 0, message: "신규 V2: 활동별 최소 간격 미달" };
    }
  }

  runtime.candidateTimes.push(now);
  if (runtime.candidateTimes.length > RHYTHM_HISTORY_SIZE + 1) {
    runtime.candidateTimes.shift();
  }

  if (!runtime.walkingConfirmed) {
    if (runtime.candidateTimes.length < 3) {
      return {
        counted: 0,
        message:
          previousGait !== runtime.gait && runtime.gait !== "대기"
            ? `신규 V2: ${runtime.gait} 후보 감지`
            : undefined,
      };
    }

    const recentTimes = runtime.candidateTimes.slice(-3);
    const recentIntervals = [
      recentTimes[1] - recentTimes[0],
      recentTimes[2] - recentTimes[1],
    ];
    const gait = classifyGait(recentIntervals);
    const tuning = getAdaptiveTuning(gait, settings);
    const validIntervals = recentIntervals.every(
      (interval) =>
        interval >= tuning.minStepInterval &&
        interval <= MAX_STEP_INTERVAL,
    );

    if (!validIntervals || !isRhythmConsistent(recentIntervals, gait)) {
      runtime.rejected += 1;
      runtime.candidateTimes = runtime.candidateTimes.slice(-2);
      runtime.intervalHistory = runtime.intervalHistory.slice(-1);
      runtime.walkingConfirmed = false;
      return { counted: 0, message: "신규 V2: 불규칙 리듬 제외" };
    }

    runtime.gait = gait;
    applyAdaptiveTuning(runtime, settings);
    runtime.walkingConfirmed = true;
    runtime.steps += 3;
    runtime.previousStepAt = recentTimes[1];
    runtime.lastStepAt = recentTimes[2];
    runtime.recentSteps.push(...recentTimes);

    return {
      counted: 3,
      message: `신규 V2: ${gait} 리듬 확인 → 3걸음 반영`,
    };
  }

  runtime.previousStepAt = runtime.lastStepAt;
  runtime.lastStepAt = now;
  runtime.steps += 1;
  runtime.recentSteps.push(now);

  return {
    counted: 1,
    message:
      previousGait !== runtime.gait
        ? `신규 V2: ${runtime.gait} 모드로 자동 전환`
        : undefined,
  };
}

function processRhythm(
  runtime: RhythmRuntime,
  magnitude: number,
  now: number,
  settings: AlgorithmSettings,
): Outcome {
  if (!runtime.initialized) {
    runtime.gravityMagnitude = magnitude || 9.81;
    runtime.initialized = true;
    applyAdaptiveTuning(runtime, settings);
    return { counted: 0 };
  }

  if (
    runtime.lastStepAt &&
    now - runtime.lastStepAt > WALK_TIMEOUT
  ) {
    runtime.walkingConfirmed = false;
    runtime.candidateTimes = [];
    runtime.intervalHistory = [];
    runtime.gait = "대기";
    runtime.peakArmed = false;
    runtime.peakArmedAt = 0;
  }

  const tuning = applyAdaptiveTuning(runtime, settings);
  const gravityFollowRatio = runtime.gait === "달리기" ? 0.045 : 0.065;
  runtime.gravityMagnitude =
    runtime.gravityMagnitude * (1 - gravityFollowRatio) +
    magnitude * gravityFollowRatio;

  const raw = magnitude - runtime.gravityMagnitude;
  runtime.raw = raw;
  runtime.previousFiltered = runtime.filtered;
  runtime.filtered =
    runtime.filtered * (1 - tuning.filterRatio) +
    raw * tuning.filterRatio;

  if (now < runtime.shakeLockUntil) return { counted: 0 };

  const absoluteRaw = Math.abs(raw);
  const absoluteFiltered = Math.abs(runtime.filtered);

  if (absoluteRaw > RHYTHM_HARD_IMPACT) {
    runtime.rejected += 1;
    runtime.shakeLockUntil = now + SHAKE_LOCK_MS;
    runtime.shakeHits = [];
    runtime.highImpactActive = false;
    runtime.candidateTimes = [];
    runtime.intervalHistory = [];
    runtime.walkingConfirmed = false;
    runtime.gait = "대기";
    runtime.peakArmed = false;
    runtime.peakArmedAt = 0;
    applyAdaptiveTuning(runtime, settings);
    return { counted: 0, message: "신규 V2: 비정상 강한 충격 잠금" };
  }

  const shakeThreshold = Math.max(
    5.2,
    tuning.stepThreshold * (runtime.gait === "달리기" ? 4.4 : 3.8),
  );

  if (absoluteFiltered > shakeThreshold && !runtime.highImpactActive) {
    runtime.highImpactActive = true;
    runtime.shakeHits.push(now);
    runtime.shakeHits = runtime.shakeHits.filter(
      (time) => now - time <= 900,
    );

    if (runtime.shakeHits.length >= 4) {
      const shakeIntervals = runtime.shakeHits
        .slice(-4)
        .map((time, index, values) =>
          index ? time - values[index - 1] : 0,
        )
        .slice(1);
      const middle = median(shakeIntervals);
      const spread =
        Math.max(...shakeIntervals) - Math.min(...shakeIntervals);
      const tooFast = middle < ABSOLUTE_MIN_STEP_INTERVAL;
      const irregular = spread > Math.max(90, middle * 0.72);

      if (tooFast || irregular) {
        runtime.rejected += 1;
        runtime.shakeLockUntil = now + SHAKE_LOCK_MS;
        runtime.shakeHits = [];
        runtime.highImpactActive = false;
        runtime.candidateTimes = [];
        runtime.intervalHistory = [];
        runtime.walkingConfirmed = false;
        runtime.gait = "대기";
        runtime.peakArmed = false;
        runtime.peakArmedAt = 0;
        applyAdaptiveTuning(runtime, settings);
        return { counted: 0, message: "신규 V2: 비보행 흔들기 잠금" };
      }
    }
  } else if (absoluteFiltered < shakeThreshold * 0.5) {
    runtime.highImpactActive = false;
    runtime.shakeHits = runtime.shakeHits.filter(
      (time) => now - time <= 900,
    );
  }

  if (
    runtime.peakArmed &&
    runtime.peakArmedAt &&
    now - runtime.peakArmedAt > RHYTHM_PEAK_TIMEOUT
  ) {
    runtime.peakArmed = false;
    runtime.peakArmedAt = 0;
  }

  if (
    runtime.filtered >= tuning.stepThreshold &&
    runtime.previousFiltered < tuning.stepThreshold
  ) {
    runtime.peakArmed = true;
    runtime.peakArmedAt = now;
  }

  if (
    runtime.peakArmed &&
    runtime.filtered <= tuning.resetThreshold &&
    runtime.previousFiltered > tuning.resetThreshold
  ) {
    runtime.peakArmed = false;
    runtime.peakArmedAt = 0;
    runtime.candidates += 1;
    return confirmRhythmCandidate(runtime, now, settings);
  }

  return { counted: 0 };
}

function emptyView(): EngineView {
  return {
    steps: 0,
    candidates: 0,
    rejected: 0,
    raw: 0,
    filtered: 0,
    lastStepAt: 0,
    interval: 0,
    cadence: 0,
    state: "대기 중",
    gait: "대기",
    effectiveStepThreshold: 0,
    effectiveResetThreshold: 0,
    effectiveMinStepInterval: 0,
    effectiveFilterRatio: 0,
  };
}

function initialSnapshot(): Snapshot {
  return {
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
    events: 0,
    lastEventAt: 0,
    legacy: emptyView(),
    rhythm: emptyView(),
  };
}

function sanitizeSettings(value: unknown): EngineSettings {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<EngineSettings>)
      : {};

  const next: EngineSettings = {
    legacy: { ...DEFAULT_SETTINGS.legacy },
    rhythm: { ...DEFAULT_SETTINGS.rhythm },
  };

  (["legacy", "rhythm"] as const).forEach((engine) => {
    const candidate = source[engine];
    if (!candidate) return;

    const stepThreshold = clamp(
      Number(candidate.stepThreshold) || next[engine].stepThreshold,
      0.3,
      3,
    );
    const resetThreshold = clamp(
      Number(candidate.resetThreshold) || next[engine].resetThreshold,
      0.05,
      Math.max(0.05, stepThreshold - 0.05),
    );

    next[engine] = {
      stepThreshold: round(stepThreshold),
      resetThreshold: round(resetThreshold),
      minStepInterval: Math.round(
        clamp(
          Number(candidate.minStepInterval) ||
            next[engine].minStepInterval,
          180,
          800,
        ),
      ),
      filterRatio: round(
        clamp(
          Number(candidate.filterRatio) || next[engine].filterRatio,
          0.05,
          0.8,
        ),
      ),
    };
  });

  return next;
}

export default function StepTestPage() {
  const [activeEngine, setActiveEngine] = useState<Engine>("rhythm");
  const [settings, setSettings] =
    useState<EngineSettings>(DEFAULT_SETTINGS);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [listening, setListening] = useState(false);
  const [sensorError, setSensorError] = useState("");
  const [targetSteps, setTargetSteps] = useState(100);
  const [startedAt, setStartedAt] = useState(0);
  const [visibility, setVisibility] = useState("활성");
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "페이지가 준비되었습니다. 테스트 목표를 선택하세요.",
  ]);

  const settingsRef = useRef<EngineSettings>(DEFAULT_SETTINGS);
  const legacyRef = useRef<LegacyRuntime>(createLegacy());
  const rhythmRef = useRef<RhythmRuntime>(createRhythm());
  const listeningRef = useRef(false);
  const eventCountRef = useRef(0);
  const sensorRef = useRef({
    x: 0,
    y: 0,
    z: 0,
    magnitude: 0,
    lastEventAt: 0,
  });
  const lastUiRef = useRef(0);
  const sensorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const pushLog = useCallback((message: string) => {
    const line = `[${logClock(Date.now())}] ${message}`;
    setLogs((current) => [line, ...current].slice(0, 40));
  }, []);

  const makeSnapshot = useCallback((): Snapshot => {
    const now = Date.now();
    const legacy = legacyRef.current;
    const rhythm = rhythmRef.current;

    legacy.recentSteps = legacy.recentSteps.filter(
      (time) => now - time <= 60000,
    );
    rhythm.recentSteps = rhythm.recentSteps.filter(
      (time) => now - time <= 60000,
    );

    const legacyState = listeningRef.current
      ? legacy.lastStepAt && now - legacy.lastStepAt <= WALK_TIMEOUT
        ? "걸음 감지 중"
        : "센서 대기 중"
      : "측정 중지";

    const rhythmState = listeningRef.current
      ? now < rhythm.shakeLockUntil
        ? "흔들기 잠금"
        : rhythm.walkingConfirmed
          ? `${rhythm.gait} · 리듬 감지 중`
          : rhythm.candidateTimes.length
            ? `활동 판별 ${Math.min(
                3,
                rhythm.candidateTimes.length,
              )}/3`
            : "센서 대기 중"
      : "측정 중지";

    return {
      ...sensorRef.current,
      events: eventCountRef.current,
      legacy: {
        steps: legacy.steps,
        candidates: legacy.candidates,
        rejected: legacy.rejected,
        raw: legacy.raw,
        filtered: legacy.filtered,
        lastStepAt: legacy.lastStepAt,
        interval:
          legacy.lastStepAt && legacy.previousStepAt
            ? legacy.lastStepAt - legacy.previousStepAt
            : 0,
        cadence: legacy.recentSteps.length,
        state: legacyState,
        gait: "기준 엔진",
        effectiveStepThreshold:
          settingsRef.current.legacy.stepThreshold,
        effectiveResetThreshold:
          settingsRef.current.legacy.resetThreshold,
        effectiveMinStepInterval:
          settingsRef.current.legacy.minStepInterval,
        effectiveFilterRatio:
          settingsRef.current.legacy.filterRatio,
      },
      rhythm: {
        steps: rhythm.steps,
        candidates: rhythm.candidates,
        rejected: rhythm.rejected,
        raw: rhythm.raw,
        filtered: rhythm.filtered,
        lastStepAt: rhythm.lastStepAt,
        interval:
          rhythm.lastStepAt && rhythm.previousStepAt
            ? rhythm.lastStepAt - rhythm.previousStepAt
            : 0,
        cadence: rhythm.recentSteps.length,
        state: rhythmState,
        gait: rhythm.gait,
        effectiveStepThreshold: rhythm.effectiveStepThreshold,
        effectiveResetThreshold: rhythm.effectiveResetThreshold,
        effectiveMinStepInterval: rhythm.effectiveMinStepInterval,
        effectiveFilterRatio: rhythm.effectiveFilterRatio,
      },
    };
  }, []);

  const refresh = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastUiRef.current < UI_REFRESH_MS) return;
      lastUiRef.current = now;
      setSnapshot(makeSnapshot());
    },
    [makeSnapshot],
  );

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acceleration =
        event.accelerationIncludingGravity ?? event.acceleration;

      if (
        acceleration?.x == null ||
        acceleration.y == null ||
        acceleration.z == null
      ) {
        return;
      }

      const x = Number(acceleration.x) || 0;
      const y = Number(acceleration.y) || 0;
      const z = Number(acceleration.z) || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      eventCountRef.current += 1;
      sensorRef.current = {
        x,
        y,
        z,
        magnitude,
        lastEventAt: now,
      };

      const legacyOutcome = processLegacy(
        legacyRef.current,
        x,
        y,
        z,
        now,
        settingsRef.current.legacy,
      );
      const rhythmOutcome = processRhythm(
        rhythmRef.current,
        magnitude,
        now,
        settingsRef.current.rhythm,
      );

      if (
        legacyOutcome.counted &&
        (legacyRef.current.steps <= 3 ||
          legacyRef.current.steps % 25 === 0)
      ) {
        pushLog(`기존 엔진 ${legacyRef.current.steps}걸음 감지`);
      }

      if (
        rhythmOutcome.counted &&
        (rhythmRef.current.steps <= 3 ||
          rhythmRef.current.steps % 25 === 0)
      ) {
        pushLog(`신규 엔진 ${rhythmRef.current.steps}걸음 감지`);
      }

      if (legacyOutcome.message) pushLog(legacyOutcome.message);
      if (rhythmOutcome.message) pushLog(rhythmOutcome.message);

      refresh();
    },
    [pushLog, refresh],
  );

  const stopMeasurement = useCallback(() => {
    if (!listeningRef.current) return;

    window.removeEventListener("devicemotion", handleMotion);
    listeningRef.current = false;
    setListening(false);

    if (sensorTimerRef.current) {
      clearTimeout(sensorTimerRef.current);
      sensorTimerRef.current = null;
    }

    refresh(true);
    pushLog("센서 측정을 중지했습니다.");
  }, [handleMotion, pushLog, refresh]);

  const startMeasurement = useCallback(async () => {
    if (listeningRef.current) return;

    setSensorError("");

    if (!window.isSecureContext) {
      const message =
        "움직임 센서는 HTTPS 또는 localhost에서만 사용할 수 있습니다.";
      setSensorError(message);
      pushLog(message);
      return;
    }

    if (typeof DeviceMotionEvent === "undefined") {
      const message =
        "이 브라우저에서는 DeviceMotionEvent를 사용할 수 없습니다.";
      setSensorError(message);
      pushLog(message);
      return;
    }

    try {
      const MotionEvent =
        DeviceMotionEvent as MotionEventConstructorWithPermission;

      if (typeof MotionEvent.requestPermission === "function") {
        const permission = await MotionEvent.requestPermission();
        if (permission !== "granted") {
          throw new Error("동작 센서 권한이 허용되지 않았습니다.");
        }
      }

      legacyRef.current = resetLegacySignal(legacyRef.current);
      rhythmRef.current = resetRhythmSignal(
        rhythmRef.current,
        settingsRef.current.rhythm,
      );

      window.addEventListener("devicemotion", handleMotion, {
        passive: true,
      });
      listeningRef.current = true;
      setListening(true);
      refresh(true);
      pushLog(
        "센서 측정을 시작했습니다. 두 알고리즘에 같은 값이 입력됩니다.",
      );

      const eventsAtStart = eventCountRef.current;
      sensorTimerRef.current = setTimeout(() => {
        if (
          listeningRef.current &&
          eventCountRef.current === eventsAtStart
        ) {
          const message =
            "8초 동안 센서값이 없습니다. 갤럭시 브라우저 권한과 HTTPS 주소를 확인하세요.";
          setSensorError(message);
          pushLog("센서 이벤트 미수신");
        }
      }, 8000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "센서 시작에 실패했습니다.";
      listeningRef.current = false;
      setListening(false);
      setSensorError(message);
      pushLog(`센서 시작 실패: ${message}`);
    }
  }, [handleMotion, pushLog, refresh]);

  const resetTest = useCallback(
    (target = targetSteps) => {
      legacyRef.current = createLegacy();
      rhythmRef.current = createRhythm(0, settingsRef.current.rhythm);
      eventCountRef.current = 0;
      sensorRef.current = {
        x: 0,
        y: 0,
        z: 0,
        magnitude: 0,
        lastEventAt: 0,
      };

      setTargetSteps(target);
      setStartedAt(Date.now());
      setSensorError("");
      setLogs([
        `[${logClock(
          Date.now(),
        )}] ${target.toLocaleString()}걸음 테스트를 시작했습니다.`,
      ]);
      refresh(true);
    },
    [refresh, targetSteps],
  );

  const beginTargetTest = useCallback(
    (target: number) => {
      resetTest(target);
      if (!listeningRef.current) void startMeasurement();
    },
    [resetTest, startMeasurement],
  );

  const updateSetting = useCallback(
    (key: SettingKey, input: number) => {
      const definition = PARAMETERS.find((item) => item.key === key);
      if (!definition || !Number.isFinite(input)) return;

      let value = clamp(input, definition.min, definition.max);
      value =
        key === "minStepInterval"
          ? Math.round(value)
          : round(value, 2);

      const current = settingsRef.current;
      const active = { ...current[activeEngine], [key]: value };

      if (key === "stepThreshold") {
        active.resetThreshold = Math.min(
          active.resetThreshold,
          round(Math.max(0.05, value - 0.05)),
        );
      }

      if (key === "resetThreshold") {
        active.resetThreshold = Math.min(
          active.resetThreshold,
          round(Math.max(0.05, active.stepThreshold - 0.05)),
        );
      }

      const next: EngineSettings = {
        ...current,
        [activeEngine]: active,
      };

      settingsRef.current = next;
      setSettings(next);

      if (activeEngine === "legacy") {
        legacyRef.current = resetLegacySignal(legacyRef.current);
      } else {
        rhythmRef.current = resetRhythmSignal(
          rhythmRef.current,
          settingsRef.current.rhythm,
        );
      }

      refresh(true);
    },
    [activeEngine, refresh],
  );

  const restoreDefaults = useCallback(() => {
    const next: EngineSettings = {
      ...settingsRef.current,
      [activeEngine]: { ...DEFAULT_SETTINGS[activeEngine] },
    };

    settingsRef.current = next;
    setSettings(next);

    if (activeEngine === "legacy") {
      legacyRef.current = resetLegacySignal(legacyRef.current);
    } else {
      rhythmRef.current = resetRhythmSignal(
        rhythmRef.current,
        settingsRef.current.rhythm,
      );
    }

    refresh(true);
    pushLog(`${engineName(activeEngine)} 기본값을 복원했습니다.`);
  }, [activeEngine, pushLog, refresh]);

  const copyResult = useCallback(async () => {
    const result = {
      test: "TTOK LIFE STEP TEST V2",
      targetSteps,
      startedAt: startedAt
        ? new Date(startedAt).toISOString()
        : null,
      capturedAt: new Date().toISOString(),
      activeEngine,
      settings: settingsRef.current,
      result: {
        legacy: {
          detected: snapshot.legacy.steps,
          difference: snapshot.legacy.steps - targetSteps,
          candidates: snapshot.legacy.candidates,
          rejected: snapshot.legacy.rejected,
          interval: snapshot.legacy.interval,
          cadence: snapshot.legacy.cadence,
        },
        rhythm: {
          detected: snapshot.rhythm.steps,
          difference: snapshot.rhythm.steps - targetSteps,
          candidates: snapshot.rhythm.candidates,
          rejected: snapshot.rhythm.rejected,
          interval: snapshot.rhythm.interval,
          cadence: snapshot.rhythm.cadence,
          gait: snapshot.rhythm.gait,
          effectiveTuning: {
            stepThreshold: snapshot.rhythm.effectiveStepThreshold,
            resetThreshold: snapshot.rhythm.effectiveResetThreshold,
            minStepInterval: snapshot.rhythm.effectiveMinStepInterval,
            filterRatio: snapshot.rhythm.effectiveFilterRatio,
          },
        },
      },
      sensorEvents: snapshot.events,
      userAgent: navigator.userAgent,
    };

    const text = JSON.stringify(result, null, 2);

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    pushLog("현재 설정과 결과를 복사했습니다.");

    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
  }, [
    activeEngine,
    pushLog,
    snapshot,
    startedAt,
    targetSteps,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          activeEngine?: Engine;
          settings?: unknown;
        };
        const restored = sanitizeSettings(parsed.settings);
        const restoredEngine: Engine =
          parsed.activeEngine === "legacy" ? "legacy" : "rhythm";

        settingsRef.current = restored;
        setSettings(restored);
        setActiveEngine(restoredEngine);
      }
    } catch {
      // 잘못된 테스트 설정은 기본값으로 무시합니다.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeEngine, settings }),
    );
  }, [activeEngine, hydrated, settings]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const next = document.hidden ? "백그라운드" : "활성";
      setVisibility(next);
      if (document.hidden) {
        pushLog(
          "화면이 백그라운드로 이동했습니다. 센서가 중단될 수 있습니다.",
        );
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, [pushLog]);

  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      listeningRef.current = false;

      if (sensorTimerRef.current) {
        clearTimeout(sensorTimerRef.current);
      }
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, [handleMotion]);

  const activeSettings = settings[activeEngine];
  const activeView = snapshot[activeEngine];
  const activeStepThreshold =
    activeView.effectiveStepThreshold || activeSettings.stepThreshold;
  const activeDifference = activeView.steps - targetSteps;
  const activeAccuracy = useMemo(() => {
    if (!targetSteps) return 0;
    return Math.max(
      0,
      100 -
        (Math.abs(activeView.steps - targetSteps) / targetSteps) *
          100,
    );
  }, [activeView.steps, targetSteps]);

  const secureText =
    typeof window === "undefined"
      ? "확인 중"
      : window.isSecureContext
        ? "HTTPS 정상"
        : "HTTPS 필요";

  const supportText =
    typeof window === "undefined"
      ? "확인 중"
      : typeof DeviceMotionEvent === "undefined"
        ? "미지원"
        : "지원";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              TTOK LIFE · PEDOMETER LAB
            </p>
            <h1>만보기 알고리즘 테스트</h1>
            <p className={styles.intro}>
              산책 UI와 게임 데이터는 건드리지 않고 이 페이지에서만
              휴대폰 센서와 걸음 감지값을 비교합니다.
            </p>
          </div>
          <div
            className={`${styles.status} ${
              listening ? styles.running : ""
            }`}
          >
            <span />
            {listening ? "측정 중" : "대기 중"}
          </div>
        </header>

        <section className={styles.card}>
          <SectionTitle
            kicker="STEP TEST"
            title={`${targetSteps.toLocaleString()}걸음 실측 테스트`}
            badge={`화면 ${visibility}`}
          />

          <div className={styles.targets}>
            {[100, 300, 1000].map((target) => (
              <button
                key={target}
                type="button"
                className={
                  targetSteps === target ? styles.activeTarget : ""
                }
                onClick={() => beginTargetTest(target)}
              >
                {target.toLocaleString()}걸음 테스트
              </button>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={listening}
              onClick={() => void startMeasurement()}
            >
              {listening
                ? "센서 측정 중"
                : "센서 권한 허용 및 측정 시작"}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={!listening}
              onClick={stopMeasurement}
            >
              측정 중지
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => resetTest(targetSteps)}
            >
              카운터 초기화
            </button>
          </div>

          {sensorError && (
            <p className={styles.error} role="alert">
              {sensorError}
            </p>
          )}

          <p className={styles.note}>
            갤럭시를 평소처럼 바지 주머니에 넣고 정확히{" "}
            {targetSteps.toLocaleString()}걸음을 걸은 뒤 두 결과를
            확인하세요. 측정 중에는 화면을 켜 둡니다.
          </p>
        </section>

        <section className={styles.card}>
          <SectionTitle
            kicker="ALGORITHM SWITCH"
            title="비교 알고리즘 선택"
          />

          <div className={styles.engineSwitch}>
            <button
              type="button"
              className={
                activeEngine === "legacy" ? styles.selectedEngine : ""
              }
              aria-pressed={activeEngine === "legacy"}
              onClick={() => setActiveEngine("legacy")}
            >
              <strong>기존</strong>
              현재 walk 방식
            </button>
            <button
              type="button"
              className={
                activeEngine === "rhythm" ? styles.selectedEngine : ""
              }
              aria-pressed={activeEngine === "rhythm"}
              onClick={() => setActiveEngine("rhythm")}
            >
              <strong>신규</strong>
              걷기·달리기 자동 판별 V2
            </button>
          </div>

          <p className={styles.note}>
            선택한 엔진만 크게 표시하지만 같은 센서값이 두 엔진에
            동시에 입력되므로 같은 걸음으로 바로 비교할 수 있습니다.
          </p>
        </section>

        <section className={`${styles.card} ${styles.liveCard}`}>
          <div className={styles.liveHead}>
            <div>
              <span>{engineName(activeEngine)}</span>
              <strong>{activeView.state}</strong>
            </div>
            <b>목표 {targetSteps.toLocaleString()}</b>
          </div>

          <div className={styles.bigCount}>
            <strong>{activeView.steps.toLocaleString()}</strong>
            <span>감지</span>
          </div>

          <div className={styles.progress}>
            <div
              style={{
                width: `${Math.min(
                  100,
                  (activeView.steps / targetSteps) * 100,
                )}%`,
              }}
            />
          </div>

          <div className={styles.resultGrid}>
            <ResultCell
              label="목표 대비"
              value={`${activeDifference > 0 ? "+" : ""}${activeDifference}걸음`}
              tone={
                activeDifference === 0
                  ? "good"
                  : activeDifference > 0
                    ? "bad"
                    : "normal"
              }
            />
            <ResultCell
              label="실측 완료 후 정확도"
              value={`${activeAccuracy.toFixed(1)}%`}
            />
            <ResultCell
              label="마지막 감지"
              value={clockText(activeView.lastStepAt)}
            />
          </div>
        </section>

        <section className={styles.compareGrid}>
          <CompareCard
            title="기존 알고리즘"
            code="LEGACY"
            selected={activeEngine === "legacy"}
            view={snapshot.legacy}
            difference={snapshot.legacy.steps - targetSteps}
          />
          <CompareCard
            title="신규 적응형 알고리즘 V2"
            code="RHYTHM V2"
            selected={activeEngine === "rhythm"}
            view={snapshot.rhythm}
            difference={snapshot.rhythm.steps - targetSteps}
          />
        </section>

        <section className={styles.card}>
          <SectionTitle
            kicker="LIVE SENSOR"
            title="실시간 센서값"
            badge={`${snapshot.events.toLocaleString()} events`}
          />

          <div className={styles.axisGrid}>
            <SensorCell label="X" value={signalText(snapshot.x)} />
            <SensorCell label="Y" value={signalText(snapshot.y)} />
            <SensorCell label="Z" value={signalText(snapshot.z)} />
            <SensorCell
              label="MAG"
              value={signalText(snapshot.magnitude)}
            />
          </div>

          <div className={styles.signalGrid}>
            <MetricRow
              label="현재 raw"
              value={signalText(activeView.raw)}
            />
            <MetricRow
              label="현재 filtered"
              value={signalText(activeView.filtered)}
            />
            <MetricRow
              label="실제 감지횟수"
              value={`${activeView.steps.toLocaleString()}회`}
            />
            <MetricRow
              label="마지막 감지시간"
              value={clockText(activeView.lastStepAt)}
            />
            <MetricRow
              label="자동 활동 판별"
              value={
                activeEngine === "rhythm"
                  ? activeView.gait
                  : "사용 안 함"
              }
            />
            <MetricRow
              label="실효 최소 간격"
              value={`${activeView.effectiveMinStepInterval}ms`}
            />
            <MetricRow
              label="실효 STEP_THRESHOLD"
              value={activeView.effectiveStepThreshold.toFixed(2)}
            />
            <MetricRow
              label="실효 FILTER_RATIO"
              value={activeView.effectiveFilterRatio.toFixed(2)}
            />
          </div>

          <div className={styles.meter} aria-hidden="true">
            <div
              style={{
                width: `${Math.min(
                  100,
                  (Math.abs(activeView.filtered) /
                    Math.max(
                      0.1,
                      activeStepThreshold * 1.8,
                    )) *
                    100,
                )}%`,
              }}
            />
            <i
              style={{
                left: `${Math.min(
                  96,
                  (activeStepThreshold /
                    Math.max(
                      0.1,
                      activeStepThreshold * 1.8,
                    )) *
                    100,
                )}%`,
              }}
            />
          </div>
        </section>

        <section className={styles.card}>
          <SectionTitle
            kicker="TUNING"
            title={`${engineName(activeEngine)} 설정`}
            action={
              <button
                type="button"
                className={styles.smallButton}
                onClick={restoreDefaults}
              >
                기본값 복원
              </button>
            }
          />

          <div className={styles.settings}>
            {PARAMETERS.map((parameter) => {
              const value = activeSettings[parameter.key];
              const shown =
                parameter.key === "minStepInterval"
                  ? String(Math.round(value))
                  : value.toFixed(2);

              return (
                <label
                  key={parameter.key}
                  className={styles.setting}
                >
                  <div className={styles.settingHead}>
                    <div>
                      <strong>{parameter.label}</strong>
                      <span>{parameter.help}</span>
                    </div>
                    <output>
                      {shown}
                      {parameter.unit}
                    </output>
                  </div>
                  <div className={styles.settingControls}>
                    <input
                      type="range"
                      min={parameter.min}
                      max={parameter.max}
                      step={parameter.step}
                      value={value}
                      onChange={(
                        event: ChangeEvent<HTMLInputElement>,
                      ) =>
                        updateSetting(
                          parameter.key,
                          Number(event.currentTarget.value),
                        )
                      }
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      min={parameter.min}
                      max={parameter.max}
                      step={parameter.step}
                      value={shown}
                      aria-label={`${parameter.label} 직접 입력`}
                      onChange={(
                        event: ChangeEvent<HTMLInputElement>,
                      ) =>
                        updateSetting(
                          parameter.key,
                          Number(event.currentTarget.value),
                        )
                      }
                    />
                  </div>
                </label>
              );
            })}
          </div>

          <p className={styles.note}>
            값 변경 즉시 현재 엔진의 필터 상태만 초기화되고 감지
            걸음 수는 유지됩니다. 신규 V2에서는 입력값을 걷기 기준값으로
            사용하고 활동 판별 결과에 따라 실효값을 자동 보정합니다.
            RESET_THRESHOLD는 STEP_THRESHOLD보다 낮게 자동 제한됩니다.
          </p>
        </section>

        <section className={styles.card}>
          <SectionTitle kicker="ENVIRONMENT" title="테스트 환경" />
          <div className={styles.environment}>
            <MetricRow label="보안 연결" value={secureText} />
            <MetricRow label="센서 지원" value={supportText} />
            <MetricRow label="화면 상태" value={visibility} />
            <MetricRow
              label="마지막 센서 수신"
              value={clockText(snapshot.lastEventAt)}
            />
          </div>
        </section>

        <section className={styles.card}>
          <SectionTitle
            kicker="TEST LOG"
            title="감지 로그"
            action={
              <button
                type="button"
                className={styles.smallButton}
                onClick={() => void copyResult()}
              >
                {copied ? "복사 완료" : "결과 복사"}
              </button>
            }
          />
          <pre className={styles.log}>{logs.join("\n")}</pre>
        </section>

        <details className={`${styles.card} ${styles.details}`}>
          <summary>두 알고리즘의 차이 보기</summary>
          <p>
            <strong>기존 알고리즘</strong>은 축별 중력을 제거한
            필터값이 STEP_THRESHOLD를 넘는 순간 1걸음을 반영합니다.
            현재 산책 페이지와 비교하기 위한 기준 엔진입니다.
          </p>
          <p>
            <strong>신규 적응형 알고리즘 V2</strong>는 상승과 하강이
            끝난 움직임을 후보로 만들고 최근 간격의 중앙값으로
            걷기·빠른 걷기·조깅·달리기를 자동 판별합니다. 판별된
            활동에 따라 최소 간격, 임계값, 리셋값, 필터 비율을
            자동 보정하며 3회 연속 리듬 확인 방식은 그대로 유지합니다.
          </p>
        </details>

        <footer className={styles.footer}>
          TTOK LIFE STEP TEST V2 · 독립 테스트 페이지
          <br />
          GameContext와 app/walk/page.tsx의 값을 읽거나 변경하지
          않습니다.
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({
  kicker,
  title,
  badge,
  action,
}: {
  kicker: string;
  title: string;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action ?? (badge ? <b>{badge}</b> : null)}
    </div>
  );
}

function ResultCell({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "good" | "bad";
}) {
  return (
    <div className={styles.resultCell}>
      <span>{label}</span>
      <strong
        className={
          tone === "good"
            ? styles.good
            : tone === "bad"
              ? styles.bad
              : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

function CompareCard({
  title,
  code,
  selected,
  view,
  difference,
}: {
  title: string;
  code: string;
  selected: boolean;
  view: EngineView;
  difference: number;
}) {
  return (
    <article
      className={`${styles.compareCard} ${
        selected ? styles.selectedCompare : ""
      }`}
    >
      <div className={styles.compareHead}>
        <span>{title}</span>
        <b>{code}</b>
      </div>
      <strong>{view.steps.toLocaleString()}</strong>
      <p>
        목표 대비 {difference > 0 ? "+" : ""}
        {difference}걸음
      </p>
      <dl>
        <div>
          <dt>후보</dt>
          <dd>{view.candidates}</dd>
        </div>
        <div>
          <dt>제외</dt>
          <dd>{view.rejected}</dd>
        </div>
        <div>
          <dt>최근 간격</dt>
          <dd>{view.interval || 0}ms</dd>
        </div>
      </dl>
    </article>
  );
}

function SensorCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.sensorCell}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.metricRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}