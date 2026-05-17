/**
 * Morning Notification Flow Component
 * Progressive awakening with dream capture integration
 * Phase 1: Gentle wake → Phase 2: Restedness emoji → Phase 3: Dream video capture
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Play, Pause, RotateCcw, CheckCircle, Moon, Sun, Zap } from 'lucide-react';
import { SleepData, MorningCheckIn } from '../modules/sleep/types';

interface MorningNotificationFlowProps {
  sleepData: SleepData;
  onComplete: (checkIn: MorningCheckIn, dreamVideoUri?: string) => void;
  onSkip?: () => void;
  onClose?: () => void;
}

type FlowPhase = 'restedness-emoji' | 'dream-capture' | 'confirmation';

const restednessEmojis = [
  { emoji: '😊', label: 'Good', value: 6 },
  { emoji: '😌', label: 'Refreshed', value: 7 },
  { emoji: '⚡', label: 'Energized', value: 8 },
  { emoji: '🚀', label: 'Amazing', value: 9 },
  { emoji: '🌟', label: 'Perfect', value: 10 },
  { emoji: '😫', label: 'Exhausted', value: 1 },
  { emoji: '😪', label: 'Very Tired', value: 2 },
  { emoji: '🥱', label: 'Tired', value: 3 },
  { emoji: '😐', label: 'Okay', value: 4 },
  { emoji: '🙂', label: 'Decent', value: 5 },
];

export const MorningNotificationFlow: React.FC<MorningNotificationFlowProps> = ({
  sleepData,
  onComplete,
  onSkip,
  onClose,
}) => {
  const [phase, setPhase] = useState<FlowPhase>('restedness-emoji');
  const [restednessScore, setRestednessScore] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle emoji selection and proceed to dream capture
  const handleRestednessSelect = (score: number) => {
    setRestednessScore(score);
    setPhase('dream-capture');
  };

  // Video recording simulation (would integrate with actual camera API)
  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    // Simulate video URI (would be actual file path)
    setRecordedVideoUri(`dream-recording-${Date.now()}.mp4`);
  };

  const resetRecording = () => {
    setIsRecording(false);
    setRecordedVideoUri(null);
    setRecordingDuration(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleComplete = () => {
    if (!restednessScore) return;

    const checkIn: MorningCheckIn = {
      timestamp: Date.now(),
      restednessScore,
      sleepSessionId: sleepData.timestamp.toString(),
    };

    onComplete(checkIn, recordedVideoUri || undefined);
    setPhase('confirmation');
  };

  const handleSkipDream = () => {
    if (!restednessScore) return;

    const checkIn: MorningCheckIn = {
      timestamp: Date.now(),
      restednessScore,
      sleepSessionId: sleepData.timestamp.toString(),
    };

    onComplete(checkIn);
    setPhase('confirmation');
  };

  // Restedness emoji selection phase
  if (phase === 'restedness-emoji') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center p-6 z-50">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30">
          <div className="text-center mb-6">
            <Sun className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              How did you sleep?
            </h2>
            <p className="text-gray-600">
              Choose an emoji that matches your energy
            </p>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {restednessEmojis.map((item) => (
              <button
                key={item.value}
                onClick={() => handleRestednessSelect(item.value)}
                className="aspect-square bg-white rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center p-2 shadow-sm"
              >
                <span className="text-2xl mb-1">{item.emoji}</span>
                <span className="text-xs text-gray-600 font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onSkip}
              className="text-gray-500 text-sm underline hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dream capture phase
  if (phase === 'dream-capture') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Header */}
        <div className="flex justify-between items-center p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">Dream Capture</h3>
              <p className="text-sm text-white/70">Share your dream or skip</p>
            </div>
          </div>
          <button
            onClick={handleSkipDream}
            className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera view */}
        <div className="flex-1 relative">
          {/* Simulated camera view */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center text-white/50">
              <Camera className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">Camera Preview</p>
              <p className="text-sm">Would show live camera feed</p>
            </div>
          </div>

          {/* Recording overlay */}
          {isRecording && (
            <div className="absolute top-6 left-6 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>REC {recordingDuration}s</span>
            </div>
          )}

          {/* Circular record button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            {!recordedVideoUri ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full border-4 transition-all duration-200 flex items-center justify-center ${
                  isRecording
                    ? 'bg-red-500 border-red-400 animate-pulse'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded-sm"></div>
                ) : (
                  <Play className="w-8 h-8 text-gray-800 ml-1" />
                )}
              </button>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={resetRecording}
                  className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={handleComplete}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                >
                  <CheckCircle className="w-6 h-6 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Recording instructions */}
          {!isRecording && !recordedVideoUri && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-center text-white">
              <p className="text-lg font-medium mb-2">Tap to record your dream</p>
              <p className="text-sm text-white/70">Speak naturally about what you remember</p>
            </div>
          )}

          {recordedVideoUri && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-center text-white">
              <p className="text-lg font-medium mb-2">Recording complete!</p>
              <p className="text-sm text-white/70">Reset or continue to save</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Confirmation phase
  if (phase === 'confirmation') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-6 z-50">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur-lg rounded-3xl p-8 text-center shadow-2xl border border-white/30">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Morning check-in complete! ✨
            </h2>
            <p className="text-gray-600">
              Your dream will be processed into an asset soon.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-purple-600 text-white px-6 py-3 rounded-full font-medium hover:bg-purple-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
