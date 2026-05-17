/**
 * Morning Check-In Component
 * Users rate their sleep quality subjectively (1-10) after waking
 * Used for calibration of algorithmic sleep score
 */

import React, { useState } from 'react';
import { Heart, MessageCircle, Zap } from 'lucide-react';
import { MorningCheckIn, SleepData } from '../modules/sleep/types';
import { sleepScoreCalculator } from '../modules/sleep/scoreCalculator';

interface MorningCheckInProps {
  sleepData: SleepData;
  onComplete: (checkIn: MorningCheckIn) => void;
  onSkip?: () => void;
}

export const MorningCheckInCard: React.FC<MorningCheckInProps> = ({
  sleepData,
  onComplete,
  onSkip,
}) => {
  const [restednessScore, setRestednessScore] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [calibrationResult, setCalibrationResult] = useState<{
    newScore: number;
    oldScore: number;
    offset: number;
  } | null>(null);

  const handleSubmit = () => {
    // Apply calibration
    const oldScore = sleepData.algorithmicScore;
    const { newScore, newOffset } = sleepScoreCalculator.applyCalibration(
      oldScore,
      restednessScore,
      sleepData.calibrationOffset || 0
    );

    setCalibrationResult({
      newScore,
      oldScore,
      offset: newOffset,
    });

    const checkIn: MorningCheckIn = {
      timestamp: Date.now(),
      restednessScore,
      comment: comment || undefined,
      sleepSessionId: '', // Will be set by parent
    };

    setIsSubmitted(true);

    // Show confirmation for 2 seconds, then callback
    setTimeout(() => {
      onComplete(checkIn);
    }, 1500);
  };

  if (isSubmitted && calibrationResult) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-200">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Zap className="w-12 h-12 text-yellow-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Sleep Score Calibrated ✨
          </h3>
          <div className="bg-white rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Algorithm Score:</span>
              <span className="font-semibold text-gray-900">
                {calibrationResult.oldScore}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Your Rating:</span>
              <span className="font-semibold text-gray-900">
                {restednessScore}/10
              </span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between text-sm">
              <span className="text-gray-600 font-semibold">
                Personalized Score:
              </span>
              <span className="font-bold text-indigo-600 text-lg">
                {calibrationResult.newScore}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Your feedback helps us learn your sleep patterns!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg border border-blue-200">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Good Morning! ☀️</h2>
          <p className="text-gray-600">How rested do you feel?</p>
        </div>

        {/* Sleep Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm bg-white bg-opacity-50 rounded-lg p-3">
          <div>
            <div className="text-lg font-bold text-indigo-600">
              {sleepData.totalDuration}m
            </div>
            <div className="text-xs text-gray-600">Duration</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {sleepData.algorithmicScore}
            </div>
            <div className="text-xs text-gray-600">Sleep Score</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cyan-600">
              {sleepData.awakenings}
            </div>
            <div className="text-xs text-gray-600">Awakenings</div>
          </div>
        </div>

        {/* Restedness Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Restedness
            </label>
            <div className="text-2xl font-bold text-indigo-600">
              {restednessScore}/10
            </div>
          </div>

          {/* Visual slider with emoji feedback */}
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={restednessScore}
              onChange={(e) => setRestednessScore(parseInt(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-red-300 via-yellow-300 to-green-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tired</span>
              <span>Rested</span>
              <span>Energized</span>
            </div>
          </div>

          {/* Emoji feedback */}
          <div className="text-center pt-2">
            <span className="text-4xl">
              {restednessScore <= 3
                ? '😴'
                : restednessScore <= 6
                  ? '😐'
                  : restednessScore <= 8
                    ? '😊'
                    : '🤩'}
            </span>
          </div>
        </div>

        {/* Optional Comment */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            Notes (optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="E.g., 'Woke up due to noise at 3am' or 'Felt great!'"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-medium transition transform hover:scale-105"
          >
            Submit Feedback
          </button>
        </div>

        {/* Privacy Note */}
        <div className="text-xs text-gray-500 text-center p-3 bg-white bg-opacity-50 rounded-lg">
          🔒 Your feedback helps personalize your sleep insights and stays on your device
        </div>
      </div>
    </div>
  );
};
