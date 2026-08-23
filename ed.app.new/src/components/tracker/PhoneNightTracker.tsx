import { useEffect, useState } from 'react';
import { Activity, Mic, Moon, Square } from 'lucide-react';
import { useSleepModule } from '../../hooks/useSleepModule';

export function PhoneNightTracker() {
  const { state, startSession, endSession } = useSleepModule();
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [motionCount, setMotionCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!state.isTracking || !state.currentSession) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      setElapsed(Math.floor((Date.now() - state.currentSession!.startTime) / 1000));
      setMotionCount(state.currentSession?.motionEvents.length || 0);
      setAudioCount(state.currentSession?.audioFeatures.length || 0);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.isTracking, state.currentSession]);

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      await startSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start sleep tracking.');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    setError(null);
    await endSession();
  };

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const clock = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <section className="rounded-3xl border border-line bg-cream p-5 shadow-paper space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Phone tracking</p>
          <h2 className="font-serif text-xl text-ink mt-1">Tonight</h2>
          <p className="text-sm text-muted mt-1">
            Place the phone face-down on the mattress. We use the microphone and motion sensors locally — raw audio is not uploaded.
          </p>
        </div>
        <Moon className="w-8 h-8 text-duskDeep shrink-0" strokeWidth={1.5} />
      </div>

      {state.isTracking ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-parchment border border-line p-4 text-center">
            <p className="font-mono text-3xl text-ink tracking-wide">{clock}</p>
            <p className="text-xs text-muted mt-1">Listening for movement and night sounds</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-line bg-white/70 p-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-duskDeep" />
              <div>
                <p className="text-[10px] uppercase text-muted">Motion</p>
                <p className="font-semibold">{motionCount} samples</p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white/70 p-3 flex items-center gap-2">
              <Mic className="w-4 h-4 text-sageDark" />
              <div>
                <p className="text-[10px] uppercase text-muted">Audio</p>
                <p className="font-semibold">{audioCount} samples</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleEnd()}
            className="w-full rounded-2xl bg-ink text-cream font-semibold py-3.5 flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4" />
            I&apos;m awake — save night
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting}
          className="w-full rounded-2xl bg-sage text-cream font-semibold py-3.5 disabled:opacity-60"
        >
          {starting ? 'Starting sensors…' : 'Start phone sleep tracking'}
        </button>
      )}

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
      )}
    </section>
  );
}
