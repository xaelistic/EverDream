/**
 * Sleep Module Integration Hook
 * Manages sleep tracking lifecycle and state
 */

import { useState, useCallback, useEffect } from 'react';
import {
  SleepSession,
  SleepData,
  SleepSettings,
  MorningCheckIn,
  PrivacyConsent,
} from '../modules/sleep';
import {
  sleepSessionManager,
  motionSensorManager,
  audioRecorderManager,
  sleepStageDetector,
  sleepScoreCalculator,
} from '../modules/sleep';

const STORAGE_KEY_SETTINGS = 'sleep_settings';
const STORAGE_KEY_CONSENT = 'sleep_privacy_consent';
const STORAGE_KEY_SESSIONS = 'sleep_completed_sessions';

export interface SleepModuleState {
  // Settings
  settings: SleepSettings;
  privacyConsent: PrivacyConsent | null;

  // Session state
  currentSession: SleepSession | null;
  isTracking: boolean;
  completedSessions: SleepData[];
  recentCheckIns: Map<string, MorningCheckIn>;

  // UI state
  showSettings: boolean;
  showCheckIn: boolean;
  selectedSessionId: string | null;
}

export const useSleepModule = () => {
  const [state, setState] = useState<SleepModuleState>({
    settings: loadSettings(),
    privacyConsent: loadConsent(),
    currentSession: sleepSessionManager.getCurrentSession(),
    isTracking: false,
    completedSessions: loadCompletedSessions(),
    recentCheckIns: new Map(),
    showSettings: false,
    showCheckIn: false,
    selectedSessionId: null,
  });

  // Give consent
  const giveConsent = useCallback(() => {
    const consent: PrivacyConsent = {
      sleepTrackingConsent: true,
      consentTimestamp: Date.now(),
      audioPrivacyAcknowledged: true,
      analyticsAllowed: true,
    };
    localStorage.setItem(STORAGE_KEY_CONSENT, JSON.stringify(consent));
    setState((prev) => ({ ...prev, privacyConsent: consent }));
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: SleepSettings) => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    setState((prev) => ({ ...prev, settings: newSettings }));
  }, []);

  // Start sleep session
  const startSession = useCallback(() => {
    if (!state.settings.enabled || !state.privacyConsent?.sleepTrackingConsent) {
      console.warn('[Sleep] Cannot start: not consented or disabled');
      return;
    }

    const session = sleepSessionManager.createSession();
    setState((prev) => ({
      ...prev,
      currentSession: session,
      isTracking: true,
    }));
  }, [state.settings, state.privacyConsent]);

  // End sleep session and compute sleep data
  const endSession = useCallback(async () => {
    if (!state.currentSession) return;

    // Stop sensors
    motionSensorManager.stop();
    audioRecorderManager.stop();

    // Compute sleep data
    const sleepData = sleepSessionManager.endSession((session) => {
      // Detect stages
      const { stageBreakdown, detailedTimeline } = sleepStageDetector.detectStages(session);

      // Detect awakenings
      const awakenings = sleepStageDetector.detectAwakenings(session);

      // Calculate WASO (Wake After Sleep Onset)
      const waso = awakenings.reduce((sum, a) => sum + a.duration / 60000, 0);

      // Calculate efficiency
      const timeInBed = (session.endTime! - session.startTime) / 60000;
      const totalSleep = Object.values(stageBreakdown).reduce((a, b) => a + b, 0);
      const efficiency = Math.round((totalSleep / timeInBed) * 100);

      // Calculate score
      const scoreData: SleepData = {
        timestamp: session.startTime,
        totalDuration: Math.round(totalSleep),
        stageBreakdown,
        awakenings: awakenings.length,
        waso: Math.round(waso),
        efficiency,
        algorithmicScore: 0, // Will be set below
        sleepOnset: session.startTime,
        wakeTime: session.endTime!,
      };

      // Get score
      const scoreResult = sleepScoreCalculator.calculateScore({
        ...session,
        sleepData: scoreData,
      });

      scoreData.algorithmicScore = scoreResult.score;

      return scoreData;
    });

    // Save completed session
    if (sleepData) {
      const updated = [...state.completedSessions, sleepData];
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));

      setState((prev) => ({
        ...prev,
        completedSessions: updated,
        currentSession: null,
        isTracking: false,
        showCheckIn: true, // Show morning check-in
        selectedSessionId: state.currentSession.id,
      }));
    }
  }, [state.currentSession, state.completedSessions]);

  // Submit morning check-in
  const submitCheckIn = useCallback(
    (checkIn: MorningCheckIn) => {
      if (!state.selectedSessionId || !state.currentSession) return;

      // Find session in completed
      const session = state.completedSessions.find(
        (s) => s.timestamp === state.currentSession!.startTime
      );

      if (session) {
        // Update with user feedback
        session.userReportScore = checkIn.restednessScore;

        // Apply calibration
        const { newScore, newOffset } = sleepScoreCalculator.applyCalibration(
          session.algorithmicScore,
          checkIn.restednessScore,
          session.calibrationOffset
        );

        session.algorithmicScore = newScore;
        session.calibrationOffset = newOffset;

        // Save
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(state.completedSessions));

        // Store check-in
        const checkIns = new Map(state.recentCheckIns);
        checkIns.set(state.selectedSessionId, checkIn);

        setState((prev) => ({
          ...prev,
          recentCheckIns: checkIns,
          completedSessions: [...state.completedSessions],
          showCheckIn: false,
        }));
      }
    },
    [state.selectedSessionId, state.currentSession, state.completedSessions, state.recentCheckIns]
  );

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    sleepSessionManager.deleteSession(sessionId);

    const updated = state.completedSessions.filter(
      (s) => s.timestamp !== state.currentSession?.startTime
    );

    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
    setState((prev) => ({
      ...prev,
      completedSessions: updated,
    }));
  }, [state.currentSession, state.completedSessions]);

  // Get stats
  const getStats = useCallback(() => {
    const sessions = state.completedSessions;
    const last7Days = sessions.filter(
      (s) => Date.now() - s.timestamp < 7 * 24 * 60 * 60 * 1000
    );

    return {
      totalSessions: sessions.length,
      last7DaysSessions: last7Days.length,
      averageScore:
        last7Days.length > 0
          ? Math.round(
              last7Days.reduce((sum, s) => sum + s.algorithmicScore, 0) / last7Days.length
            )
          : 0,
      averageDuration:
        last7Days.length > 0
          ? Math.round(
              last7Days.reduce((sum, s) => sum + s.totalDuration, 0) / last7Days.length
            )
          : 0,
    };
  }, [state.completedSessions]);

  return {
    state,
    giveConsent,
    updateSettings,
    startSession,
    endSession,
    submitCheckIn,
    deleteSession,
    getStats,
  };
};

// Helper functions
function loadSettings(): SleepSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }

  return {
    enabled: false,
    enableMotionSensor: true,
    enableAudioRecording: true,
    targetSleepDuration: 8,
    preferredBedtime: '22:00',
    preferredWakeTime: '06:30',
    enableBedtimeReminders: true,
    enableWakeReminders: true,
    enableCircadianCoaching: true,
    enableWearableSync: false,
    enableProvenance: true,
    consentGiven: false,
  };
}

function loadConsent(): PrivacyConsent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONSENT);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return null;
}

function loadCompletedSessions(): SleepData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return [];
}
