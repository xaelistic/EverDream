import { Activity, BookOpen, Brain, ChevronRight, HeartPulse, Mic, Moon } from 'lucide-react';
import {
  getSleepQualityLabel,
  type NightlySleepSummary,
} from '../../modules/sleep';
import { CircadianRhythmChart } from './CircadianRhythmChart';
import { SleepStageStack } from './SleepStageStack';

type SleepDayDetailProps = {
  summary: NightlySleepSummary | null;
  selectedDate: string;
  onOpenDream: (dreamId: string) => void;
};

export function SleepDayDetail({ summary, selectedDate, onOpenDream }: SleepDayDetailProps) {
  if (!summary) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-parchment/70 p-6 text-center">
        <Moon className="mx-auto mb-3 h-10 w-10 text-duskDeep opacity-60" strokeWidth={1.25} />
        <h3 className="font-serif text-xl font-medium text-ink">No sleep summary yet</h3>
        <p className="mt-2 text-sm text-muted">
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Daily detail</p>
            <h3 className="font-serif text-2xl font-medium text-ink">
              {new Date(`${summary.sleepDate}T12:00:00`).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <p className="mt-1 text-sm text-muted">{summary.educationText}</p>
          </div>
          <div className="rounded-3xl bg-sage px-4 py-3 text-center text-cream shadow-paper">
            <div className="text-3xl font-semibold">{summary.calibratedSleepScore}</div>
            <div className="text-[10px] uppercase tracking-[0.14em]">
              {getSleepQualityLabel(summary.calibratedSleepScore)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Asleep" value={formatMinutes(summary.totalSleepMinutes)} />
          <Metric label="Target" value={formatMinutes(summary.targetSleepMinutes)} />
          <Metric label="Efficiency" value={`${summary.sleepEfficiency}%`} />
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-duskDeep" strokeWidth={1.5} />
          <h3 className="font-serif text-xl font-medium text-ink">Sleep quality stack</h3>
        </div>
        <SleepStageStack stageMinutes={summary.stageMinutes} />
      </div>

      <CircadianRhythmChart summary={summary} />

      <div className="grid grid-cols-2 gap-3">
        <SignalCard icon={Activity} label="Movement" value={`${summary.movementIndex}/100`} />
        <SignalCard icon={Mic} label="Snoring" value={`${summary.snoreIndex}/100`} />
        <SignalCard icon={BookOpen} label="Sleep talking" value={`${summary.sleepTalkIndex}/100`} />
        <SignalCard icon={HeartPulse} label="Heart rate" value={summary.heartRateAvg ? `${summary.heartRateAvg}` : '-'} />
      </div>

      <div className="rounded-3xl border border-line bg-parchment p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Estimated state proxies</p>
            <h3 className="font-serif text-lg font-medium text-ink">Alpha, theta, beta</h3>
          </div>
          <span className="rounded-full border border-line bg-cream px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-muted">
            estimate
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Alpha" value={`${summary.estimatedStateProxy.alpha}%`} />
          <Metric label="Theta" value={`${summary.estimatedStateProxy.theta}%`} />
          <Metric label="Beta" value={`${summary.estimatedStateProxy.beta}%`} />
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Morning calibration</p>
        <h3 className="mt-1 font-serif text-xl font-medium text-ink">How did you sleep?</h3>
        <p className="mt-2 text-sm text-muted">
          {summary.restednessScore
            ? `You rated this night ${summary.restednessScore}/10. The calibrated score is ${summary.calibratedSleepScore}.`
            : 'No morning rating yet. The tracker is using the algorithmic score for now.'}
        </p>
      </div>

      {summary.dreamLogged && summary.dreamId && (
        <button
          type="button"
          onClick={() => onOpenDream(summary.dreamId || '')}
          className="flex w-full items-center justify-between gap-4 rounded-3xl border border-line bg-sage px-5 py-4 text-left text-cream shadow-paper transition hover:bg-sageDark"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Dream linked</p>
            <div className="mt-1 font-serif text-lg font-medium">{summary.dreamTitle}</div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/80 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function SignalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-cream p-4 shadow-paper">
      <Icon className="mb-3 h-5 w-5 text-duskDeep" strokeWidth={1.5} />
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
