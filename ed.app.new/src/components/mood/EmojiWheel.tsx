import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Emoji Mood Wheel
 * 
 * Supports 6, 8, or 12 emoji options (configurable).
 * Basic valence (positive/negative/neutral) by default.
 * Expanded wheel in settings (premium).
 * Pinch-to-resize intensity.
 */

export interface MoodOption {
  id: string;
  emoji: string;
  label: string;
  valence: 'positive' | 'negative' | 'neutral';
  intensity: number;  // 1-5, how strong the emotion is
  color: string;      // Tailwind bg color
}

// Default 6-option wheel (basic)
export const MOOD_WHEEL_6: MoodOption[] = [
  { id: 'happy', emoji: '😊', label: 'Happy', valence: 'positive', intensity: 3, color: 'bg-green-400' },
  { id: 'calm', emoji: '😌', label: 'Calm', valence: 'positive', intensity: 2, color: 'bg-blue-400' },
  { id: 'neutral', emoji: '😐', label: 'Neutral', valence: 'neutral', intensity: 1, color: 'bg-gray-400' },
  { id: 'tired', emoji: '😴', label: 'Tired', valence: 'neutral', intensity: 2, color: 'bg-indigo-400' },
  { id: 'anxious', emoji: '😰', label: 'Anxious', valence: 'negative', intensity: 3, color: 'bg-amber-400' },
  { id: 'sad', emoji: '😢', label: 'Sad', valence: 'negative', intensity: 4, color: 'bg-blue-500' },
];

// Expanded 8-option wheel
export const MOOD_WHEEL_8: MoodOption[] = [
  { id: 'ecstatic', emoji: '🤩', label: 'Ecstatic', valence: 'positive', intensity: 5, color: 'bg-yellow-400' },
  { id: 'happy', emoji: '😊', label: 'Happy', valence: 'positive', intensity: 3, color: 'bg-green-400' },
  { id: 'calm', emoji: '😌', label: 'Calm', valence: 'positive', intensity: 2, color: 'bg-teal-400' },
  { id: 'peaceful', emoji: '✨', label: 'Peaceful', valence: 'positive', intensity: 2, color: 'bg-violet-400' },
  { id: 'neutral', emoji: '😐', label: 'Neutral', valence: 'neutral', intensity: 1, color: 'bg-gray-400' },
  { id: 'tired', emoji: '😴', label: 'Tired', valence: 'neutral', intensity: 2, color: 'bg-indigo-400' },
  { id: 'anxious', emoji: '😰', label: 'Anxious', valence: 'negative', intensity: 3, color: 'bg-amber-400' },
  { id: 'sad', emoji: '😢', label: 'Sad', valence: 'negative', intensity: 4, color: 'bg-blue-500' },
];

// Full 12-option wheel (premium)
export const MOOD_WHEEL_12: MoodOption[] = [
  { id: 'ecstatic', emoji: '🤩', label: 'Ecstatic', valence: 'positive', intensity: 5, color: 'bg-yellow-400' },
  { id: 'joyful', emoji: '😄', label: 'Joyful', valence: 'positive', intensity: 4, color: 'bg-green-400' },
  { id: 'grateful', emoji: '🙏', label: 'Grateful', valence: 'positive', intensity: 3, color: 'bg-emerald-400' },
  { id: 'calm', emoji: '😌', label: 'Calm', valence: 'positive', intensity: 2, color: 'bg-teal-400' },
  { id: 'peaceful', emoji: '✨', label: 'Peaceful', valence: 'positive', intensity: 2, color: 'bg-violet-400' },
  { id: 'curious', emoji: '🤔', label: 'Curious', valence: 'neutral', intensity: 2, color: 'bg-cyan-400' },
  { id: 'neutral', emoji: '😐', label: 'Neutral', valence: 'neutral', intensity: 1, color: 'bg-gray-400' },
  { id: 'tired', emoji: '😴', label: 'Tired', valence: 'neutral', intensity: 2, color: 'bg-indigo-400' },
  { id: 'restless', emoji: '🥱', label: 'Restless', valence: 'negative', intensity: 2, color: 'bg-orange-400' },
  { id: 'anxious', emoji: '😰', label: 'Anxious', valence: 'negative', intensity: 3, color: 'bg-amber-500' },
  { id: 'sad', emoji: '😢', label: 'Sad', valence: 'negative', intensity: 4, color: 'bg-blue-500' },
  { id: 'angry', emoji: '😠', label: 'Angry', valence: 'negative', intensity: 5, color: 'bg-red-500' },
];

interface EmojiWheelProps {
  options: MoodOption[];
  value: string | null;
  intensity?: number;
  onChange: (moodId: string, intensity: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  interactive?: boolean;
}

export function EmojiWheel({
  options,
  value,
  intensity = 3,
  onChange,
  size = 'md',
  showLabels = true,
  interactive = true,
}: EmojiWheelProps) {
  const [localIntensity, setLocalIntensity] = useState(intensity);
  const [isPinching, setIsPinching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistanceRef = useRef(0);
  const initialIntensityRef = useRef(0);

  const sizeClasses = {
    sm: { container: 'w-48 h-48', emoji: 'text-2xl', label: 'text-[9px]' },
    md: { container: 'w-64 h-64', emoji: 'text-3xl', label: 'text-[10px]' },
    lg: { container: 'w-80 h-80', emoji: 'text-4xl', label: 'text-xs' },
  };

  const s = sizeClasses[size];

  // Calculate position on the wheel
  const getPosition = useCallback((index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 38; // % from center
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return { x, y };
  }, []);

  // Pinch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      initialIntensityRef.current = localIntensity;
    }
  }, [localIntensity]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scale = distance / initialDistanceRef.current;
      const newIntensity = Math.max(1, Math.min(5, Math.round(initialIntensityRef.current * scale)));
      setLocalIntensity(newIntensity);
    }
  }, [isPinching]);

  const handleTouchEnd = useCallback(() => {
    if (isPinching && value) {
      onChange(value, localIntensity);
    }
    setIsPinching(false);
  }, [isPinching, value, localIntensity, onChange]);

  // Mouse wheel for intensity
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!value) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newIntensity = Math.max(1, Math.min(5, localIntensity + delta));
    setLocalIntensity(newIntensity);
    onChange(value, newIntensity);
  }, [value, localIntensity, onChange]);

  return (
    <div
      ref={containerRef}
      className={`relative ${s.container} mx-auto select-none`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Center circle - shows selected mood */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ${
          value ? 'bg-white/10 shadow-lg' : 'bg-white/5'
        }`}>
          {value ? (
            <>
              <span className="text-2xl">
                {options.find(o => o.id === value)?.emoji}
              </span>
              <span className="text-[9px] text-white/60 font-medium">
                {localIntensity}/5
              </span>
            </>
          ) : (
            <span className="text-xs text-white/30">Tap</span>
          )}
        </div>
      </div>

      {/* Emoji options around the wheel */}
      {options.map((option, index) => {
        const pos = getPosition(index, options.length);
        const isSelected = value === option.id;
        const scale = isSelected ? 1.2 + (localIntensity * 0.05) : 1;

        return (
          <button
            key={option.id}
            type="button"
            disabled={!interactive}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
              interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
            } ${isSelected ? 'z-10' : 'z-0'}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
            onClick={() => {
              if (interactive) {
                onChange(option.id, localIntensity);
              }
            }}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? `${option.color} shadow-lg ring-2 ring-white/30`
                : 'bg-white/5 hover:bg-white/10'
            }`}>
              <span className={s.emoji}>{option.emoji}</span>
            </div>
            {showLabels && (
              <p className={`text-center mt-1 font-medium ${
                isSelected ? 'text-white' : 'text-white/40'
              } ${s.label}`}>
                {option.label}
              </p>
            )}
          </button>
        );
      })}

      {/* Intensity indicator */}
      {value && interactive && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                level <= localIntensity
                  ? 'bg-sage scale-100'
                  : 'bg-white/20 scale-75'
              }`}
            />
          ))}
        </div>
      )}

      {/* Pinch hint */}
      {value && interactive && (
        <p className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[9px] text-white/20">
          Pinch or scroll to adjust intensity
        </p>
      )}
    </div>
  );
}

// ============================================================
// COMPACT MOOD SELECTOR (for quick check-ins)
// ============================================================

interface CompactMoodSelectorProps {
  value: string | null;
  onChange: (moodId: string) => void;
  options?: MoodOption[];
}

export function CompactMoodSelector({
  value,
  onChange,
  options = MOOD_WHEEL_6,
}: CompactMoodSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? `${option.color} shadow-md scale-110 ring-2 ring-white/20`
                : 'bg-white/5 hover:bg-white/10 hover:scale-105'
            }`}
            title={option.label}
          >
            <span className="text-xl">{option.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// MOOD HISTORY
// ============================================================

export interface MoodEntry {
  id: string;
  moodId: string;
  intensity: number;
  timestamp: number;
  context: 'morning' | 'evening' | 'wind_down' | 'custom';
}

export function getMoodHistory(): MoodEntry[] {
  try {
    return JSON.parse(localStorage.getItem('ed_mood_history') || '[]');
  } catch { return []; }
}

export function addMoodEntry(entry: Omit<MoodEntry, 'id'>): void {
  const history = getMoodHistory();
  history.push({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  // Keep last 90 days
  const cutoff = Date.now() - 90 * 86400000;
  const trimmed = history.filter(e => e.timestamp > cutoff);
  localStorage.setItem('ed_mood_history', JSON.stringify(trimmed));
}

export function getMoodTrend(days: number = 7): { date: string; avgValence: number; count: number }[] {
  const history = getMoodHistory();
  const cutoff = Date.now() - days * 86400000;
  const recent = history.filter(e => e.timestamp > cutoff);

  const byDay = new Map<string, { total: number; count: number }>();
  
  for (const entry of recent) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    const mood = [...MOOD_WHEEL_6, ...MOOD_WHEEL_8, ...MOOD_WHEEL_12].find(m => m.id === entry.moodId);
    const valenceScore = mood
      ? mood.valence === 'positive' ? entry.intensity : mood.valence === 'negative' ? -entry.intensity : 0
      : 0;
    
    const existing = byDay.get(date) || { total: 0, count: 0 };
    existing.total += valenceScore;
    existing.count += 1;
    byDay.set(date, existing);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      avgValence: data.count > 0 ? data.total / data.count : 0,
      count: data.count,
    }));
}
