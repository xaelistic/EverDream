const STEPS = [
  { id: 'transcribe', label: 'Transcribing your voice' },
  { id: 'analyse', label: 'Analysing symbols and mood' },
  { id: 'image', label: 'Painting the image' },
] as const;

export function DreamProcessingOverlay({
  step,
  compact = false,
}: {
  step?: 'transcribe' | 'analyse' | 'image' | 'complete';
  compact?: boolean;
}) {
  const current = step || 'transcribe';
  const order = ['transcribe', 'analyse', 'image', 'complete'];

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-end ${
        compact ? 'p-3' : 'p-5 sm:p-6'
      } bg-gradient-to-t from-ink/80 via-ink/45 to-ink/10`}
    >
      <div className="dream-process-shimmer absolute inset-0 opacity-60 pointer-events-none" aria-hidden />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/80 mb-2">
          Working on this dream
        </p>
        <ol className={compact ? 'space-y-1' : 'space-y-2'}>
          {STEPS.map((item) => {
            const done = order.indexOf(current) > order.indexOf(item.id);
            const active = current === item.id;
            return (
              <li key={item.id} className="flex items-center gap-2 text-cream">
                <span
                  className={`rounded-full ${compact ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'} ${
                    done ? 'bg-sage' : active ? 'bg-cream animate-pulse' : 'bg-cream/30'
                  }`}
                />
                <span className={`${compact ? 'text-xs' : 'text-sm'} ${active ? 'font-medium' : 'text-cream/70'}`}>
                  {item.label}
                  {active ? '…' : ''}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
