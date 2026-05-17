import { BarChart3, BookOpen, Mail, Sparkles } from 'lucide-react';
import type { MonthlySleepReport as MonthlySleepReportData } from '../../modules/sleep';

type MonthlySleepReportProps = {
  report: MonthlySleepReportData;
  onOpenDream: (dreamId: string) => void;
};

export function MonthlySleepReport({ report, onOpenDream }: MonthlySleepReportProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-cream p-5 shadow-lift">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Monthly report</p>
            <h2 className="font-serif text-2xl font-medium text-ink">{report.monthLabel}</h2>
          </div>
          <BarChart3 className="h-6 w-6 text-duskDeep" strokeWidth={1.5} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ReportMetric label="Good nights" value={`${report.goodNights}/${report.trackedNights}`} />
          <ReportMetric label="Avg score" value={`${report.averageScore}`} />
          <ReportMetric label="Slept" value={`${report.totalSleepHours}h`} />
          <ReportMetric label="Target" value={`${report.targetSleepHours}h`} />
        </div>
        <p className="mt-4 text-sm text-muted">{report.trendLabel}</p>
      </div>

      <div className="rounded-3xl border border-line bg-parchment p-4">
        <h3 className="mb-3 font-serif text-lg font-medium text-ink">Week breakdown</h3>
        <div className="space-y-2">
          {report.weeklyBreakdown.map((week) => (
            <div key={week.label} className="rounded-2xl border border-line bg-cream p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink">{week.label}</span>
                <span className="text-muted">{week.averageScore}/100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-sage" style={{ width: `${week.averageScore}%` }} />
              </div>
              <div className="mt-2 text-xs text-muted">
                {week.goodNights} good nights, {week.totalSleepHours}h tracked
              </div>
            </div>
          ))}
          {report.weeklyBreakdown.length === 0 && (
            <p className="text-sm text-muted">No tracked weeks in this month yet.</p>
          )}
        </div>
      </div>

      <DreamHighlightList
        title="Top dreams"
        dreams={report.topDreams}
        onOpenDream={onOpenDream}
      />
      <DreamHighlightList
        title="Lowest sleep-score dreams"
        dreams={report.worstDreams}
        onOpenDream={onOpenDream}
      />

      <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-duskDeep" strokeWidth={1.5} />
          <h3 className="font-serif text-lg font-medium text-ink">Dream assets of the month</h3>
        </div>
        <div className="grid gap-3">
          {report.topAssets.map((asset) => (
            <button
              key={`${asset.dreamId}-${asset.date}`}
              type="button"
              onClick={() => onOpenDream(asset.dreamId)}
              className="overflow-hidden rounded-2xl border border-line bg-parchment text-left"
            >
              {asset.assetUrl && (
                <img src={asset.assetUrl} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="p-3">
                <div className="text-sm font-semibold text-ink">{asset.title}</div>
                <div className="text-xs text-muted">Asset score {asset.assetScore || '-'}</div>
              </div>
            </button>
          ))}
          {report.topAssets.length === 0 && (
            <p className="text-sm text-muted">No generated dream assets this month yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-parchment p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-5 w-5 text-duskDeep" strokeWidth={1.5} />
          <h3 className="font-serif text-lg font-medium text-ink">Email preview</h3>
        </div>
        <p className="text-sm font-semibold text-ink">{report.emailSubject}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{report.emailBody}</p>
      </div>

      <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Education</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{report.educationText}</p>
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-parchment p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function DreamHighlightList({
  title,
  dreams,
  onOpenDream,
}: {
  title: string;
  dreams: MonthlySleepReportData['topDreams'];
  onOpenDream: (dreamId: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-line bg-cream p-5 shadow-paper">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-duskDeep" strokeWidth={1.5} />
        <h3 className="font-serif text-lg font-medium text-ink">{title}</h3>
      </div>
      <div className="space-y-2">
        {dreams.map((dream) => (
          <button
            key={`${dream.dreamId}-${dream.date}`}
            type="button"
            onClick={() => onOpenDream(dream.dreamId)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-parchment p-3 text-left transition hover:bg-white"
          >
            <div>
              <div className="text-sm font-semibold text-ink">{dream.title}</div>
              <div className="text-xs text-muted">{dream.date}</div>
            </div>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink">
              {dream.score}
            </span>
          </button>
        ))}
        {dreams.length === 0 && <p className="text-sm text-muted">No dream-linked nights yet.</p>}
      </div>
    </div>
  );
}
