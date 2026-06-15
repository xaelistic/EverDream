import { Video, Mic, Type, Upload } from 'lucide-react';

export type CaptureMode = 'video' | 'audio' | 'text' | 'upload';

const MODES: { id: CaptureMode; label: string; icon: typeof Video }[] = [
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'upload', label: 'Upload', icon: Upload },
];

interface CaptureModeBarProps {
  active: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  /** Dark overlay style for fullscreen capture UIs */
  variant?: 'light' | 'dark';
  disabled?: boolean;
}

export function CaptureModeBar({ active, onChange, variant = 'light', disabled }: CaptureModeBarProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`flex gap-1 p-1 rounded-2xl ${
        isDark ? 'bg-black/50 backdrop-blur-md border border-white/10' : 'bg-parchment border border-line'
      }`}
      role="tablist"
      aria-label="Dream capture mode"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const on = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all min-w-0 ${
              on
                ? isDark
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-sage text-cream shadow-paper'
                : isDark
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-muted hover:text-ink hover:bg-cream'
            } disabled:opacity-40`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}