import type { SleepStageMinutes } from '../../modules/sleep';

type SleepStageStackProps = {
  stageMinutes: SleepStageMinutes;
};

const STAGES: Array<{
  key: keyof SleepStageMinutes;
  label: string;
  className: string;
}> = [
  { key: 'awake', label: 'Awake', className: 'bg-moon' },
  { key: 'light', label: 'Light', className: 'bg-sage/70' },
  { key: 'deep', label: 'Deep', className: 'bg-duskDeep' },
  { key: 'rem', label: 'REM', className: 'bg-dusk' },
];

export function SleepStageStack({ stageMinutes }: SleepStageStackProps) {
  const total = STAGES.reduce((sum, stage) => sum + stageMinutes[stage.key], 0);

  if (total <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-parchment/70 px-4 py-5 text-sm text-muted">
        No stage data for this night.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-4 overflow-hidden rounded-full border border-line bg-parchment">
        {STAGES.map((stage) => {
          const width = Math.max(2, (stageMinutes[stage.key] / total) * 100);
          return (
            <div
              key={stage.key}
              className={stage.className}
              style={{ width: `${width}%` }}
              title={`${stage.label}: ${stageMinutes[stage.key]} min`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {STAGES.map((stage) => (
          <div key={stage.key} className="rounded-2xl border border-line bg-white/80 p-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted">{stage.label}</div>
            <div className="text-sm font-semibold text-ink">{stageMinutes[stage.key]}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}
