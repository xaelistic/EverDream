import { BookOpen, Moon, Smile, Plus } from 'lucide-react';
import {
  getSleepQualityLabel,
  getSleepQualitySymbol,
} from '../../modules/sleep';
import type { TrackerDay } from '../../hooks/useSleepTracker';

type WeeklySleepViewProps = {
  days: TrackerDay[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onLogDream?: (dateKey: string) => void;
};

export function WeeklySleepView({ days, selectedDate, onSelectDate, onLogDream }: WeeklySleepViewProps) {
  const maxHours = Math.max(10, ...days.map(d => (d.summary?.totalSleepMinutes || 0) / 60));
  const targetHours = 8;

  return (
    <div className="rounded-3xl border border-line bg-cream p-4 shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Weekly tracker</p>
          <h2 className="font-serif text-2xl font-medium text-ink">Sleep, dream, mood</h2>
        </div>
        <Moon className="h-6 w-6 text-duskDeep" strokeWidth={1.5} />
      </div>

      {/* Enhanced chart: total hours (line) vs target (dotted line), stacked breakdown graph, sleep quality (line on secondary axis) */}
      <div className="relative mb-4 h-52 rounded-2xl border border-line bg-cream p-3 shadow-paper">
        <svg width="100%" height="160" viewBox="0 0 320 160" className="overflow-visible">
          {/* Axes */}
          <line x1="40" y1="140" x2="40" y2="20" stroke="#d1d5db" strokeWidth="1" />
          <line x1="40" y1="140" x2="300" y2="140" stroke="#d1d5db" strokeWidth="1" />
          {/* Right axis for quality */}
          <line x1="300" y1="140" x2="300" y2="20" stroke="#d1d5db" strokeWidth="1" />

          {/* Left Y labels (hours) */}
          {[0, 0.33, 0.66, 1].map((f, i) => {
            const y = 140 - f * 120;
            const h = (f * maxHours).toFixed(1);
            return (
              <text key={i} x="35" y={y + 4} fontSize="9" fill="#6b7280" textAnchor="end">{h}h</text>
            );
          })}

          {/* Right Y labels (quality 0-100) */}
          {[0, 50, 100].map((q, i) => {
            const y = 140 - (q / 100) * 120;
            return (
              <text key={i} x="305" y={y + 4} fontSize="9" fill="#6b7280">{q}</text>
            );
          })}

          {/* X labels and data per day */}
          {days.map((day, i) => {
            const x = 50 + i * 38;
            const totalH = (day.summary?.totalSleepMinutes || 0) / 60;
            const stages = day.summary?.stageMinutes;
            const hasData = !!stages;
            const label = day.label;

            if (!hasData) {
              // no data placeholder handled outside svg for buttons, but we can skip or draw placeholder
              return null;
            }

            const awake = stages.awake || 0;
            const light = stages.light || 0;
            const deep = stages.deep || 0;
            const rem = stages.rem || 0;
            const sumMin = awake + light + deep + rem || 1;

            // scale for left axis (hours, max ~10h -> 120px)
            const scaleH = (h: number) => 140 - (h / maxHours) * 120;
            const yTotal = scaleH(totalH);
            const yTarget = scaleH(targetHours);

            // stacked from bottom y=140
            let yCur = 140;
            const hAwake = (awake / sumMin) * (totalH / maxHours) * 120;
            const hLight = (light / sumMin) * (totalH / maxHours) * 120;
            const hDeep = (deep / sumMin) * (totalH / maxHours) * 120;
            const hRem = (rem / sumMin) * (totalH / maxHours) * 120;

            const yAwake = yCur; yCur -= hAwake;
            const yLight = yCur; yCur -= hLight;
            const yDeep = yCur; yCur -= hDeep;
            const yRem = yCur;

            // quality line y (right scale 0-100 -> 120px)
            const score = day.summary.calibratedSleepScore || 0;
            const yQuality = 140 - (score / 100) * 120;

            const dreamEmoji = day.summary.dreamAssetUrl ? '🎨' : day.summary.dreamLogged ? '💭' : '';

            return (
              <g key={day.dateKey}>
                {/* Stacked breakdown bars */}
                <rect x={x-10} y={yRem} width="20" height={hRem} fill="#4b5563" rx="1" />
                <rect x={x-10} y={yDeep} width="20" height={hDeep} fill="#374151" rx="1" />
                <rect x={x-10} y={yLight} width="20" height={hLight} fill="#86efac" rx="1" />
                <rect x={x-10} y={yAwake} width="20" height={hAwake} fill="#f3e8ff" rx="1" />

                {/* Total hours line point */}
                <circle cx={x} cy={yTotal} r="2.5" fill="#1e293b" />

                {/* Quality point on right */}
                <circle cx={x + 12} cy={yQuality} r="2.5" fill="#1e40af" />

                {/* Day label */}
                <text x={x} y="155" fontSize="8" fill="#6b7280" textAnchor="middle">{label}</text>

                {/* Clickable hit area for select / log */}
                <rect 
                  x={x-14} y="20" width="40" height="130" fill="transparent" 
                  onClick={() => onSelectDate(day.dateKey)} 
                  style={{cursor: 'pointer'}}
                />

                {/* Dream symbol */}
                {dreamEmoji && (
                  <text x={x} y="12" fontSize="12" textAnchor="middle">{dreamEmoji}</text>
                )}
              </g>
            );
          })}

          {/* Total hours line (solid) */}
          <polyline
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
            points={days.map((day, i) => {
              if (!day.summary) return '';
              const x = 50 + i * 38;
              const totalH = (day.summary.totalSleepMinutes || 0) / 60;
              const y = 140 - (totalH / maxHours) * 120;
              return `${x},${y}`;
            }).filter(Boolean).join(' ')}
          />

          {/* Target line (dotted) - horizontal at target */}
          <line 
            x1="45" y1={140 - (targetHours / maxHours) * 120} 
            x2="305" y2={140 - (targetHours / maxHours) * 120} 
            stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 2" 
          />

          {/* Quality line (on secondary axis) */}
          <polyline
            fill="none"
            stroke="#1e40af"
            strokeWidth="2"
            points={days.map((day, i) => {
              if (!day.summary) return '';
              const x = 50 + i * 38 + 12;
              const score = day.summary.calibratedSleepScore || 0;
              const y = 140 - (score / 100) * 120;
              return `${x},${y}`;
            }).filter(Boolean).join(' ')}
          />
        </svg>

        {/* No data buttons overlay for empty days (under svg for pass-through clicks on data days) */}
        <div className="absolute inset-x-8 inset-y-0 flex items-end justify-between gap-1 pointer-events-none" style={{zIndex: 1}}>
          {days.map((day, i) => {
            const hasData = !!day.summary?.stageMinutes;
            if (hasData) return <div key={i} className="w-8 pointer-events-none" />; // spacer - clicks pass to svg below
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onLogDream?.(day.dateKey)}
                className="flex h-[130px] w-8 flex-col items-center justify-end pb-2 transition hover:bg-parchment/30 rounded-lg pointer-events-auto"
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-line bg-white/50">
                  <Plus className="h-4 w-4 text-muted" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.1em] text-muted">{day.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap justify-center gap-3 text-[10px]">
        <LegendItem color="bg-dusk" label="REM" />
        <LegendItem color="bg-duskDeep" label="Deep" />
        <LegendItem color="bg-sage/70" label="Light" />
        <LegendItem color="bg-moon" label="Awake" />
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-duskDeep" />
          <span className="text-muted">Quality</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-px w-4 border-t-2 border-dashed border-sage" />
          <span className="text-muted">Target</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded-sm ${color}`} />
      <span className="text-muted">{label}</span>
    </div>
  );
}
