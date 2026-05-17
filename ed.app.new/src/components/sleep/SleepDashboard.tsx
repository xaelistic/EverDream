/**
 * Sleep Dashboard Component
 * Displays sleep data, stage breakdowns, and quality metrics
 */

import React, { useMemo } from 'react';
import {
  Moon,
  Zap,
  TrendingUp,
  Brain,
  Heart,
  Droplet,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { SleepData } from '../modules/sleep/types';

interface SleepDashboardProps {
  sleepData: SleepData;
  onViewDetails?: () => void;
  showRecent?: boolean;
  recentSessions?: SleepData[];
}

export const SleepDashboard: React.FC<SleepDashboardProps> = ({
  sleepData,
  onViewDetails,
  showRecent = false,
  recentSessions = [],
}) => {
  // Calculate percentages for stage breakdown
  const stagePercentages = useMemo(() => {
    const total = sleepData.totalDuration;
    return {
      awake: Math.round((sleepData.stageBreakdown.awake / total) * 100),
      light: Math.round((sleepData.stageBreakdown.light / total) * 100),
      deep: Math.round((sleepData.stageBreakdown.deep / total) * 100),
      rem: Math.round((sleepData.stageBreakdown.rem / total) * 100),
    };
  }, [sleepData]);

  // Score color coding
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  // Format time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const sleepOnsetTime = new Date(sleepData.sleepOnset).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const wakeTime = new Date(sleepData.wakeTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full space-y-4">
      {/* Main Score Card */}
      <div
        className={`p-6 rounded-2xl shadow-lg border-2 ${getScoreBgColor(
          sleepData.algorithmicScore
        )}`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-700">Sleep Quality Score</h2>
            <p className="text-sm text-gray-600">Last night's performance</p>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold ${getScoreColor(sleepData.algorithmicScore)}`}>
              {sleepData.algorithmicScore}
            </div>
            <div className="text-xs text-gray-600 mt-1">/100</div>
          </div>
        </div>
      </div>

      {/* Sleep Timeline */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-600" />
          Sleep Timeline
        </h3>

        <div className="space-y-3">
          {/* Sleep/Wake Times */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-gray-600 font-semibold">Sleep Onset</div>
              <div className="text-lg font-bold text-blue-700">{sleepOnsetTime}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-xs text-gray-600 font-semibold">Wake Time</div>
              <div className="text-lg font-bold text-orange-700">{wakeTime}</div>
            </div>
          </div>

          {/* Duration & Efficiency */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-xs text-gray-600 font-semibold">Total Sleep</div>
              <div className="text-lg font-bold text-purple-700">
                {formatTime(sleepData.totalDuration)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-xs text-gray-600 font-semibold">Efficiency</div>
              <div className="text-lg font-bold text-green-700">{sleepData.efficiency}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Stages Breakdown */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-600" />
          Sleep Stages
        </h3>

        <div className="space-y-3">
          {/* REM Sleep */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">🌈 REM Sleep (Dreams)</span>
              <span className="font-bold text-indigo-600">
                {sleepData.stageBreakdown.rem}m ({stagePercentages.rem}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${stagePercentages.rem}%` }}
              />
            </div>
          </div>

          {/* Deep Sleep */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">😴 Deep Sleep</span>
              <span className="font-bold text-blue-600">
                {sleepData.stageBreakdown.deep}m ({stagePercentages.deep}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                style={{ width: `${stagePercentages.deep}%` }}
              />
            </div>
          </div>

          {/* Light Sleep */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">☁️ Light Sleep</span>
              <span className="font-bold text-cyan-600">
                {sleepData.stageBreakdown.light}m ({stagePercentages.light}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-400 to-sky-400 h-2 rounded-full transition-all"
                style={{ width: `${stagePercentages.light}%` }}
              />
            </div>
          </div>

          {/* Awake Time */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">👁️ Awake</span>
              <span className="font-bold text-red-600">
                {sleepData.stageBreakdown.awake}m ({stagePercentages.awake}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-400 to-orange-400 h-2 rounded-full transition-all"
                style={{ width: `${stagePercentages.awake}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Quality Metrics */}
      <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Sleep Metrics
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs text-gray-600 font-semibold">Awakenings</div>
            <div className="text-2xl font-bold text-red-600">{sleepData.awakenings}</div>
            <div className="text-xs text-gray-500 mt-1">times during night</div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-xs text-gray-600 font-semibold">WASO</div>
            <div className="text-2xl font-bold text-orange-600">{sleepData.waso}m</div>
            <div className="text-xs text-gray-500 mt-1">wake after sleep onset</div>
          </div>
        </div>
      </div>

      {/* Sleep Notes */}
      {sleepData.userReportScore && (
        <div className="bg-purple-50 rounded-2xl shadow-md p-4 border border-purple-200">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">You rated your sleep: </span>
                <span className="text-purple-700 font-bold">{sleepData.userReportScore}/10</span>
              </p>
              {sleepData.calibrationOffset && (
                <p className="text-xs text-gray-600 mt-1">
                  Calibration offset: {sleepData.calibrationOffset > 0 ? '+' : ''}
                  {sleepData.calibrationOffset.toFixed(1)} points
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-semibold transition flex items-center justify-center gap-2"
        >
          View Detailed Analysis
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
