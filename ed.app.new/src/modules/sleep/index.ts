/**
 * Sleep Module Exports
 */

export type {
  SleepData,
  CircadianMetrics,
  SleepSession,
  MotionEvent,
  AudioFeaturePoint,
  SleepScore,
  MorningCheckIn,
  SleepSettings,
  PrivacyConsent,
  SleepStage,
  WakeWindow,
  WakeTrigger,
  WakeNotification,
} from './types';

export { sleepSessionManager } from './sleepSession';
export { motionSensorManager } from './motionSensor';
export { audioRecorderManager } from './audioRecorder';
export { SmartWakeManager } from './smartWakeManager';
export { wakeNotificationManager } from './notificationManager';
export { sleepStageDetector } from './stageDetection';
export { sleepScoreCalculator } from './scoreCalculator';
export { generateDreamAssets } from './dreamAssetGenerator';
export {
  calculateSleepScore,
  calibrateSleepScore,
  clampScore,
  getSleepQualityLabel,
  getSleepQualitySymbol,
} from './sleepScoring';
export {
  buildPreferredSleepWindow,
  calculateCircadianAlignment,
  formatClockMinute,
  getCircadianEducation,
  getEducationTier,
  minuteToPercent,
} from './circadian';
export {
  attachDreamToSummary,
  buildDemoSleepSummaries,
  createNightlySummary,
  getTargetSleepMinutes,
  mapDreamSleepToSummary,
  mapLegacySleepDataToSummary,
  mapWearableSleepToSummary,
  normalizeStageMinutes,
  toDateKey,
} from './sleepSummary';
export { buildMonthlySleepReport } from './monthlyReport';

export type { MotionSensorConfig } from './motionSensor';
export type { AudioRecorderConfig } from './audioRecorder';
export type { StageDetectionConfig } from './stageDetection';
export type { SleepScoringConfig } from './scoreCalculator';
export type {
  SleepScoreBreakdown,
  SleepScoreInput,
  SleepScoreResult,
  SleepStageMinutes,
} from './sleepScoring';
export type { CircadianAlignment, CircadianWindow, EducationTier } from './circadian';
export type {
  DreamLike,
  EstimatedStateProxy,
  NightlySleepSummary,
  SignalsSource,
  TrackerSettings,
  WearableSleepLike,
} from './sleepSummary';
export type {
  MonthlyDreamHighlight,
  MonthlySleepReport,
  WeeklySleepBreakdown,
} from './monthlyReport';
