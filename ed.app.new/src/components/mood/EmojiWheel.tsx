import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Emoji Mood Wheel - XY Axis Model
 * 
 * 2-axis emotional mapping:
 * - Y axis: Negative (bottom) to Positive (top) — valence (-1 to 1)
 * - X axis: Low energy (left) to High energy (right) — arousal (-1 to 1)
 * - Distance from center: Intensity (closer = calm, farther = intense)
 * 
 * Maps XY position to emojis based on quadrant and intensity
 */

export interface MoodState {
  valence: number;    // -1 (negative) to 1 (positive)
  energy: number;     // -1 (low energy) to 1 (high energy)
  emoji: string;
  label: string;
  intensity: number;  // 0 (calm) to 1 (intense) - derived from distance
}

// Emoji lookup table based on valence and energy quadrants
const EMOJI_MAP: Array<{
  valenceRange: [number, number];
  energyRange: [number, number];
  emoji: string;
  label: string;
  baseIntensity: number;
}> = [
  // Top-right: Positive + High Energy
  { valenceRange: [0.3, 1], energyRange: [0.3, 1], emoji: '🤩', label: 'Ecstatic', baseIntensity: 0.9 },
  { valenceRange: [0.3, 1], energyRange: [0.1, 0.3], emoji: '😄', label: 'Excited', baseIntensity: 0.7 },
  { valenceRange: [0.1, 0.3], energyRange: [0.3, 1], emoji: '😊', label: 'Happy', baseIntensity: 0.6 },
  { valenceRange: [0.1, 0.3], energyRange: [0.1, 0.3], emoji: '🙂', label: 'Content', baseIntensity: 0.4 },
  
  // Top-left: Positive + Low Energy
  { valenceRange: [0.3, 1], energyRange: [-0.3, 0.1], emoji: '😌', label: 'Peaceful', baseIntensity: 0.5 },
  { valenceRange: [0.3, 1], energyRange: [-1, -0.3], emoji: '😴', label: 'Sleepy', baseIntensity: 0.7 },
  { valenceRange: [0.1, 0.3], energyRange: [-0.3, 0.1], emoji: '😌', label: 'Calm', baseIntensity: 0.4 },
  { valenceRange: [0.1, 0.3], energyRange: [-1, -0.3], emoji: '🥱', label: 'Relaxed', baseIntensity: 0.5 },
  
  // Center: Neutral
  { valenceRange: [-0.1, 0.1], energyRange: [-0.1, 0.1], emoji: '😐', label: 'Neutral', baseIntensity: 0.2 },
  { valenceRange: [-0.1, 0.1], energyRange: [0.1, 0.5], emoji: '🤔', label: 'Thoughtful', baseIntensity: 0.3 },
  { valenceRange: [-0.1, 0.1], energyRange: [-0.5, -0.1], emoji: '😶', label: 'Quiet', baseIntensity: 0.3 },
  
  // Bottom-right: Negative + High Energy
  { valenceRange: [-0.3, -0.1], energyRange: [0.3, 1], emoji: '😤', label: 'Frustrated', baseIntensity: 0.7 },
  { valenceRange: [-1, -0.3], energyRange: [0.3, 1], emoji: '😠', label: 'Angry', baseIntensity: 0.9 },
  { valenceRange: [-0.3, -0.1], energyRange: [0.1, 0.3], emoji: '😰', label: 'Anxious', baseIntensity: 0.6 },
  { valenceRange: [-1, -0.3], energyRange: [0.1, 0.3], emoji: '😨', label: 'Stressed', baseIntensity: 0.8 },
  
  // Bottom-left: Negative + Low Energy
  { valenceRange: [-0.3, -0.1], energyRange: [-0.3, 0.1], emoji: '😔', label: 'Down', baseIntensity: 0.5 },
  { valenceRange: [-1, -0.3], energyRange: [-0.3, 0.1], emoji: '😢', label: 'Sad', baseIntensity: 0.7 },
  { valenceRange: [-0.3, -0.1], energyRange: [-1, -0.3], emoji: '😞', label: 'Disappointed', baseIntensity: 0.5 },
  { valenceRange: [-1, -0.3], energyRange: [-1, -0.3], emoji: '😭', label: 'Depressed', baseIntensity: 0.8 },
];

// Helper function to get emoji from valence and energy
export function getEmojiForPosition(valence: number, energy: number): { emoji: string; label: string; intensity: number } {
  // Calculate intensity from distance from center
  const intensity = Math.sqrt(valence * valence + energy * energy);
  
  // Find matching emoji region
  for (const region of EMOJI_MAP) {
    const [vMin, vMax] = region.valenceRange;
    const [eMin, eMax] = region.energyRange;
    
    if (valence >= vMin && valence <= vMax && energy >= eMin && energy <= eMax) {
      return {
        emoji: region.emoji,
        label: region.label,
        intensity: Math.max(0, Math.min(1, intensity)),
      };
    }
  }
  
  // Default fallback based on quadrant
  if (valence > 0 && energy > 0) return { emoji: '😊', label: 'Happy', intensity };
  if (valence > 0 && energy < 0) return { emoji: '😌', label: 'Calm', intensity };
  if (valence < 0 && energy > 0) return { emoji: '😠', label: 'Agitated', intensity };
  if (valence < 0 && energy < 0) return { emoji: '😢', label: 'Sad', intensity };
  return { emoji: '😐', label: 'Neutral', intensity };
}

// Convert XY coordinates to angle for visual placement
function xyToAngle(x: number, y: number): number {
  return Math.atan2(y, x);
}

// Convert polar to XY for rendering
function polarToXY(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

interface MoodWheelProps {
  value: MoodState | null;
  onChange: (mood: MoodState) => void;
  size?: 'sm' | 'md' | 'lg';
  showAxes?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
}

export function EmojiWheel({
  value,
  onChange,
  size = 'md',
  showAxes = true,
  showLabels = true,
  interactive = true,
}: MoodWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sizeClasses = {
    sm: { container: 'w-48 h-48', emoji: 'text-3xl', label: 'text-xs' },
    md: { container: 'w-64 h-64', emoji: 'text-4xl', label: 'text-sm' },
    lg: { container: 'w-80 h-80', emoji: 'text-5xl', label: 'text-base' },
  };

  const s = sizeClasses[size];

  // Handle touch/mouse interaction
  const getPositionFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { valence: 0, energy: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;
    
    // Calculate position relative to center
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    // Clamp to circle
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxRadius) {
      const scale = maxRadius / distance;
      dx *= scale;
      dy *= scale;
    }
    
    // Convert to normalized coordinates (-1 to 1)
    // Note: Y is inverted in screen coordinates (down is positive)
    const energy = dx / maxRadius;      // X axis: left (-1) to right (1)
    const valence = -dy / maxRadius;    // Y axis: bottom (-1) to top (1)
    
    return { valence, energy };
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!interactive) return;
    setIsDragging(true);
    const { valence, energy } = getPositionFromEvent(clientX, clientY);
    const { emoji, label, intensity } = getEmojiForPosition(valence, energy);
    onChange({ valence, energy, emoji, label, intensity });
  }, [interactive, getPositionFromEvent, onChange]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !interactive) return;
    const { valence, energy } = getPositionFromEvent(clientX, clientY);
    const { emoji, label, intensity } = getEmojiForPosition(valence, energy);
    onChange({ valence, energy, emoji, label, intensity });
  }, [isDragging, interactive, getPositionFromEvent, onChange]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  // Calculate selector position
  const getSelectorPosition = () => {
    if (!value) return { x: 50, y: 50 };
    
    // Convert normalized coords to percentage
    const x = 50 + value.energy * 50;
    const y = 50 - value.valence * 50;  // Invert Y for screen coords
    
    return { x, y };
  };

  const selectorPos = getSelectorPosition();

  // Generate gradient zones for visual feedback
  const getBackgroundGradient = () => {
    // Create a conic gradient showing the emotional quadrants
    return `conic-gradient(
      from -45deg at 50% 50%,
      #fef3c7 0deg 90deg,      /* Top-right: Positive + High Energy (yellow) */
      #bbf7d0 90deg 180deg,    /* Top-left: Positive + Low Energy (green) */
      #fee2e2 180deg 270deg,   /* Bottom-left: Negative + Low Energy (red) */
      #fed7aa 270deg 360deg    /* Bottom-right: Negative + High Energy (orange) */
    )`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        className={`relative ${s.container} rounded-full overflow-hidden cursor-crosshair select-none`}
        style={{ background: getBackgroundGradient() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20">
          {/* Concentric circles for intensity */}
          <div className="absolute inset-4 rounded-full border border-white/30" />
          <div className="absolute inset-12 rounded-full border border-white/30" />
          <div className="absolute inset-20 rounded-full border border-white/30" />
          
          {/* Axes */}
          {showAxes && (
            <>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
            </>
          )}
        </div>

        {/* Axis labels */}
        {showLabels && (
          <>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/70">
              Positive
            </span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/70">
              Negative
            </span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/70">
              Calm
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-white/70">
              Energetic
            </span>
          </>
        )}

        {/* Selector dot */}
        <div
          className={`absolute w-8 h-8 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${
            isDragging ? 'scale-110' : 'scale-100'
          }`}
          style={{
            left: `${selectorPos.x}%`,
            top: `${selectorPos.y}%`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-lg">
            {value?.emoji || '😐'}
          </div>
        </div>

        {/* Center point */}
        <div className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-white/30 transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Current selection info */}
      {value && (
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">{value.emoji}</span>
            <span className={`font-semibold ${s.label}`}>{value.label}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-white/60">
            <span>Valence: {value.valence.toFixed(2)}</span>
            <span>Energy: {value.energy.toFixed(2)}</span>
            <span>Intensity: {Math.round(value.intensity * 100)}%</span>
          </div>
        </div>
      )}
      
      {!value && (
        <p className="text-sm text-white/50">Drag to select your mood</p>
      )}
    </div>
  );
}

// ============================================================
// COMPACT MOOD SELECTOR (quick version with preset options)
// ============================================================

interface CompactMoodSelectorProps {
  value: MoodState | null;
  onChange: (mood: MoodState) => void;
}

export function CompactMoodSelector({ value, onChange }: CompactMoodSelectorProps) {
  const presets: MoodState[] = [
    { valence: 0.8, energy: 0.8, emoji: '🤩', label: 'Great', intensity: 0.9 },
    { valence: 0.5, energy: -0.3, emoji: '😌', label: 'Calm', intensity: 0.4 },
    { valence: 0, energy: 0, emoji: '😐', label: 'Okay', intensity: 0.2 },
    { valence: -0.5, energy: 0.5, emoji: '😠', label: 'Stressed', intensity: 0.6 },
    { valence: -0.7, energy: -0.5, emoji: '😢', label: 'Down', intensity: 0.7 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {presets.map((preset) => {
        const isSelected = value?.label === preset.label;
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-sage shadow-lg scale-110 ring-2 ring-white/20'
                : 'bg-white/10 hover:bg-white/20 hover:scale-105'
            }`}
            title={preset.label}
          >
            <span className="text-xl">{preset.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// MOOD HISTORY & UTILS
// ============================================================

export interface MoodEntry {
  id: string;
  valence: number;
  energy: number;
  emoji: string;
  label: string;
  intensity: number;
  timestamp: number;
  context: 'morning' | 'evening' | 'wind_down' | 'custom';
}

// Safe localStorage helpers for mood history
function safeGetMoodHistory(): string | null {
  try {
    return localStorage.getItem('ed_mood_history_xy');
  } catch (e) {
    console.warn('[EmojiWheel] Failed to access mood history:', e);
    return null;
  }
}

function safeSetMoodHistory(data: string): void {
  try {
    localStorage.setItem('ed_mood_history_xy', data);
  } catch (e) {
    console.warn('[EmojiWheel] Failed to save mood history:', e);
  }
}

export function getMoodHistory(): MoodEntry[] {
  try {
    const data = safeGetMoodHistory();
    return data ? JSON.parse(data) : [];
  } catch { 
    return []; 
  }
}

export function addMoodEntry(entry: Omit<MoodEntry, 'id'>): void {
  const history = getMoodHistory();
  history.push({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  // Keep last 90 days
  const cutoff = Date.now() - 90 * 86400000;
  const trimmed = history.filter(e => e.timestamp > cutoff);
  safeSetMoodHistory(JSON.stringify(trimmed));
}

export function getMoodTrend(days: number = 7): { date: string; avgValence: number; avgEnergy: number; count: number }[] {
  const history = getMoodHistory();
  const cutoff = Date.now() - days * 86400000;
  const recent = history.filter(e => e.timestamp > cutoff);

  const byDay = new Map<string, { valenceTotal: number; energyTotal: number; count: number }>();
  
  for (const entry of recent) {
    const date = new Date(entry.timestamp).toISOString().split('T')[0];
    const existing = byDay.get(date) || { valenceTotal: 0, energyTotal: 0, count: 0 };
    existing.valenceTotal += entry.valence;
    existing.energyTotal += entry.energy;
    existing.count += 1;
    byDay.set(date, existing);
  }

  return Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      avgValence: data.count > 0 ? data.valenceTotal / data.count : 0,
      avgEnergy: data.count > 0 ? data.energyTotal / data.count : 0,
      count: data.count,
    }));
}
