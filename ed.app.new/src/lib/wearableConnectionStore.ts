import type { WearableConfig, WearableProvider } from './wearables';

const CONFIGS_KEY = 'everdream_wearable_configs';
const TOKENS_KEY = 'wearable_test_tokens';
const OAUTH_PENDING_KEY = 'wearable_oauth_pending';

export interface PendingWearableOAuth {
  provider: WearableProvider;
  code: string;
  state: string;
  receivedAt: string;
}

export function loadWearableConfigs(fallback: WearableConfig[]): WearableConfig[] {
  try {
    const raw = localStorage.getItem(CONFIGS_KEY);
    if (!raw) return mergeTokenFallback(fallback);
    const parsed = JSON.parse(raw) as WearableConfig[];
    if (!Array.isArray(parsed)) return mergeTokenFallback(fallback);
    return mergeTokenFallback(parsed);
  } catch {
    return mergeTokenFallback(fallback);
  }
}

export function saveWearableConfigs(configs: WearableConfig[]): void {
  try {
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
    const tokens: Partial<Record<WearableProvider, string>> = {};
    for (const config of configs) {
      if (config.enabled && config.auth.accessToken) {
        tokens[config.provider] = config.auth.accessToken;
      }
    }
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('[WearableStore] save failed:', e);
  }
}

function mergeTokenFallback(configs: WearableConfig[]): WearableConfig[] {
  try {
    const saved = localStorage.getItem(TOKENS_KEY);
    if (!saved) return configs;
    const tokens = JSON.parse(saved) as Partial<Record<WearableProvider, string>>;
    return configs.map((config) => {
      const token = tokens[config.provider];
      if (!token) return config;
      return {
        ...config,
        enabled: true,
        auth: { ...config.auth, accessToken: token },
      };
    });
  } catch {
    return configs;
  }
}

export function setPendingOAuth(pending: PendingWearableOAuth): void {
  sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(pending));
}

export function consumePendingOAuth(): PendingWearableOAuth | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return JSON.parse(raw) as PendingWearableOAuth;
  } catch {
    return null;
  }
}

export function parseWearableOAuthFromUrl(): PendingWearableOAuth | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) return null;

  const provider = sessionStorage.getItem('wearable_oauth_provider') as WearableProvider | null;
  const expectedState = sessionStorage.getItem('wearable_oauth_state');
  if (!provider || !expectedState || state !== expectedState) return null;

  window.history.replaceState({}, '', window.location.pathname + window.location.hash);

  return {
    provider,
    code,
    state,
    receivedAt: new Date().toISOString(),
  };
}