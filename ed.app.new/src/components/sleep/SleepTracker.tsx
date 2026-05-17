/**
 * Sleep Tracker Control Component
 * Allows users to start, monitor, and end sleep tracking sessions
 */

import React, { useState, useEffect } from 'react';
import { Moon, Mic, Activity, Power, AlertCircle, Check } from 'lucide-react';
import { SleepSession } from '../modules/sleep/types';
import { motionSensorManager } from '../modules/sleep/motionSensor';
import { audioRecorderManager } from '../modules/sleep/audioRecorder';

interface SleepTrackerProps {
  onSessionStart: () => void;
  onSessionEnd: () => void;
  isActive: boolean;
  currentSession: SleepSession | null;
  hasAudioConsent: boolean;
  hasMotionConsent: boolean;
}

export const SleepTracker: React.FC<SleepTrackerProps> = ({
  onSessionStart,
  onSessionEnd,
  isActive,
  currentSession,
  hasAudioConsent,
  hasMotionConsent,
}) => {
  const [motionStatus, setMotionStatus] = useState<'idle' | 'active' | 'denied'>('idle');
  const [audioStatus, setAudioStatus] = useState<'idle' | 'recording' | 'denied'>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [motionEvents, setMotionEvents] = useState(0);
  const [audioFeatures, setAudioFeatures] = useState(0);

  // Update elapsed time
  useEffect(() => {
    if (!isActive || !currentSession) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, currentSession]);

  // Update sensor data counts
  useEffect(() => {
    if (!isActive || !currentSession) return;

    const interval = setInterval(() => {
      setMotionEvents(currentSession.motionEvents.length);
      setAudioFeatures(currentSession.audioFeatures.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, currentSession]);

  const handleStart = async () => {
    // Start sensors with consent
    if (hasMotionConsent) {
      const motionStarted = await motionSensorManager.start();
      setMotionStatus(motionStarted ? 'active' : 'denied');
    }

    if (hasAudioConsent) {
      const audioStarted = await audioRecorderManager.start();
      setAudioStatus(audioStarted ? 'recording' : 'denied');
    }

    onSessionStart();
  };

  const handleEnd = async () => {
    // Stop sensors
    motionSensorManager.stop();
    audioRecorderManager.stop();

    setMotionStatus('idle');
    setAudioStatus('idle');
    setElapsedTime(0);
    setMotionEvents(0);
    setAudioFeatures(0);

    onSessionEnd();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  if (!isActive) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl border border-slate-700">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Moon className="w-12 h-12 text-blue-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Sleep Tracking</h2>
            <p className="text-sm text-gray-400">Ready to track your sleep tonight?</p>
          </div>

          {/* Consent Status */}
          {(!hasMotionConsent || !hasAudioConsent) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-yellow-900">Consent Required</p>
                <p className="text-yellow-800 text-xs mt-1">
                  {!hasMotionConsent && '📱 Motion sensors '}
                  {!hasMotionConsent && !hasAudioConsent && '& '}
                  {!hasAudioConsent && '🎤 Audio recording'}
                </p>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!hasMotionConsent && !hasAudioConsent}
            className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              !hasMotionConsent && !hasAudioConsent
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
            }`}
          >
            <Power className="w-5 h-5" />
            Start Sleep Session
          </button>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-blue-400 font-semibold">📱 Motion Tracking</div>
              <div className={hasMotionConsent ? 'text-green-400' : 'text-gray-500'}>
                {hasMotionConsent ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-green-400 font-semibold">🎤 Audio Analysis</div>
              <div className={hasAudioConsent ? 'text-green-400' : 'text-gray-500'}>
                {hasAudioConsent ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center p-3 bg-slate-700 rounded-lg">
            🔒 All data is processed locally on your device
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gradient-to-br from-green-50 to-cyan-50 rounded-2xl shadow-lg border-2 border-green-300">
      <div className="space-y-4">
        {/* Active Status */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="relative">
              <Moon className="w-12 h-12 text-green-600 animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-600 rounded-full animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Sleep Session Active</h2>
          <p className="text-lg font-bold text-green-600">{formatTime(elapsedTime)}</p>
        </div>

        {/* Sensor Status */}
        <div className="space-y-2">
          {hasMotionConsent && (
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-green-200">
              <Activity className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Motion Sensor</div>
                <div className="text-xs text-gray-600">
                  {motionStatus === 'active' ? '📊 Capturing data' : '❌ Not active'}
                </div>
              </div>
              {motionStatus === 'active' && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </div>
          )}

          {hasAudioConsent && (
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-cyan-200">
              <Mic className="w-5 h-5 text-cyan-600 animate-pulse" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">Audio Recording</div>
                <div className="text-xs text-gray-600">
                  {audioStatus === 'recording' ? '🎙️ Recording features' : '❌ Not recording'}
                </div>
              </div>
              {audioStatus === 'recording' && (
                <Check className="w-4 h-4 text-green-600" />
              )}
            </div>
          )}
        </div>

        {/* Data Collection Stats */}
        <div className="grid grid-cols-2 gap-3 text-center bg-white rounded-lg p-3 border border-green-200">
          <div>
            <div className="text-xl font-bold text-blue-600">{motionEvents}</div>
            <div className="text-xs text-gray-600">Motion Events</div>
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-600">{audioFeatures}</div>
            <div className="text-xs text-gray-600">Audio Samples</div>
          </div>
        </div>

        {/* Sleep Tips */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-xs text-gray-700">
          <p className="font-semibold mb-1">💡 Sleep Well Tonight</p>
          <ul className="space-y-1 text-gray-600">
            <li>• Keep your phone on your nightstand</li>
            <li>• Avoid loud notifications</li>
            <li>• Maintain a consistent temperature</li>
          </ul>
        </div>

        {/* End Session Button */}
        <button
          onClick={handleEnd}
          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2"
        >
          <Power className="w-5 h-5" />
          End Sleep Session
        </button>

        <p className="text-xs text-gray-600 text-center p-2 bg-white bg-opacity-50 rounded-lg">
          🔒 All sensor data stays on your device
        </p>
      </div>
    </div>
  );
};
