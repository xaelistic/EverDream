/**
 * Sleep Settings Component
 * Configure sleep tracking preferences and privacy settings
 */

import React, { useState } from 'react';
import { Settings, Info, Shield, Zap, Moon, Mic, Activity } from 'lucide-react';
import { SleepSettings as SleepSettingsType } from '../modules/sleep/types';

interface SleepSettingsProps {
  settings: SleepSettingsType;
  onSettingsChange: (settings: SleepSettingsType) => void;
  onClose: () => void;
}

export const SleepSettingsPanel: React.FC<SleepSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  const handleToggle = (key: keyof SleepSettingsType) => {
    const updated = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(updated);
  };

  const handleStringChange = (key: keyof SleepSettingsType, value: string) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleNumberChange = (key: keyof SleepSettingsType, value: number) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Sleep Settings
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sleep Tracking Consent - Blanket Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1">
                <Shield className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Sleep Tracking</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enable all sleep monitoring features (motion, audio analysis)
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('enabled')}
                className={`ml-2 flex-shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  localSettings.enabled
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    localSettings.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {!localSettings.enabled && (
              <p className="text-xs text-blue-700 ml-8">
                Turn on to start sleep tracking
              </p>
            )}
          </div>

          {/* Privacy & Consent Info */}
          {localSettings.enabled && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <button
                  onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                  className="flex items-start justify-between w-full text-left"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Info className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Privacy & Data</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        How your sleep data is processed
                      </p>
                    </div>
                  </div>
                  <span className="text-green-600 font-bold ml-2">{showPrivacyInfo ? '−' : '+'}</span>
                </button>

                {showPrivacyInfo && (
                  <div className="mt-3 pl-8 border-t border-green-200 pt-3 space-y-2 text-xs text-gray-700">
                    <p>
                      <span className="font-semibold">🔒 Local Processing:</span> Audio
                      features are extracted on your device only
                    </p>
                    <p>
                      <span className="font-semibold">📊 Aggregate Data:</span> Your sleep
                      patterns help improve our algorithm
                    </p>
                    <p>
                      <span className="font-semibold">🗑️ Deletion:</span> You can delete
                      any session from history anytime
                    </p>
                  </div>
                )}
              </div>

              {/* Target Settings */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Sleep Goals
                </h3>

                {/* Target Duration */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Target Sleep Duration (hours)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="6"
                      max="10"
                      step="0.5"
                      value={localSettings.targetSleepDuration}
                      onChange={(e) =>
                        handleNumberChange('targetSleepDuration', parseFloat(e.target.value))
                      }
                      className="flex-1 h-2 bg-gray-300 rounded-lg accent-indigo-600"
                    />
                    <span className="text-lg font-bold text-indigo-600 w-12">
                      {localSettings.targetSleepDuration}h
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Optimal: 7-9 hours for adults
                  </p>
                </div>

                {/* Preferred Bedtime */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Preferred Bedtime
                  </label>
                  <input
                    type="time"
                    value={localSettings.preferredBedtime}
                    onChange={(e) => handleStringChange('preferredBedtime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Preferred Wake Time */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    🌅 Preferred Wake Time
                  </label>
                  <input
                    type="time"
                    value={localSettings.preferredWakeTime}
                    onChange={(e) => handleStringChange('preferredWakeTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Features</h3>

                {/* Motion Sensor */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Motion Sensor
                  </label>
                  <button
                    onClick={() => handleToggle('enableMotionSensor')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.enableMotionSensor
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.enableMotionSensor
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Audio Recording */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Audio Analysis
                  </label>
                  <button
                    onClick={() => handleToggle('enableAudioRecording')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.enableAudioRecording
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.enableAudioRecording
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Reminders */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    ⏰ Bedtime Reminders
                  </label>
                  <button
                    onClick={() => handleToggle('enableBedtimeReminders')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.enableBedtimeReminders
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.enableBedtimeReminders
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Circadian Coaching */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    🌙 Circadian Coaching
                  </label>
                  <button
                    onClick={() => handleToggle('enableCircadianCoaching')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localSettings.enableCircadianCoaching
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localSettings.enableCircadianCoaching
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium transition"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
