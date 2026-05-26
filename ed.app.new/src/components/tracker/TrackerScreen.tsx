import { CalendarDays, Mail, Moon } from 'lucide-react';
import { useState } from 'react';
import { useSleepTracker } from '../../hooks/useSleepTracker';
import type { DreamLike, TrackerSettings, WearableSleepLike } from '../../modules/sleep';
import { MonthlySleepReport } from './MonthlySleepReport';
import { SleepDayDetail } from './SleepDayDetail';
import { WeeklySleepView } from './WeeklySleepView';
import { EmotionalThemesChart } from './EmotionalThemesChart';
import { InsightsPanel } from './InsightsPanel';

type TrackerScreenProps = {
  dreams: DreamLike[];
  settings?: TrackerSettings;
  wearableData?: WearableSleepLike[];
  onOpenDream: (dreamId: string) => void;
};

export function TrackerScreen({
  dreams,
  settings,
  wearableData,
  onOpenDream,
}: TrackerScreenProps) {
  const [showMonthly, setShowMonthly] = useState(false);
  const tracker = useSleepTracker({ dreams, settings, wearableData });

  const handleLogDream = (dateKey: string) => {
    // In a real app, this would navigate to dream logging or open a modal
    console.log('Log dream for date:', dateKey);
    alert(`Would you like to log a dream or experience for ${dateKey}?`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Tracker</p>
            <h1 className="font-serif text-3xl font-medium text-ink">Sleep performance</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Weekly sleep quality, dream linkage, circadian rhythm, and monthly reporting.
            </p>
          </div>
          <CalendarDays className="h-7 w-7 text-duskDeep" strokeWidth={1.5} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryMetric label="Nights" value={`${tracker.monthlyReport.trackedNights}`} />
          <SummaryMetric label="Good" value={`${tracker.monthlyReport.goodNights}`} />
          <SummaryMetric label="Avg" value={`${tracker.monthlyReport.averageScore}`} />
        </div>
      </div>

      <WeeklySleepView
        days={tracker.weekDays}
        selectedDate={tracker.selectedDate}
        onSelectDate={tracker.setSelectedDate}
        onLogDream={handleLogDream}
      />

      {/* Emotional themes spider diagram */}
      <EmotionalThemesChart dreams={dreams} summaries={tracker.summaries} />

      {/* Ongoing insights and user typing */}
      <InsightsPanel dreams={dreams} summaries={tracker.summaries} />

      <div className="flex gap-2 rounded-2xl border border-line bg-parchment p-1">
        <button
          type="button"
          onClick={() => setShowMonthly(false)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            showMonthly ? 'text-muted hover:text-ink' : 'bg-cream text-ink shadow-paper'
          }`}
        >
          <Moon className="h-4 w-4" strokeWidth={1.75} />
          Day
        </button>
        <button
          type="button"
          onClick={() => setShowMonthly(true)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            showMonthly ? 'bg-cream text-ink shadow-paper' : 'text-muted hover:text-ink'
          }`}
        >
          <Mail className="h-4 w-4" strokeWidth={1.75} />
          Month
        </button>
      </div>

      {showMonthly ? (
        <MonthlySleepReport report={tracker.monthlyReport} onOpenDream={onOpenDream} />
      ) : (
        <SleepDayDetail
          summary={tracker.selectedSummary}
          selectedDate={tracker.selectedDate}
          onOpenDream={onOpenDream}
        />
      )}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-parchment p-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}
