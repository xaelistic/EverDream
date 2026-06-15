import { useState } from 'react';
import {
  Moon, ChevronRight, TrendingUp, BookOpen, Calendar,
  Lightbulb, Heart,
} from 'lucide-react';
import { useSleepTracker } from '../../hooks/useSleepTracker';
import type { DreamLike, TrackerSettings, WearableSleepLike } from '../../modules/sleep';
import { getSleepQualityLabel, getSleepQualitySymbol } from '../../modules/sleep';
import { getDailyEducation } from '../../lib/dailyContent';
import { MonthlySleepReport } from './MonthlySleepReport';
import { SleepStageStack } from './SleepStageStack';

type TrackerScreenProps = {
  dreams: DreamLike[];
  settings?: TrackerSettings;
  wearableData?: WearableSleepLike[];
  onOpenDream: (dreamId: string) => void;
  onLogDream?: (dateKey: string) => void;
};

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Tracker redesign — inspired by Oura / Rise / Sleep Cycle:
 * 1. Hero: last night's score (one glance)
 * 2. Week strip: tap a day (Apple Health style)
 * 3. Selected night breakdown
 * 4. Linked dream
 * 5. Weekly trends
 * 6. Daily education tip
 */
export function TrackerScreen({
  dreams,
  settings,
  wearableData,
  onOpenDream,
  onLogDream,
}: TrackerScreenProps) {
  const [showMonth, setShowMonth] = useState(false);
  const tracker = useSleepTracker({ dreams, settings, wearableData });
  const education = getDailyEducation();

  const lastNight = tracker.summaries[0] ?? null;
  const selected = tracker.selectedSummary;

  const weekAvgScore = tracker.weekDays.length
    ? Math.round(
        tracker.weekDays.reduce((s, d) => s + (d.summary?.calibratedSleepScore || 0), 0) /
          Math.max(1, tracker.weekDays.filter((d) => d.summary).length),
      )
    : 0;

  const weekAvgSleep = tracker.weekDays.length
    ? Math.round(
        tracker.weekDays.reduce((s, d) => s + (d.summary?.totalSleepMinutes || 0), 0) /
          Math.max(1, tracker.weekDays.filter((d) => d.summary).length),
      )
    : 0;

  if (showMonth) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowMonth(false)}
          className="text-sm font-medium text-sageDark inline-flex items-center gap-1"
        >
          ← Back to week
        </button>
        <MonthlySleepReport report={tracker.monthlyReport} onOpenDream={onOpenDream} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Hero: Last night at a glance (Oura-style) ── */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-cream to-parchment p-5 shadow-lift">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Last night</p>
            <h1 className="font-serif text-3xl font-medium text-ink mt-1">Sleep</h1>
            {lastNight ? (
              <p className="text-sm text-muted mt-1">
                {new Date(`${lastNight.sleepDate}T12:00:00`).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'short',
                })}
              </p>
            ) : (
              <p className="text-sm text-muted mt-1">No data yet — log a dream or connect a wearable</p>
            )}
          </div>
          {lastNight && (
            <div className="text-center shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-sage/30 flex items-center justify-center bg-cream shadow-paper">
                <span className="text-3xl font-bold text-ink">{lastNight.calibratedSleepScore}</span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted mt-1.5">
                {getSleepQualitySymbol(lastNight.calibratedSleepScore)}{' '}
                {getSleepQualityLabel(lastNight.calibratedSleepScore)}
              </p>
            </div>
          )}
        </div>

        {lastNight && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroStat label="Asleep" value={formatMinutes(lastNight.totalSleepMinutes)} />
            <HeroStat label="Efficiency" value={`${lastNight.sleepEfficiency}%`} />
            <HeroStat label="REM" value={formatMinutes(lastNight.stageMinutes?.rem || 0)} />
          </div>
        )}
      </section>

      {/* ── 2. Week strip (Rise / Apple Health style) ── */}
      <section className="rounded-2xl border border-line bg-cream p-3 shadow-paper">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-3 px-1">This week</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {tracker.weekDays.map((day) => {
            const score = day.summary?.calibratedSleepScore ?? 0;
            const hasData = !!day.summary;
            const isSelected = day.dateKey === tracker.selectedDate;
            const scoreColor = score >= 80 ? 'bg-sage' : score >= 60 ? 'bg-dusk/60' : score > 0 ? 'bg-rose-300' : 'bg-line';

            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => tracker.setSelectedDate(day.dateKey)}
                className={`flex flex-col items-center min-w-[44px] py-2 px-1 rounded-xl transition ${
                  isSelected ? 'bg-sage/15 ring-2 ring-sage/40' : 'hover:bg-parchment'
                }`}
              >
                <span className="text-[10px] text-muted uppercase">{day.dayLabel}</span>
                <div
                  className={`w-8 h-8 rounded-full mt-1 flex items-center justify-center text-xs font-bold ${
                    hasData ? `${scoreColor} text-white` : 'border border-dashed border-line text-muted'
                  }`}
                >
                  {hasData ? score : '·'}
                </div>
                {day.summary?.dreamLogged && <span className="text-[9px] mt-0.5">💭</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 3. Selected night detail ── */}
      {selected ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg text-ink">
                {new Date(`${selected.sleepDate}T12:00:00`).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'short',
                })}
              </h2>
              <span className="text-sm font-semibold text-sageDark">
                {selected.calibratedSleepScore} · {getSleepQualityLabel(selected.calibratedSleepScore)}
              </span>
            </div>
            <SleepStageStack stageMinutes={selected.stageMinutes} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-parchment p-2.5">
                <p className="text-[10px] uppercase text-muted">Deep</p>
                <p className="font-semibold">{formatMinutes(selected.stageMinutes?.deep || 0)}</p>
              </div>
              <div className="rounded-xl bg-parchment p-2.5">
                <p className="text-[10px] uppercase text-muted">Light</p>
                <p className="font-semibold">{formatMinutes(selected.stageMinutes?.light || 0)}</p>
              </div>
            </div>
            {selected.educationText && (
              <p className="text-xs text-muted mt-3 leading-relaxed border-t border-line pt-3">
                {selected.educationText}
              </p>
            )}
          </div>

          {/* ── 4. Linked dream ── */}
          {selected.dreamId ? (
            <button
              type="button"
              onClick={() => onOpenDream(selected.dreamId!)}
              className="w-full rounded-2xl border border-sage/25 bg-sage/5 p-4 text-left hover:bg-sage/10 transition flex items-center gap-3"
            >
              {selected.dreamAssetUrl && (
                <img src={selected.dreamAssetUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted">Dream that night</p>
                <p className="text-sm text-ink line-clamp-2 mt-0.5">{selected.dreamTitle || 'View dream entry'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted shrink-0" />
            </button>
          ) : onLogDream ? (
            <button
              type="button"
              onClick={() => onLogDream(selected.sleepDate)}
              className="w-full rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted hover:border-sage/40 hover:text-sageDark transition"
            >
              <BookOpen className="w-5 h-5 mx-auto mb-1 opacity-50" />
              Log a dream for this night
            </button>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-line bg-parchment/50 p-6 text-center">
          <Moon className="w-10 h-10 mx-auto mb-2 text-duskDeep/40" />
          <p className="text-sm text-muted">Select a day above or connect a wearable to see sleep stages.</p>
        </section>
      )}

      {/* ── 5. Weekly trends ── */}
      <section className="rounded-2xl border border-line bg-parchment p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-duskDeep" />
          <h3 className="text-sm font-semibold text-ink">7-day trends</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <TrendPill label="Avg score" value={String(weekAvgScore)} />
          <TrendPill label="Avg sleep" value={formatMinutes(weekAvgSleep)} />
          <TrendPill label="Dream nights" value={String(tracker.weekDays.filter((d) => d.summary?.dreamLogged).length)} />
        </div>
        <button
          type="button"
          onClick={() => setShowMonth(true)}
          className="mt-3 w-full text-sm font-medium text-sageDark flex items-center justify-center gap-1 py-2"
        >
          <Calendar className="w-4 h-4" />
          View monthly report
        </button>
      </section>

      {/* ── 6. Education (content layer) ── */}
      <section className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-dusk/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-duskDeep" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              {education.icon} Learn · {education.readTimeMinutes} min
            </p>
            <h3 className="font-semibold text-ink">{education.title}</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">{education.content}</p>
            {education.tips[0] && (
              <p className="text-xs text-sageDark mt-2 flex items-start gap-1.5">
                <Heart className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{education.tips[0]}</span>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/80 border border-line/60 p-2.5 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-sm font-semibold text-ink mt-0.5">{value}</p>
    </div>
  );
}

function TrendPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cream border border-line p-2.5 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-base font-semibold text-ink">{value}</p>
    </div>
  );
}