/**
 * Sleep Module Integration Wrapper
 * Provides a unified interface for the DreamJournalApp to use sleep tracking
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useSleepModule } from '../hooks/useSleepModule';
import {
  SleepTracker,
  SleepDashboard,
  MorningCheckInCard,
  SleepSettingsPanel,
} from '../components/sleep';

interface SleepModuleIntegrationProps {
  onClose?: () => void;
}

export const SleepModuleIntegration: React.FC<SleepModuleIntegrationProps> = ({ onClose }) => {
  const {
    state,
    giveConsent,
    updateSettings,
    startSession,
    endSession,
    submitCheckIn,
    deleteSession,
    getStats,
  } = useSleepModule();

  const [showConsentPrompt, setShowConsentPrompt] = useState(
    !state.privacyConsent?.sleepTrackingConsent
  );

  // Handle consent flow
  const handleGiveConsent = () => {
    giveConsent();
    const updatedSettings = { ...state.settings, consentGiven: true, enabled: true };
    updateSettings(updatedSettings);
    setShowConsentPrompt(false);
  };

  // Get the last completed session for morning check-in
  const lastSession =
    state.completedSessions.length > 0
      ? state.completedSessions[state.completedSessions.length - 1]
      : null;

  // Show consent prompt first time
  if (showConsentPrompt) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">🌙 Sleep Tracking</h1>
          <p className="text-gray-600">
            Track your sleep and discover patterns that impact your dreams
          </p>
        </div>

        {/* Feature List */}
        <div className="bg-blue-50 rounded-2xl p-6 space-y-3 border border-blue-200">
          <h2 className="font-semibold text-gray-900 mb-4">What You'll Get:</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Sleep Quality Score</p>
                <p className="text-gray-600">0-100 rating based on duration, stages, and continuity</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Sleep Stage Breakdown</p>
                <p className="text-gray-600">Time spent in REM, Deep, Light, and Awake stages</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Circadian Insights</p>
                <p className="text-gray-600">Personalized recommendations based on your rhythm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Info */}
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200 space-y-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-gray-900">🔒 Privacy First</p>
              <p className="text-gray-600 text-xs mt-1">
                All data is processed locally on your device. Audio is never stored without explicit
                consent.
              </p>
            </div>
          </div>
        </div>

        {/* Consent Terms */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 max-h-40 overflow-y-auto border border-gray-200">
          <p className="font-semibold text-gray-900">By enabling sleep tracking, you agree to:</p>
          <ul className="space-y-1 text-gray-600 list-disc list-inside">
            <li>Collect motion sensor data while sleeping</li>
            <li>Process audio for breathing and speech detection (local only)</li>
            <li>Use this data to improve your personalized sleep insights</li>
            <li>Store sleep session data locally on this device</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Later
            </button>
          )}
          <button
            onClick={handleGiveConsent}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg font-semibold transition"
          >
            Enable Sleep Tracking
          </button>
        </div>
      </div>
    );
  }

  // Main sleep tracking interface
  return (
    <div className="w-full space-y-4">
      {/* Sleep Tracking Controls */}
      {!state.isTracking && (
        <SleepTracker
          onSessionStart={startSession}
          onSessionEnd={endSession}
          isActive={state.isTracking}
          currentSession={state.currentSession}
          hasAudioConsent={state.settings.enableAudioRecording}
          hasMotionConsent={state.settings.enableMotionSensor}
        />
      )}

      {/* Active Session Display */}
      {state.isTracking && state.currentSession && (
        <SleepTracker
          onSessionStart={startSession}
          onSessionEnd={endSession}
          isActive={state.isTracking}
          currentSession={state.currentSession}
          hasAudioConsent={state.settings.enableAudioRecording}
          hasMotionConsent={state.settings.enableMotionSensor}
        />
      )}

      {/* Morning Check-In (after session ends) */}
      {state.showCheckIn && lastSession && (
        <MorningCheckInCard
          sleepData={lastSession}
          onComplete={submitCheckIn}
          onSkip={() => {
            // Skip check-in
            const checkIns = new Map(state.recentCheckIns);
            checkIns.set(state.selectedSessionId || 'unknown', {
              timestamp: Date.now(),
              restednessScore: 5,
              sleepSessionId: state.selectedSessionId || 'unknown',
            });
          }}
        />
      )}

      {/* Sleep Data Dashboard */}
      {!state.isTracking && lastSession && (
        <SleepDashboard
          sleepData={lastSession}
          recentSessions={state.completedSessions.slice(-7)}
          showRecent={true}
          onViewDetails={() => {
            // Could navigate to a detailed analytics page
          }}
        />
      )}

      {/* Sleep Stats Summary */}
      {!state.isTracking && state.completedSessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📊 Sleep Statistics (Last 7 Days)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {(() => {
              const stats = getStats();
              return (
                <>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-xs text-gray-600 font-semibold">Sessions</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.last7DaysSessions}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-gray-600 font-semibold">Avg Score</div>
                    <div className="text-2xl font-bold text-green-600">{stats.averageScore}</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-gray-600 font-semibold">Avg Duration</div>
                    <div className="text-xl font-bold text-purple-600">
                      {Math.floor(stats.averageDuration / 60)}h{stats.averageDuration % 60}m
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="text-xs text-gray-600 font-semibold">Total Sessions</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.totalSessions}</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Settings Button */}
      {state.privacyConsent?.sleepTrackingConsent && (
        <button
          onClick={() => {
            // Show settings modal
          }}
          className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition text-sm"
        >
          ⚙️ Sleep Settings
        </button>
      )}
    </div>
  );
};
