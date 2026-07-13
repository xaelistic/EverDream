import { useState, useEffect } from 'react';
import {
  Watch,
  RefreshCw,
  Check,
  X,
  Moon,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Smartphone,
  Zap,
  Bluetooth,
  Radio,
} from 'lucide-react';
import type { WearableConfig, WearableProvider, WearableSleepRecord } from '../../lib/wearables';
import { fetchAllWearableSleep } from '../../lib/wearables';
import { WearableConnectModal } from './WearableConnectModal';

interface WearableSettingsProps {
  configs: WearableConfig[];
  onConfigsChange: (configs: WearableConfig[]) => void;
  onSleepDataReceived: (records: WearableSleepRecord[]) => void;
  clientIdMap: Record<WearableProvider, string>;
  redirectUri: string;
  initialConnectProvider?: WearableProvider | null;
  onInitialConnectHandled?: () => void;
  oauthError?: string | null;
}

const PROVIDER_INFO: Record<WearableProvider, {
  name: string;
  icon: typeof Watch;
  color: string;
  description: string;
  features: string[];
  marketNote?: string;
}> = {
  oura: {
    name: 'Oura Ring',
    icon: Moon,
    color: 'bg-violet-500',
    description: 'Best-in-class sleep tracking with HRV, temperature, and respiratory rate',
    features: ['Sleep stages', 'HRV', 'Temperature', 'Respiratory rate', 'Readiness score'],
  },
  apple_health: {
    name: 'Apple Watch / Health',
    icon: Heart,
    color: 'bg-red-500',
    description: 'Native iOS sleep tracking with heart rate and blood oxygen',
    features: ['Sleep stages', 'Heart rate', 'Blood oxygen', 'Respiratory rate'],
  },
  samsung_health: {
    name: 'Samsung Galaxy Watch',
    icon: Smartphone,
    color: 'bg-blue-600',
    description: 'Samsung Health sleep tracking with Galaxy Watch integration',
    features: ['Sleep stages', 'Heart rate', 'Blood oxygen', 'Snoring detection', 'Sleep score'],
    marketNote: 'Popular in Japan & globally',
  },
  huawei_health: {
    name: 'Huawei Watch / Health',
    icon: Watch,
    color: 'bg-rose-600',
    description: 'Huawei Health Kit with TruSleep™ technology for detailed sleep analysis',
    features: ['TruSleep™ stages', 'Heart rate', 'SpO2', 'Respiratory rate', 'Sleep score'],
    marketNote: 'Dominant in China, growing in Japan',
  },
  xiaomi_mi_fitness: {
    name: 'Xiaomi / Amazfit',
    icon: Zap,
    color: 'bg-orange-500',
    description: 'Mi Fitness and Amazfit wearables with comprehensive sleep tracking',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Nap tracking', 'Sleep score'],
    marketNote: 'Extremely popular in Japan & Asia',
  },
  garmin_connect: {
    name: 'Garmin Connect',
    icon: Activity,
    color: 'bg-sky-600',
    description: 'Garmin watches with advanced sleep and Body Battery™ tracking',
    features: ['Sleep stages', 'Body Battery™', 'HRV', 'Respiration', 'Pulse Ox', 'Sleep score'],
    marketNote: 'Popular with athletes globally',
  },
  withings: {
    name: 'Withings',
    icon: Thermometer,
    color: 'bg-emerald-600',
    description: 'Withings sleep analyzers and smart watches with medical-grade sensors',
    features: ['Sleep stages', 'Heart rate', 'Respiratory rate', 'Sleep apnea detection', 'Sleep score'],
    marketNote: 'Popular in Europe & Japan',
  },
  fitbit: {
    name: 'Fitbit',
    icon: Activity,
    color: 'bg-cyan-500',
    description: 'Comprehensive fitness and sleep tracking',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Restlessness'],
  },
  google_fit: {
    name: 'Google Fit',
    icon: Wind,
    color: 'bg-green-500',
    description: "Google's health platform with sleep segment data",
    features: ['Sleep stages', 'Sleep duration', 'Bedtime/wake time'],
  },
  amazfit: {
    name: 'Amazfit (Zepp)',
    icon: Bluetooth,
    color: 'bg-teal-500',
    description: 'Amazfit smartwatches via Zepp app with long battery life',
    features: ['Sleep stages', 'Heart rate', 'SpO2', 'Stress monitoring', 'PAI score'],
    marketNote: 'Very popular in Japan',
  },
  polar: {
    name: 'Polar',
    icon: Radio,
    color: 'bg-red-700',
    description: 'Polar sports watches with precision sleep and recovery tracking',
    features: ['Sleep stages', 'Nightly Recharge™', 'HRV', 'Heart rate', 'Sleep score'],
    marketNote: 'Popular in Japan & Europe',
  },
  sony: {
    name: 'Sony (Wena Wrist)',
    icon: Zap,
    color: 'bg-gray-700',
    description: 'Sony Wena Wrist smartwatch — API not yet publicly available',
    features: ['Sleep tracking', 'Heart rate', 'Notifications'],
    marketNote: 'Japan-only, no public API yet',
  },
};

export function WearableSettings({
  configs,
  onConfigsChange,
  onSleepDataReceived,
  clientIdMap,
  redirectUri,
  initialConnectProvider = null,
  onInitialConnectHandled,
  oauthError = null,
}: WearableSettingsProps) {
  const [syncing, setSyncing] = useState<WearableProvider | null>(null);
  const [lastSync, setLastSync] = useState<Record<WearableProvider, string>>({
    oura: '', fitbit: '', google_fit: '', apple_health: '', samsung_health: '',
    huawei_health: '', xiaomi_mi_fitness: '', garmin_connect: '', withings: '',
    amazfit: '', polar: '', sony: '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [connectProvider, setConnectProvider] = useState<WearableProvider | null>(
    initialConnectProvider,
  );

  useEffect(() => {
    if (initialConnectProvider) {
      setConnectProvider(initialConnectProvider);
    }
  }, [initialConnectProvider]);

  const isConnected = (provider: WearableProvider) =>
    configs.some((c) => c.provider === provider && c.enabled && c.auth.accessToken);

  const upsertConfig = (config: WearableConfig) => {
    const updated = [...configs.filter((c) => c.provider !== config.provider), config];
    onConfigsChange(updated);
  };

  const handleDisconnect = (provider: WearableProvider) => {
    onConfigsChange(
      configs.map((c) =>
        c.provider === provider
          ? { ...c, enabled: false, auth: { provider, accessToken: '' } }
          : c,
      ),
    );
    setStatus(`${PROVIDER_INFO[provider].name} disconnected.`);
  };

  const handleSync = async (provider: WearableProvider) => {
    const config = configs.find((c) => c.provider === provider);
    if (!config?.auth.accessToken) return;

    setSyncing(provider);
    setStatus(null);

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const records = await fetchAllWearableSleep([config], startDate, endDate);
      onSleepDataReceived(records);
      setLastSync((prev) => ({ ...prev, [provider]: new Date().toLocaleString() }));
      setStatus(
        records.length > 0
          ? `Synced ${records.length} night(s) from ${PROVIDER_INFO[provider].name}.`
          : `Connected to ${PROVIDER_INFO[provider].name}, but no sleep data was returned yet.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setStatus(`${PROVIDER_INFO[provider].name}: ${message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    const enabledConfigs = configs.filter((c) => c.enabled && c.auth.accessToken);
    if (enabledConfigs.length === 0) {
      setStatus('Connect a device first, then tap Sync.');
      return;
    }

    setSyncing('oura');
    setStatus(null);

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
      setStatus(`Synced ${records.length} night(s) from ${enabledConfigs.length} device(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setStatus(message);
    } finally {
      setSyncing(null);
    }
  };

  const handleConnected = async (config: WearableConfig) => {
    upsertConfig(config);
    setStatus(`${PROVIDER_INFO[config.provider].name} connected. Syncing sleep data…`);
    await handleSync(config.provider);
  };

  const openConnect = (provider: WearableProvider) => {
    setConnectProvider(provider);
    onInitialConnectHandled?.();
  };

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
          connected ? 'border-sage/30 bg-sage/5' : 'border-line bg-cream'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${info.color} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-ink">{info.name}</h4>
              {connected && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-sage bg-sage/10 px-1.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">{info.description}</p>

            <div className="flex flex-wrap gap-1 mt-2">
              {info.features.slice(0, 4).map((feature) => (
                <span
                  key={feature}
                  className="text-[10px] bg-parchment border border-line px-1.5 py-0.5 rounded text-muted"
                >
                  {feature}
                </span>
              ))}
            </div>

            {info.marketNote && (
              <p className="text-[10px] text-dusk mt-1.5 italic">📍 {info.marketNote}</p>
            )}

            {lastSync[provider] && (
              <p className="text-[10px] text-muted mt-1.5">Last synced: {lastSync[provider]}</p>
            )}
          </div>

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
                  aria-label={`Disconnect ${info.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openConnect(provider)}
                className="rounded-lg bg-sage hover:bg-sageDark text-white px-3 py-1.5 text-xs font-medium transition"
              >
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <Watch className="w-5 h-5 text-duskDeep" strokeWidth={1.75} />
            Wearable Devices
          </h3>
          <p className="text-xs text-muted mt-1">
            {configs.filter((c) => c.enabled && c.auth.accessToken).length > 0
              ? `${configs.filter((c) => c.enabled && c.auth.accessToken).length} device(s) connected`
              : 'Tap Connect to add a sleep tracker'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncing !== null}
          className="rounded-xl border border-sage/30 bg-sage/5 hover:bg-sage/10 px-3 py-1.5 text-xs font-medium text-sageDark flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} strokeWidth={2} />
          Sync All
        </button>
      </div>

      {status && (
        <div className="rounded-xl border border-sage/25 bg-sage/5 px-3 py-2 text-xs text-sageDark leading-relaxed">
          {status}
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          ★ Premium Sleep Tracking
        </h4>
        <div className="space-y-3">{premiumProviders.map(renderProviderCard)}</div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🌍 Mainstream Global
        </h4>
        <div className="space-y-3">{mainstreamProviders.map(renderProviderCard)}</div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🇯🇵 Asia & Japan Market
        </h4>
        <div className="space-y-3">{asianMarketProviders.map(renderProviderCard)}</div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          🔗 Platform
        </h4>
        <div className="space-y-3">{platformProviders.map(renderProviderCard)}</div>
      </div>

      <WearableConnectModal
        provider={connectProvider}
        isOpen={connectProvider !== null}
        onClose={() => {
          setConnectProvider(null);
          onInitialConnectHandled?.();
        }}
        clientId={connectProvider ? clientIdMap[connectProvider] : ''}
        redirectUri={redirectUri}
        onConnected={handleConnected}
        onSync={handleSync}
        isConnected={connectProvider ? isConnected(connectProvider) : false}
        oauthError={oauthError}
      />
    </div>
  );
}

export default WearableSettings;