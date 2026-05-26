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

      {/* Chart area with dual axes */}
      <div className="relative mb-4 h-48">
        {/* Left axis - Hours */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-[10px] text-muted">
          <span>{Math.round(maxHours)}h</span>
          <span>{Math.round(maxHours * 0.66)}h</span>
          <span>{Math.round(maxHours * 0.33)}h</span>
          <span>0h</span>
        </div>
        
        {/* Right axis - Quality Score */}
        <div className="absolute right-0 top-0 flex h-full flex-col justify-between text-[10px] text-muted">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>0</span>
        </div>

        {/* Bars container */}
        <div className="absolute inset-x-8 inset-y-0 flex items-end justify-between gap-1">
          {days.map((day) => {
            const totalHours = (day.summary?.totalSleepMinutes || 0) / 60;
            const barHeight = (totalHours / maxHours) * 100;
            const stages = day.summary?.stageMinutes;
            const hasData = !!stages;
            
            if (!hasData) {
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => onLogDream?.(day.dateKey)}
                  className="flex h-full flex-col items-center justify-end pb-2 transition hover:bg-parchment/30 rounded-lg"
                >
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-line bg-white/50">
                    <Plus className="h-4 w-4 text-muted" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.1em] text-muted">{day.label}</span>
                </button>
              );
            }

            const awakeMin = stages.awake || 0;
            const lightMin = stages.light || 0;
            const deepMin = stages.deep || 0;
            const remMin = stages.rem || 0;
            const totalMin = awakeMin + lightMin + deepMin + remMin;

            const awakePct = totalMin > 0 ? (awakeMin / totalMin) * 100 : 0;
            const lightPct = totalMin > 0 ? (lightMin / totalMin) * 100 : 0;
            const deepPct = totalMin > 0 ? (deepMin / totalMin) * 100 : 0;
            const remPct = totalMin > 0 ? (remMin / totalMin) * 100 : 0;

            const score = day.summary.calibratedSleepScore || 0;
            const scoreHeight = score;
            const dreamEmoji = day.summary.dreamAssetUrl ? '🎨' : day.summary.dreamLogged ? '💭' : '';

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => onSelectDate(day.dateKey)}
                className="group relative flex h-full flex-col items-center justify-end pb-2 transition hover:bg-parchment/30 rounded-lg"
              >
                {/* Target line overlay */}
                <div 
                  className="absolute w-full border-t-2 border-dashed border-sage/50 pointer-events-none"
                  style={{ bottom: `${(targetHours / maxHours) * 100}%` }}
                />
                
                {/* Stacked bar */}
                <div 
                  className="w-8 overflow-hidden rounded-t-md"
                  style={{ height: `${barHeight}%` }}
                >
                  {/* REM (top) */}
                  <div 
                    className="bg-dusk transition-all"
                    style={{ height: `${remPct}%` }}
                    title={`REM: ${remMin}m`}
                  />
                  {/* Deep */}
                  <div 
                    className="bg-duskDeep transition-all"
                    style={{ height: `${deepPct}%` }}
                    title={`Deep: ${deepMin}m`}
                  />
                  {/* Light */}
                  <div 
                    className="bg-sage/70 transition-all"
                    style={{ height: `${lightPct}%` }}
                    title={`Light: ${lightMin}m`}
                  />
                  {/* Awake (bottom) */}
                  <div 
                    className="bg-moon transition-all"
                    style={{ height: `${awakePct}%` }}
                    title={`Awake: ${awakeMin}m`}
                  />
                </div>

                {/* Total hours label */}
                <div className="mt-1 text-[10px] font-semibold text-ink">
                  {totalHours.toFixed(1)}h
                </div>

                {/* Dream emoji indicator */}
                {dreamEmoji && (
                  <div className="absolute -top-6 text-lg" title={day.summary.dreamTitle || 'Dream logged'}>
                    {dreamEmoji}
                  </div>
                )}

                {/* Day label */}
                <span className="text-[9px] uppercase tracking-[0.1em] text-muted">{day.label}</span>

                {/* Quality score dot on RHS axis */}
                <div 
                  className="absolute right-0 h-2 w-2 rounded-full bg-duskDeep"
                  style={{ bottom: `${scoreHeight}%`, transform: 'translateX(50%)' }}
                  title={`Quality: ${score}`}
                />
              </button>
            );
          })}
        </div>

        {/* Target label */}
        <div 
          className="absolute right-10 text-[9px] text-sage font-medium"
          style={{ bottom: `${(targetHours / maxHours) * 100}%`, transform: 'translateY(-50%)' }}
        >
          Target
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
