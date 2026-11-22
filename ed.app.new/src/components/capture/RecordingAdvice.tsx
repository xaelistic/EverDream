import { RECORDING_ADVICE } from '../../lib/sculptPrompts';

export function RecordingAdvice({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <p
      className={
        tone === 'dark'
          ? 'text-xs text-white/70 text-center leading-relaxed max-w-xs'
          : 'text-xs text-muted leading-relaxed'
      }
    >
      {RECORDING_ADVICE}
    </p>
  );
}
