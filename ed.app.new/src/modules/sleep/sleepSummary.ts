import {
  calculateCircadianAlignment,
  getCircadianEducation,
  getEducationTier,
  type EducationTier,
} from './circadian';
import {
  calibrateSleepScore,
  calculateSleepScore,
  type SleepScoreBreakdown,
  type SleepStageMinutes,
} from './sleepScoring';
import type { SleepData } from './types';

export type SignalsSource = 'manual' | 'browser-estimate' | 'wearable' | 'native-device';

export type EstimatedStateProxy = {
  alpha: number;
  theta: number;
  beta: number;
};

export type NightlySleepSummary = {
  id: string;
  sleepDate: string;
  sleepStart: string;
  sleepEnd: string;
  timeInBedMinutes: number;
  totalSleepMinutes: number;
  targetSleepMinutes: number;
  stageMinutes: SleepStageMinutes;
  sleepEfficiency: number;
  awakenings: number;
  wasoMinutes: number;
  movementIndex: number;
  snoreIndex: number;
  sleepTalkIndex: number;
  heartRateAvg?: number;
  heartRateVariability?: number;
  circadianAlignmentScore: number;
  circadianDriftMinutes: number;
  preferredWindow: { startMinute: number; endMinute: number };
  actualWindow: { startMinute: number; endMinute: number };
  estimatedStateProxy: EstimatedStateProxy;
  scoreBreakdown: SleepScoreBreakdown;
  algorithmicSleepScore: number;
  restednessScore?: number;
  calibrationOffset: number;
  calibratedSleepScore: number;
  moodValence?: number;
  dreamLogged: boolean;
  dreamId?: string;
  dreamTitle?: string;
  dreamEmotion?: string;
  dreamCategory?: string;
  dreamAssetUrl?: string;
  dreamAssetScore?: number;
  educationTier: EducationTier;
  educationText: string;
  signalsSource: SignalsSource;
};

export type TrackerSettings = {
  alarmTime?: string;
  preferredBedtime?: string;
  preferredWakeTime?: string;
  targetSleepDuration?: number;
};

export type DreamLike = {
  id: string;
  date?: string;
  content?: string;
  nugget?: string;
  narrative?: string;
  emotion?: string;
  category?: string;
  sleepData?: Record<string, unknown>;
  generatedImage?: {
    url?: string;
  };
  assetMetadata?: {
    rarityScore?: number | string;
  };
  context?: {
    mood?: string;
    sleepQuality?: number;
  };
  isSample?: boolean;
};

export type WearableSleepLike = {
  id?: string | number;
  date?: string;
  source?: string;
  bedtime?: string;
  wakeTime?: string;
  sleepDuration?: number;
  sleepQuality?: number;
  remDuration?: number;
  deepDuration?: number;
  movement?: number;
  heartRate?: { avg?: number };
  hrv?: number;
  stages?: Array<{ phase?: string; duration?: number }>;
};

type CreateSummaryInput = {
  id: string;
  sleepStart: string;
  sleepEnd: string;
  targetSleepMinutes: number;
  stageMinutes: SleepStageMinutes;
  awakenings?: number;
  wasoMinutes?: number;
  movementIndex?: number;
  snoreIndex?: number;
  sleepTalkIndex?: number;
  heartRateAvg?: number;
  heartRateVariability?: number;
  restednessScore?: number;
  calibrationOffset?: number;
  signalsSource: SignalsSource;
  settings?: TrackerSettings;
};

export function createNightlySummary(input: CreateSummaryInput): NightlySleepSummary {
  const stageMinutes = normalizeStageMinutes(input.stageMinutes);
  const sleepStart = new Date(input.sleepStart);
  const sleepEnd = new Date(input.sleepEnd);
  const timeInBedMinutes = Math.max(0, Math.round((sleepEnd.getTime() - sleepStart.getTime()) / 60000));
  const totalSleepMinutes = Math.max(0, stageMinutes.light + stageMinutes.deep + stageMinutes.rem);
  const sleepEfficiency = timeInBedMinutes > 0 ? Math.round((totalSleepMinutes / timeInBedMinutes) * 100) : 0;
  const preferredWakeTime =
    input.settings?.preferredWakeTime || input.settings?.alarmTime || '06:30';
  const preferredBedtime = input.settings?.preferredBedtime || '22:30';
  const circadian = calculateCircadianAlignment(
    sleepStart,
    sleepEnd,
    preferredBedtime,
    preferredWakeTime,
    input.targetSleepMinutes
  );
  const score = calculateSleepScore({
    totalSleepMinutes,
    targetSleepMinutes: input.targetSleepMinutes,
    timeInBedMinutes,
    stageMinutes,
    awakenings: input.awakenings || 0,
    wasoMinutes: input.wasoMinutes || 0,
    circadianAlignmentScore: circadian.score,
    movementIndex: input.movementIndex || 0,
    snoreIndex: input.snoreIndex || 0,
    sleepTalkIndex: input.sleepTalkIndex || 0,
  });
  const calibration = calibrateSleepScore(
    score.score,
    input.restednessScore,
    input.calibrationOffset || 0
  );
  const educationTier = getEducationTier(calibration.calibratedScore, circadian.score);

  return {
    id: input.id,
    sleepDate: toDateKey(sleepEnd),
    sleepStart: sleepStart.toISOString(),
    sleepEnd: sleepEnd.toISOString(),
    timeInBedMinutes,
    totalSleepMinutes,
    targetSleepMinutes: input.targetSleepMinutes,
    stageMinutes,
    sleepEfficiency,
    awakenings: input.awakenings || 0,
    wasoMinutes: input.wasoMinutes || 0,
    movementIndex: Math.max(0, input.movementIndex || 0),
    snoreIndex: Math.max(0, input.snoreIndex || 0),
    sleepTalkIndex: Math.max(0, input.sleepTalkIndex || 0),
    heartRateAvg: input.heartRateAvg,
    heartRateVariability: input.heartRateVariability,
    circadianAlignmentScore: circadian.score,
    circadianDriftMinutes: circadian.driftMinutes,
    preferredWindow: circadian.preferredWindow,
    actualWindow: circadian.actualWindow,
    estimatedStateProxy: estimateStateProxy(stageMinutes, input.movementIndex || 0),
    scoreBreakdown: score.breakdown,
    algorithmicSleepScore: score.score,
    restednessScore: input.restednessScore,
    calibrationOffset: calibration.calibrationOffset,
    calibratedSleepScore: calibration.calibratedScore,
    dreamLogged: false,
    educationTier,
    educationText: getCircadianEducation(educationTier),
    signalsSource: input.signalsSource,
  };
}

export function mapLegacySleepDataToSummary(
  sleepData: SleepData,
  settings?: TrackerSettings
): NightlySleepSummary | null {
  if (!sleepData || !sleepData.sleepOnset || !sleepData.wakeTime) return null;

  return createNightlySummary({
    id: `session-${sleepData.timestamp}`,
    sleepStart: new Date(sleepData.sleepOnset).toISOString(),
    sleepEnd: new Date(sleepData.wakeTime).toISOString(),
    targetSleepMinutes: getTargetSleepMinutes(settings),
    stageMinutes: normalizeStageMinutes(sleepData.stageBreakdown),
    awakenings: sleepData.awakenings,
    wasoMinutes: sleepData.waso,
    movementIndex: sleepData.motionMetrics?.totalMovement || 0,
    snoreIndex: sleepData.audioMetrics?.ambientNoise ? sleepData.audioMetrics.ambientNoise * 100 : 0,
    sleepTalkIndex: sleepData.audioMetrics?.detectedSpeech ? 45 : 0,
    restednessScore: sleepData.userReportScore,
    calibrationOffset: sleepData.calibrationOffset,
    signalsSource: 'browser-estimate',
    settings,
  });
}

export function mapWearableSleepToSummary(
  session: WearableSleepLike,
  settings?: TrackerSettings
): NightlySleepSummary | null {
  const wakeTime = session.wakeTime || session.date;
  if (!wakeTime) return null;

  const duration = Math.max(0, Number(session.sleepDuration) || 450);
  const end = new Date(wakeTime);
  const start = session.bedtime
    ? new Date(session.bedtime)
    : new Date(end.getTime() - (duration + 25) * 60000);
  const stageMinutes = stagesFromWearable(session, duration);

  return createNightlySummary({
    id: `wearable-${session.id || end.getTime()}`,
    sleepStart: start.toISOString(),
    sleepEnd: end.toISOString(),
    targetSleepMinutes: getTargetSleepMinutes(settings),
    stageMinutes,
    awakenings: 2,
    wasoMinutes: stageMinutes.awake,
    movementIndex: Number(session.movement) || 18,
    snoreIndex: 12,
    sleepTalkIndex: 6,
    heartRateAvg: session.heartRate?.avg,
    heartRateVariability: session.hrv,
    restednessScore: session.sleepQuality ? Math.round(Number(session.sleepQuality) / 10) : undefined,
    signalsSource: session.source === 'apple_watch' ? 'wearable' : 'manual',
    settings,
  });
}

export function mapDreamSleepToSummary(
  dream: DreamLike,
  settings?: TrackerSettings
): NightlySleepSummary | null {
  const data = dream.sleepData;
  if (!dream.date || !data) return null;

  const wake = data.wakeTime ? new Date(String(data.wakeTime)) : new Date(dream.date);
  const duration = Math.max(0, Number(data.sleepDuration) || 0);
  const start = data.bedtime
    ? new Date(String(data.bedtime))
    : new Date(wake.getTime() - Math.max(duration + 20, 420) * 60000);
  const rem = Math.max(0, Number(data.estimatedREM) || Number(data.remDuration) || Math.round(duration * 0.22));
  const deep = Math.max(0, Number(data.deepDuration) || Math.round(duration * 0.18));
  const awake = Math.max(10, Math.round((100 - Number(data.quality || data.sleepQuality || 76)) / 2));
  const light = Math.max(0, duration - rem - deep);

  return attachDreamToSummary(
    createNightlySummary({
      id: `dream-sleep-${dream.id}`,
      sleepStart: start.toISOString(),
      sleepEnd: wake.toISOString(),
      targetSleepMinutes: getTargetSleepMinutes(settings),
      stageMinutes: normalizeStageMinutes({ awake, light, deep, rem }),
      awakenings: Math.max(1, Math.round(awake / 12)),
      wasoMinutes: awake,
      movementIndex: Number(data.movementScore) || Number(data.movement) || 24,
      snoreIndex: 10,
      sleepTalkIndex: 8,
      restednessScore: data.quality ? Math.round(Number(data.quality) / 10) : undefined,
      signalsSource: data.source === 'apple_watch' ? 'wearable' : 'manual',
      settings,
    }),
    dream
  );
}

export function attachDreamToSummary(
  summary: NightlySleepSummary,
  dream: DreamLike
): NightlySleepSummary {
  return {
    ...summary,
    moodValence: inferMoodValence(dream),
    dreamLogged: true,
    dreamId: dream.id,
    dreamTitle: dream.nugget || dream.narrative || dream.content?.slice(0, 90) || 'Dream captured',
    dreamEmotion: dream.emotion || dream.context?.mood,
    dreamCategory: dream.category,
    dreamAssetUrl: dream.generatedImage?.url,
    dreamAssetScore: Number(dream.assetMetadata?.rarityScore) || undefined,
  };
}

export function buildDemoSleepSummaries(
  settings?: TrackerSettings,
  anchorDate = new Date()
): NightlySleepSummary[] {
  const dayOffsets = [6, 5, 4, 3, 2, 1, 0];
  const scores = [
    { deep: 88, rem: 108, light: 258, awake: 18, movement: 16 },
    { deep: 62, rem: 82, light: 252, awake: 42, movement: 44 },
    { deep: 84, rem: 118, light: 270, awake: 15, movement: 18 },
    { deep: 50, rem: 72, light: 230, awake: 55, movement: 58 },
    { deep: 92, rem: 124, light: 246, awake: 20, movement: 20 },
    { deep: 76, rem: 96, light: 250, awake: 28, movement: 26 },
    { deep: 64, rem: 90, light: 244, awake: 34, movement: 34 },
  ];

  return dayOffsets.map((offset, index) => {
    const wake = new Date(anchorDate);
    wake.setHours(6 + (index % 3), index % 2 === 0 ? 30 : 50, 0, 0);
    wake.setDate(wake.getDate() - offset);
    const stageMinutes = normalizeStageMinutes({
      awake: scores[index].awake,
      light: scores[index].light,
      deep: scores[index].deep,
      rem: scores[index].rem,
    });
    const sleepMinutes = stageMinutes.light + stageMinutes.deep + stageMinutes.rem;
    const start = new Date(wake.getTime() - (sleepMinutes + stageMinutes.awake) * 60000);

    return createNightlySummary({
      id: `demo-${toDateKey(wake)}`,
      sleepStart: start.toISOString(),
      sleepEnd: wake.toISOString(),
      targetSleepMinutes: getTargetSleepMinutes(settings),
      stageMinutes,
      awakenings: Math.max(1, Math.round(stageMinutes.awake / 14)),
      wasoMinutes: stageMinutes.awake,
      movementIndex: scores[index].movement,
      snoreIndex: index % 3 === 0 ? 28 : 12,
      sleepTalkIndex: index % 4 === 0 ? 18 : 6,
      signalsSource: 'manual',
      settings,
    });
  });
}

export function toDateKey(value: string | number | Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTargetSleepMinutes(settings?: TrackerSettings): number {
  const hours = Number(settings?.targetSleepDuration);
  return Math.round((Number.isFinite(hours) && hours > 0 ? hours : 8) * 60);
}

export function normalizeStageMinutes(stageMinutes: Partial<SleepStageMinutes>): SleepStageMinutes {
  return {
    awake: Math.max(0, Math.round(Number(stageMinutes.awake) || 0)),
    light: Math.max(0, Math.round(Number(stageMinutes.light) || 0)),
    deep: Math.max(0, Math.round(Number(stageMinutes.deep) || 0)),
    rem: Math.max(0, Math.round(Number(stageMinutes.rem) || 0)),
  };
}

function stagesFromWearable(session: WearableSleepLike, duration: number): SleepStageMinutes {
  if (Array.isArray(session.stages) && session.stages.length > 0) {
    const stages = session.stages.reduce<Partial<SleepStageMinutes>>((acc, stage) => {
      const phase = normalizeStageName(stage.phase);
      acc[phase] = (acc[phase] || 0) + Math.max(0, Number(stage.duration) || 0);
      return acc;
    }, {});
    return normalizeStageMinutes(stages);
  }

  const rem = Math.max(0, Number(session.remDuration) || Math.round(duration * 0.22));
  const deep = Math.max(0, Number(session.deepDuration) || Math.round(duration * 0.18));
  const awake = 24;
  const light = Math.max(0, duration - rem - deep);

  return normalizeStageMinutes({ awake, light, deep, rem });
}

function normalizeStageName(value?: string): keyof SleepStageMinutes {
  if (value === 'deep' || value === 'rem' || value === 'awake') return value;
  return 'light';
}

function estimateStateProxy(stageMinutes: SleepStageMinutes, movementIndex: number): EstimatedStateProxy {
  const total = Math.max(1, stageMinutes.awake + stageMinutes.light + stageMinutes.deep + stageMinutes.rem);
  const alpha = Math.round(((stageMinutes.light + stageMinutes.awake * 0.35) / total) * 100);
  const theta = Math.round(((stageMinutes.deep + stageMinutes.rem * 0.45) / total) * 100);
  const beta = Math.round(Math.min(100, movementIndex * 0.55 + (stageMinutes.awake / total) * 100));

  return { alpha, theta, beta };
}

function inferMoodValence(dream: DreamLike): number | undefined {
  const source = `${dream.emotion || ''} ${dream.category || ''} ${dream.context?.mood || ''}`.toLowerCase();
  if (!source.trim()) return undefined;
  if (/(joy|happy|peace|calm|love|excited|curious|adventure)/.test(source)) return 4;
  if (/(nightmare|fear|angry|sad|anxious|tired)/.test(source)) return -3;
  return 0;
}
