import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Brain, 
  Heart, 
  Zap, 
  TrendingUp, 
  Info,
  BarChart3,
  Award
} from 'lucide-react';

interface XPScoreDisplayProps {
  dxpScore: number; // 0-1000 Subconscious Depth
  xaelScore: number; // 0-100 Emotional Resonance
  variant?: 'full' | 'mini';
  showBreakdown?: boolean;
}

interface ScoreRange {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

const dxpRanges: ScoreRange[] = [
  { min: 0, max: 200, label: 'Surface', color: '#6b7280', description: 'Basic dream fragments' },
  { min: 201, max: 400, label: 'Shallow', color: '#3b82f6', description: 'Clear narrative elements' },
  { min: 401, max: 600, label: 'Moderate', color: '#8b5cf6', description: 'Rich symbolic content' },
  { min: 601, max: 800, label: 'Deep', color: '#ec4899', description: 'Complex subconscious patterns' },
  { min: 801, max: 1000, label: 'Profound', color: '#f59e0b', description: 'Archetypal imagery' },
];

const xaelRanges: ScoreRange[] = [
  { min: 0, max: 20, label: 'Neutral', color: '#6b7280', description: 'Low emotional intensity' },
  { min: 21, max: 40, label: 'Mild', color: '#3b82f6', description: 'Subtle feelings present' },
  { min: 41, max: 60, label: 'Moderate', color: '#8b5cf6', description: 'Noticeable emotional charge' },
  { min: 61, max: 80, label: 'Strong', color: '#ec4899', description: 'Intense emotional experience' },
  { min: 81, max: 100, label: 'Peak', color: '#f59e0b', description: 'Overwhelming affect' },
];

const RadialProgress: React.FC<{
  score: number;
  maxScore: number;
  label: string;
  sublabel: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ score, maxScore, label, sublabel, color, size = 'md' }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const percentage = (score / maxScore) * 100;
  
  const sizeClasses = {
    sm: { container: 'w-24 h-24', stroke: 4, fontSize: 'text-lg' },
    md: { container: 'w-40 h-40', stroke: 6, fontSize: 'text-3xl' },
    lg: { container: 'w-56 h-56', stroke: 8, fontSize: 'text-4xl' },
  };

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedScore(Math.round(score * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size].container}`}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#1f2937"
            strokeWidth={sizeClasses[size].stroke}
          />
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={color}
            strokeWidth={sizeClasses[size].stroke}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${sizeClasses[size].fontSize} font-bold text-white`}>
            {animatedScore}
          </span>
          <span className="text-xs text-gray-400 mt-1">/ {maxScore}</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <p className="text-sm text-gray-400">{sublabel}</p>
      </div>
    </div>
  );
};

const ScoreBreakdown: React.FC<{ dxpScore: number; xaelScore: number }> = ({ dxpScore, xaelScore }) => {
  const dxpRange = dxpRanges.find(r => dxpScore >= r.min && dxpScore <= r.max) || dxpRanges[dxpRanges.length - 1];
  const xaelRange = xaelRanges.find(r => xaelScore >= r.min && xaelScore <= r.max) || xaelRanges[xaelRanges.length - 1];

  const getInsightMessage = () => {
    if (dxpScore > 700 && xaelScore > 70) {
      return { icon: Award, text: 'Exceptional dream with profound subconscious depth and intense emotional resonance.', color: 'text-yellow-400' };
    } else if (dxpScore > 500 && xaelScore > 50) {
      return { icon: Brain, text: 'Strong dream experience with meaningful symbolic content and emotional engagement.', color: 'text-purple-400' };
    } else if (dxpScore > 300 || xaelScore > 30) {
      return { icon: Activity, text: 'Moderate dream activity. Consider deepening your dream practice.', color: 'text-blue-400' };
    } else {
      return { icon: Info, text: 'Early stage dream tracking. Consistency will improve your scores.', color: 'text-gray-400' };
    }
  };

  const insight = getInsightMessage();
  const InsightIcon = insight.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700"
    >
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-lg bg-gray-700/50 ${insight.color}`}>
          <InsightIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">XP Analysis</h3>
          <p className="text-gray-300">{insight.text}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* DXP Breakdown */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="font-medium text-white">Subconscious Depth</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Level</span>
              <span className="text-white font-medium">{dxpRange.label}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="h-2 rounded-full"
                style={{ backgroundColor: dxpRange.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(dxpScore / 1000) * 100}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-500">{dxpRange.description}</p>
          </div>
        </div>

        {/* XAEL Breakdown */}
        <div className="bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="font-medium text-white">Emotional Resonance</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Intensity</span>
              <span className="text-white font-medium">{xaelRange.label}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div 
                className="h-2 rounded-full"
                style={{ backgroundColor: xaelRange.color }}
                initial={{ width: 0 }}
                animate={{ width: `${xaelScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-500">{xaelRange.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const XPScoreDisplay: React.FC<XPScoreDisplayProps> = ({
  dxpScore,
  xaelScore,
  variant = 'full',
  showBreakdown = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown'>('overview');

  if (variant === 'mini') {
    return (
      <div className="flex gap-6 justify-center p-4">
        <RadialProgress
          score={dxpScore}
          maxScore={1000}
          label="Depth"
          sublabel="DXP"
          color="#a855f7"
          size="sm"
        />
        <RadialProgress
          score={xaelScore}
          maxScore={100}
          label="Resonance"
          sublabel="XAEL"
          color="#ec4899"
          size="sm"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'breakdown'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Breakdown
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex justify-center gap-8">
              <RadialProgress
                score={dxpScore}
                maxScore={1000}
                label="Subconscious Depth"
                sublabel="DXP Score"
                color="#a855f7"
                size="lg"
              />
              <RadialProgress
                score={xaelScore}
                maxScore={100}
                label="Emotional Resonance"
                sublabel="XAEL Score"
                color="#ec4899"
                size="lg"
              />
            </div>

            {/* Combined XP Score */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Combined XP Score</h3>
                  <p className="text-gray-400">Weighted average of depth & resonance</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {Math.round((dxpScore / 10 + xaelScore) / 2)}
                  </div>
                  <div className="text-sm text-gray-500">/ 100</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScoreBreakdown dxpScore={dxpScore} xaelScore={xaelScore} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score Reference Guide */}
      {showBreakdown && activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700"
        >
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Score Reference
          </h4>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h5 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Subconscious Depth (DXP)
              </h5>
              <div className="space-y-2">
                {dxpRanges.slice(0, 3).map((range) => (
                  <div key={range.label} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: range.color }} />
                    <span className="text-gray-300">{range.label}</span>
                    <span className="text-gray-500">({range.min}-{range.max})</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h5 className="text-pink-400 font-medium mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Emotional Resonance (XAEL)
              </h5>
              <div className="space-y-2">
                {xaelRanges.slice(0, 3).map((range) => (
                  <div key={range.label} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: range.color }} />
                    <span className="text-gray-300">{range.label}</span>
                    <span className="text-gray-500">({range.min}-{range.max})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const XPScoreMini: React.FC<{ dxpScore: number; xaelScore: number }> = ({ dxpScore, xaelScore }) => {
  return <XPScoreDisplay dxpScore={dxpScore} xaelScore={xaelScore} variant="mini" showBreakdown={false} data-component="XPScoreDisplay" />;
};

export default XPScoreDisplay;
