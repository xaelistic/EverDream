/**
 * Sleep Cycle & Circadian Intelligence Module - Type Definitions
 * Phase 1 MVP: Sleep tracking, stage detection, and score calculation
 */

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem';

export interface SleepData {
  /** Session timestamp (when sleep started) */
  timestamp: number;
  /** Total sleep duration in minutes */
  totalDuration: number;
  /** Time in each stage (minutes) */
  stageBreakdown: Record<SleepStage, number>;
  /** Number of detected awakenings */
  awakenings: number;
  /** Wake after sleep onset in minutes */
  waso: number;
  /** Sleep efficiency % (total sleep / time in bed) */
  efficiency: number;
  /** Algorithmic sleep score (0-100) */
  algorithmicScore: number;
  /** User's morning self-report (1-10) */
  userReportScore?: number;
  /** Calibration offset for this user's algorithm */
  calibrationOffset?: number;
  /** Raw motion data (aggregated) */
  motionMetrics?: {
    totalMovement: number;
    movementFrequency: number; // awakenings detected
    stdDeviation: number; // stillness consistency
  };
  /** Raw audio features (privacy-first aggregates only) */
  audioMetrics?: {
    detectedBreathing: boolean;
    detectedSpeech: boolean;
    ambientNoise: number; // 0-1 normalized
    estimatedREM: number; // 0-1 confidence REM based on audio cues
  };
  /** Circadian data */
  sleepOnset: number; // timestamp
  wakeTime: number; // timestamp
  chronotypeEstimate?: 'early-bird' | 'intermediate' | 'night-owl';
}

export interface CircadianMetrics {
  /** User's detected natural sleep onset time (in minutes after midnight) */
  naturalOnsetTime: number;
  /** User's detected natural wake time */
  naturalWakeTime: number;
  /** Consistency score (0-100) based on variance over past 7 days */
  consistencyScore: number;
  /** Estimated chronotype */
  chronotype: 'early-bird' | 'intermediate' | 'night-owl';
  /** How aligned current sleep window is to optimal (0-100) */
  alignmentScore: number;
  /** Historical sleep data for averaging */
  recentSleepData: SleepData[];
}

export interface SleepSession {
  /** Unique session ID */
  id: string;
  /** When user initiated sleep session */
  startTime: number;
  /** When user ended session (null if ongoing) */
  endTime: number | null;
  /** Is session currently active? */
  isActive: boolean;
  /** Raw motion events collected during session */
  motionEvents: MotionEvent[];
  /** Raw audio feature points */
  audioFeatures: AudioFeaturePoint[];
  /** Final computed sleep data (null until session ends) */
  sleepData: SleepData | null;
}

export interface MotionEvent {
  timestamp: number;
  /** Acceleration magnitude (0-1 normalized) */
  acceleration: number;
  /** Rotation rate magnitude */
  rotation: number;
}

export interface AudioFeaturePoint {
  timestamp: number;
  /** Energy level of audio (0-1) */
  energy: number;
  /** Spectral centroid (proxy for speech/breathing) */
  spectralFeature: number;
}

export interface SleepScore {
  score: number; // 0-100
  breakdown: {
    stageQuality: number; // Deep + REM weighted
    continuity: number; // Penalize WASO
    duration: number; // vs. target (7-9 hours)
    efficiency: number; // Sleep time / time in bed
  };
  recommendation: string;
  isAlignedWithCircadian: boolean;
}

export interface MorningCheckIn {
  /** When user submitted check-in */
  timestamp: number;
  /** How rested they felt (1-10) */
  restednessScore: number;
  /** Optional comment */
  comment?: string;
  /** Associated sleep session ID */
  sleepSessionId: string;
  /** Optional dream video URI */
  dreamVideoUri?: string;
}

export interface DreamAsset {
  id: string;
  dreamText?: string;
  prompt: string;
  url: string;
  source: 'pollinations' | 'replicate' | 'puter' | 'fallback';
  style: string;
  generatedAt: string;
  metadata?: {
    provider?: string;
    engine?: string;
    model?: string;
    note?: string;
    generatedAt?: number;
  };
}

export interface WakeWindow {
  /** User-defined wake window start (HH:MM) */
  startTime: string;
  /** User-defined wake window end (HH:MM) */
  endTime: string;
  /** Optimal wake time within window based on sleep data */
  optimalWakeTime?: Date;
  /** Confidence in optimal time (0-1) */
  confidence: number;
  /** Reason for optimal time selection */
  reason: string;
}

export interface WakeTrigger {
  /** When to trigger wake notification */
  timestamp: number;
  /** Wake window this trigger belongs to */
  window: WakeWindow;
  /** Associated sleep session data */
  sleepData: SleepData;
  /** Current sleep stage at trigger time */
  currentStage: SleepStage;
}

export interface WakeNotification {
  /** Notification ID */
  id: string;
  /** Notification phase */
  phase: 'gentle-wake' | 'dream-prompt' | 'confirmation';
  /** When notification was sent */
  timestamp: number;
  /** Associated wake trigger */
  trigger: WakeTrigger;
  /** User interaction status */
  interacted: boolean;
  /** Notification content */
  content: {
    title: string;
    body: string;
    soundscape?: string;
    haptics?: boolean;
  };
}

export interface SleepSettings {
  /** Is sleep tracking enabled? */
  enabled: boolean;
  /** Allow motion sensor access */
  enableMotionSensor: boolean;
  /** Allow audio recording + processing */
  enableAudioRecording: boolean;
  /** Target sleep duration (hours) */
  targetSleepDuration: number;
  /** Preferred sleep window start (HH:MM) */
  preferredBedtime: string;
  /** Preferred wake time (HH:MM) */
  preferredWakeTime: string;
  /** Wake window start (HH:MM) - when smart wake can begin */
  wakeWindowStart: string;
  /** Wake window end (HH:MM) - when smart wake must end */
  wakeWindowEnd: string;
  /** Enable smart wake based on sleep stages */
  enableSmartWake: boolean;
  /** Enable bedtime reminders */
  enableBedtimeReminders: boolean;
  /** Enable wake reminders */
  enableWakeReminders: boolean;
  /** Enable dream capture prompts */
  enableDreamCapture: boolean;
  /** Circadian coaching enabled */
  enableCircadianCoaching: boolean;
  /** Allow data sync to wearables */
  enableWearableSync: boolean;
  /** Prepare data for Everdream provenance */
  enableProvenance: boolean;
  /** User has accepted sleep tracking consent */
  consentGiven: boolean;
}

export interface PrivacyConsent {
  /** Blanket sleep tracking consent */
  sleepTrackingConsent: boolean;
  /** When consent was given */
  consentTimestamp: number;
  /** User acknowledges audio is processed locally first */
  audioPrivacyAcknowledged: boolean;
  /** Allow aggregated analytics (no PII) */
  analyticsAllowed: boolean;
}
