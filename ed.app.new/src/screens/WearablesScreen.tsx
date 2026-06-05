import { ArrowLeft } from 'lucide-react';
import { WearableSettings } from '../components/wearables/WearableSettings';
import type { WearableConfig, WearableSleepRecord } from '../lib/wearables';

interface WearablesScreenProps {
  wearableConfigs: WearableConfig[];
  setWearableConfigs: (configs: WearableConfig[]) => void;
  wearableData: WearableSleepRecord[];
  onSleepDataReceived: (records: WearableSleepRecord[]) => void;
  navigate: (screen: string) => void;
}

export function WearablesScreen({
  wearableConfigs,
  setWearableConfigs,
  wearableData,
  onSleepDataReceived,
  navigate,
}: WearablesScreenProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-medium text-ink">Wearables</h2>
        <p className="text-sm text-muted mt-1">Connect your sleep devices for automatic tracking</p>
      </div>

      {/* Wearable connection settings */}
      <WearableSettings
        configs={wearableConfigs}
        onConfigsChange={setWearableConfigs}
        onSleepDataReceived={onSleepDataReceived}
        clientIdMap={{
          oura: '',
          apple_health: '',
          samsung_health: '',
          huawei_health: '',
          xiaomi_mi_fitness: '',
          garmin_connect: '',
          withings: '',
          fitbit: '',
          google_fit: '',
          amazfit: '',
          polar: '',
          sony: '',
        }}
        redirectUri={window.location.origin + '/oauth/callback'}
      />

      {/* Recent Sleep Sessions from wearables */}
      {wearableData.length > 0 && (
        <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
          <h3 className="font-semibold text-ink mb-3 text-sm">Recent Sleep Sessions</h3>
          <div className="space-y-2">
            {wearableData.slice(0, 7).map((session, i) => (
              <div key={`${session.date}-${i}`} className="rounded-xl border border-line bg-parchment p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink">
                    {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted bg-parchment border border-line px-2 py-0.5 rounded">
                    {session.source}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-muted">Duration</div>
                    <div className="font-semibold text-ink">{Math.floor(session.durationMinutes / 60)}h {session.durationMinutes % 60}m</div>
                  </div>
                  <div>
                    <div className="text-muted">REM</div>
                    <div className="font-semibold text-ink">{session.remMinutes}m</div>
                  </div>
                  <div>
                    <div className="text-muted">Deep</div>
                    <div className="font-semibold text-ink">{session.deepMinutes}m</div>
                  </div>
                  <div>
                    <div className="text-muted">Score</div>
                    <div className="font-semibold text-ink">{session.score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
