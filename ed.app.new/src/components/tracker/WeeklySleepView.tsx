import { BookOpen, Moon, Smile } from 'lucide-react';
import {
  getSleepQualityLabel,
  getSleepQualitySymbol,
} from '../../modules/sleep';
import type { TrackerDay } from '../../hooks/useSleepTracker';

type WeeklySleepViewProps = {
  days: TrackerDay[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
};

export function WeeklySleepView({ days, selectedDate, onSelectDate }: WeeklySleepViewProps) {
  return (
    <div className="rounded-3xl border border-line bg-cream p-4 shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Weekly tracker</p>
          <h2 className="font-serif text-2xl font-medium text-ink">Sleep, dream, mood</h2>
        </div>
        <Moon className="h-6 w-6 text-duskDeep" strokeWidth={1.5} />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const selected = day.dateKey === selectedDate;
          const score = day.summary?.calibratedSleepScore || 0;
          const quality = day.summary ? getSleepQualityLabel(score) : 'No data';

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className={`min-h-[116px] rounded-2xl border p-2 text-left transition ${
                selected
                  ? 'border-sage bg-sage text-cream shadow-paper'
                  : 'border-line bg-parchment hover:bg-white'
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.14em] opacity-80">{day.label}</div>
              <div className="text-sm font-semibold">{day.dayLabel}</div>
              <div className="mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-ink">
                {day.summary ? getSleepQualitySymbol(score) : '-'}
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.12em] opacity-80">{quality}</div>
              <div className="mt-2 flex items-center gap-1 opacity-90">
                <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="text-[10px]">{day.summary?.dreamLogged ? 'Dream' : '-'}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 opacity-90">
                <Smile className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span className="text-[10px]">{formatValence(day.summary?.moodValence)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatValence(valence?: number): string {
  if (!Number.isFinite(valence)) return '-';
  if ((valence || 0) > 1) return '+';
  if ((valence || 0) < -1) return '-';
  return '0';
}
