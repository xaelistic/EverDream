import {
  formatClockMinute,
  minuteToPercent,
  type NightlySleepSummary,
} from '../../modules/sleep';

type CircadianRhythmChartProps = {
  summary: NightlySleepSummary;
};

export function CircadianRhythmChart({ summary }: CircadianRhythmChartProps) {
  return (
    <div className="rounded-3xl border border-line bg-parchment p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Circadian rhythm</p>
          <h3 className="font-serif text-lg font-medium text-ink">Rhythm versus sleep window</h3>
        </div>
        <div className="rounded-2xl bg-cream px-3 py-2 text-right shadow-paper">
          <div className="text-lg font-semibold text-ink">{summary.circadianAlignmentScore}</div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted">aligned</div>
        </div>
      </div>

      <div className="relative h-20 rounded-2xl border border-line bg-cream px-3 py-4">
        <div className="absolute left-3 right-3 top-1/2 h-px bg-line" />
        {renderWindow(summary.preferredWindow.startMinute, summary.preferredWindow.endMinute, 'bg-sage/30', 5)}
        {renderWindow(summary.actualWindow.startMinute, summary.actualWindow.endMinute, 'bg-duskDeep', 11)}
        <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[10px] text-muted">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted">
        <div className="rounded-2xl bg-cream p-3">
          <div className="font-semibold text-ink">Preferred</div>
          {formatClockMinute(summary.preferredWindow.startMinute)} to{' '}
          {formatClockMinute(summary.preferredWindow.endMinute)}
        </div>
        <div className="rounded-2xl bg-cream p-3">
          <div className="font-semibold text-ink">Actual</div>
          {formatClockMinute(summary.actualWindow.startMinute)} to{' '}
          {formatClockMinute(summary.actualWindow.endMinute)}
        </div>
      </div>
    </div>
  );
}

function renderWindow(startMinute: number, endMinute: number, className: string, top: number) {
  const segments = getSegments(startMinute, endMinute);

  return segments.map((segment, index) => (
    <div
      key={`${startMinute}-${endMinute}-${index}`}
      className={`absolute h-5 rounded-full ${className}`}
      style={{
        left: `calc(${segment.left}% + 0.75rem)`,
        right: `calc(${100 - segment.right}% + 0.75rem)`,
        top: `${top * 0.25}rem`,
      }}
    />
  ));
}

function getSegments(startMinute: number, endMinute: number): Array<{ left: number; right: number }> {
  const start = minuteToPercent(startMinute);
  const end = minuteToPercent(endMinute);

  if (endMinute - startMinute >= 1440) return [{ left: 0, right: 100 }];
  if (end >= start) return [{ left: start, right: end }];
  return [
    { left: start, right: 100 },
    { left: 0, right: end },
  ];
}
