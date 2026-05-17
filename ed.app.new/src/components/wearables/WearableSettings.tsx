import { useState } from 'react';
import {
  Watch,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Moon,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Smartphone,
  Watch as WatchIcon,
  Zap,
  Bluetooth,
  Radio,
} from 'lucide-react';
import type { WearableConfig, WearableProvider, WearableSleepRecord } from '../../lib/wearables';
import { fetchAllWearableSleep, getOAuthUrl } from '../../lib/wearables';

interface WearableSettingsProps {
  configs: WearableConfig[];
  onConfigsChange: (configs: WearableConfig[]) => void;
  onSleepDataReceived: (records: WearableSleepRecord[]) => void;
  clientIdMap: Record<WearableProvider, string>;
  redirectUri: string;
}

const PROVIDER_INFO: Record<WearableProvider, {
  name: string;
  icon: typeof Watch;
  color: string;
  description: string;
  features: string[];
  authType: 'oauth' | 'native' | 'server_side' | 'placeholder';
  marketNote?: string;
}> = {
  oura: {
    name: 'Oura Ring',
    icon: Moon,
    color: 'bg-violet-500',
    description: 'Best-in-class sleep tracking with HRV, temperature, and respiratory rate',
    features: ['Sleep stages', 'HRV', 'Temperature', 'Respiratory rate', 'Readiness score'],
    authType: 'oauth',
  },
  apple_health: {
    name: 'Apple Watch / Health',
    icon: Heart,
    color: 'bg-red-500',
    description: 'Native iOS sleep tracking with heart rate and blood oxygen',
    features: ['Sleep stages', 'Heart rate', 'Blood oxygen', 'Respiratory rate'],
    authType: 'native',
  },
  samsung_health: {
    name: 'Samsung Galaxy Watch',
    icon: Smartphone,
    color: 'bg-blue-600',
    description: 'Samsung Health sleep tracking with Galaxy Watch integration',
    features: ['Sleep stages', 'Heart rate', 'Blood oxygen', 'Snoring detection', 'Sleep score'],
    authType: 'oauth',
    marketNote: 'Popular in Japan & globally',
  },
  huawei_health: {
    name: 'Huawei Watch / Health',
    icon: WatchIcon,
    color: 'bg-rose-600',
    description: 'Huawei Health Kit with TruSleep™ technology for detailed sleep analysis',
    features: ['TruSleep™ stages', 'Heart rate', 'SpO2', 'Respiratory rate', 'Sleep score'],
    authType: 'oauth',
    marketNote: 'Dominant in China, growing in Japan',
  },
  xiaomi_mi_fitness: {
    name: 'Xiaomi / Amazfit',
    icon: Zap,
    color: 'bg-orange-500',
    description: 'Mi Fitness and Amazfit wearables with comprehensive sleep tracking',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Nap tracking', 'Sleep score'],
    authType: 'oauth',
    marketNote: 'Extremely popular in Japan & Asia',
  },
  garmin_connect: {
    name: 'Garmin Connect',
    icon: Activity,
    color: 'bg-sky-600',
    description: 'Garmin watches with advanced sleep and Body Battery™ tracking',
    features: ['Sleep stages', 'Body Battery™', 'HRV', 'Respiration', 'Pulse Ox', 'Sleep score'],
    authType: 'server_side',
    marketNote: 'Popular with athletes globally',
  },
  withings: {
    name: 'Withings',
    icon: Thermometer,
    color: 'bg-emerald-600',
    description: 'Withings sleep analyzers and smart watches with medical-grade sensors',
    features: ['Sleep stages', 'Heart rate', 'Respiratory rate', 'Sleep apnea detection', 'Sleep score'],
    authType: 'oauth',
    marketNote: 'Popular in Europe & Japan',
  },
  fitbit: {
    name: 'Fitbit',
    icon: Activity,
    color: 'bg-cyan-500',
    description: 'Comprehensive fitness and sleep tracking',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Restlessness'],
    authType: 'oauth',
  },
  google_fit: {
    name: 'Google Fit',
    icon: Wind,
    color: 'bg-green-500',
    description: "Google's health platform with sleep segment data",
    features: ['Sleep stages', 'Sleep duration', 'Bedtime/wake time'],
    authType: 'oauth',
  },
  amazfit: {
    name: 'Amazfit (Zepp)',
    icon: Bluetooth,
    color: 'bg-teal-500',
    description: 'Amazfit smartwatches via Zepp app with long battery life',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Stress monitoring', 'PAI score'],
    authType: 'oauth',
    marketNote: 'Very popular in Japan',
  },
  polar: {
    name: 'Polar',
    icon: Radio,
    color: 'bg-red-700',
    description: 'Polar sports watches with precision sleep and recovery tracking',
    features: ['Sleep stages', 'Nightly Recharge™', 'HRV', 'Heart rate', 'Sleep score'],
    authType: 'oauth',
    marketNote: 'Popular in Japan & Europe',
  },
  sony: {
    name: 'Sony (Wena Wrist)',
    icon: Zap,
    color: 'bg-gray-700',
    description: 'Sony Wena Wrist smartwatch — API not yet publicly available',
    features: ['Sleep tracking', 'Heart rate', 'Notifications'],
    authType: 'placeholder',
    marketNote: 'Japan-only, no public API yet',
  },
};

export function WearableSettings({
  configs,
  onConfigsChange,
  onSleepDataReceived,
  clientIdMap,
  redirectUri,
}: WearableSettingsProps) {
  const [syncing, setSyncing] = useState<WearableProvider | null>(null);
  const [lastSync, setLastSync] = useState<Record<WearableProvider, string>>({
    oura: '',
    fitbit: '',
    google_fit: '',
    apple_health: '',
    samsung_health: '',
    huawei_health: '',
    xiaomi_mi_fitness: '',
    garmin_connect: '',
    withings: '',
    amazfit: '',
    polar: '',
    sony: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleConnect = (provider: WearableProvider) => {
    const clientId = clientIdMap[provider];
    if (!clientId && PROVIDER_INFO[provider].authType !== 'placeholder') {
      setError(`Please configure ${PROVIDER_INFO[provider].name} client ID in settings`);
      return;
    }

    if (PROVIDER_INFO[provider].authType === 'native') {
      setError('Apple Health requires the mobile app. Please use the iOS/Android app to connect.');
      return;
    }

    if (PROVIDER_INFO[provider].authType === 'server_side') {
      setError(`${PROVIDER_INFO[provider].name} uses a server-side OAuth flow. Please configure in backend settings.`);
      return;
    }

    if (PROVIDER_INFO[provider].authType === 'placeholder') {
      setError(`${PROVIDER_INFO[provider].name} does not have a public API yet. Integration coming soon.`);
      return;
    }

    const state = `${provider}-${Date.now()}`;
    sessionStorage.setItem('wearable_oauth_state', state);
    sessionStorage.setItem('wearable_oauth_provider', provider);

    const url = getOAuthUrl(provider, clientId, redirectUri, state);
    if (url) {
      window.location.href = url;
    }
  };

  const handleDisconnect = (provider: WearableProvider) => {
    onConfigsChange(
      configs.map((c) =>
        c.provider === provider
          ? { ...c, enabled: false, auth: { provider, accessToken: '' } }
          : c
      )
    );
  };

  const handleSync = async (provider: WearableProvider) => {
    const config = configs.find((c) => c.provider === provider);
    if (!config?.auth.accessToken) return;

    setSyncing(provider);
    setError(null);

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const records = await fetchAllWearableSleep([config], startDate, endDate);
      onSleepDataReceived(records);

      setLastSync((prev) => ({ ...prev, [provider]: new Date().toLocaleString() }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(`${PROVIDER_INFO[provider].name}: ${message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    const enabledConfigs = configs.filter((c) => c.enabled && c.auth.accessToken);
    if (enabledConfigs.length === 0) {
      setError('No wearable devices connected');
      return;
    }

    setSyncing('oura' as WearableProvider);
    setError(null);

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const records = await fetchAllWearableSleep(enabledConfigs, startDate, endDate);
      onSleepDataReceived(records);

      const now = new Date().toLocaleString();
      const newLastSync = { ...lastSync };
      for (const config of enabledConfigs) {
        newLastSync[config.provider] = now;
      }
      setLastSync(newLastSync);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (provider: WearableProvider) => {
    return configs.some((c) => c.provider === provider && c.enabled && c.auth.accessToken);
  };

  // Group providers by category
  const premiumProviders: WearableProvider[] = ['oura', 'apple_health', 'garmin_connect'];
  const mainstreamProviders: WearableProvider[] = ['samsung_health', 'fitbit', 'withings', 'polar'];
  const asianMarketProviders: WearableProvider[] = ['huawei_health', 'xiaomi_mi_fitness', 'amazfit', 'sony'];
  const platformProviders: WearableProvider[] = ['google_fit'];

  const renderProviderCard = (provider: WearableProvider) => {
    const info = PROVIDER_INFO[provider];
    const connected = isConnected(provider);
    const Icon = info.icon;
    const isSyncing = syncing === provider;

    return (
      <div
        key={provider}
        className={`rounded-2xl border p-4 transition ${
          connected
            ? 'border-sage/30 bg-sage/5'
            : 'border-line bg-cream'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Provider icon */}
          <div className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>

          {/* Provider info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-ink">{info.name}</h4>
              {connected && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
              {info.authType === 'placeholder' && (
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
              {info.authType === 'server_side' && (
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  Server-side OAuth
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">{info.description}</p>

            {/* Features */}
            <div className="flex flex-wrap gap-1 mt-2">
              {info.features.map((feature) => (
                <span
                  key={feature}
                  className="text-[10px] bg-parchment border border-line px-1.5 py-0.5 rounded text-muted"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Market note */}
            {info.marketNote && (
              <p className="text-[10px] text-dusk mt-1.5 italic">
                📍 {info.marketNote}
              </p>
            )}

            {/* Last sync */}
            {lastSync[provider] && (
              <p className="text-[10px] text-muted mt-1.5">
                Last synced: {lastSync[provider]}
              </p>
            )}
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {connected ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSync(provider)}
                  disabled={isSyncing}
                  className="rounded-lg border border-sage/30 bg-white hover:bg-sage/5 px-2.5 py-1.5 text-xs font-medium text-sageDark flex items-center gap-1 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={2} />
                  Sync
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect(provider)}
                  className="rounded-lg border border-line bg-white hover:bg-rose-50 px-2 py-1.5 text-xs text-muted hover:text-rose-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleConnect(provider)}
                className="rounded-lg bg-sage hover:bg-sageDark text-white px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3 h-3" strokeWidth={2} />
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <Watch className="w-5 h-5 text-duskDeep" strokeWidth={1.75} />
            Wearable Devices
          </h3>
          <p className="text-xs text-muted mt-1">
            Connect your sleep tracker for automatic sleep data
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncing !== null}
          className="rounded-xl border border-sage/30 bg-sage/5 hover:bg-sage/10 px-3 py-1.5 text-xs font-medium text-sageDark flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={2} />
          Sync All
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
          <X className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Premium / Best-in-class */}
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          ★ Premium Sleep Tracking
        </h4>
        <div className="space-y-3">
          {premiumProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Mainstream Global */}
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🌍 Mainstream Global
        </h4>
        <div className="space-y-3">
          {mainstreamProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Asia / Japan Market */}
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🇯🇵 Asia & Japan Market
        </h4>
        <div className="space-y-3">
          {asianMarketProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Platform */}
      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🔗 Platform
        </h4>
        <div className="space-y-3">
          {platformProviders.map(renderProviderCard)}
        </div>
      </div>

      {/* Info note */}
      <div className="rounded-xl border border-line bg-parchment p-3 text-xs text-muted leading-relaxed">
        <p>
          <strong className="text-ink">Note:</strong> Wearable data is used locally to enhance your sleep insights.
          OAuth tokens are stored on this device and never sent to our servers.
          Apple Health requires the native iOS app for HealthKit access.
          Some providers (Garmin, Sony) require additional server-side configuration.
        </p>
      </div>
    </div>
  );
}

export default WearableSettings;
