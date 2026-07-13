import type { WearableProvider } from './wearables';

/**
 * Resolve OAuth client IDs from Vite env (set in Coolify per provider).
 * Falls back to shared Google client for Google Fit when a dedicated ID is absent.
 */
export function getWearableClientIdMap(): Record<WearableProvider, string> {
  const google =
    import.meta.env.VITE_WEARABLE_GOOGLE_FIT_CLIENT_ID ||
    import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '';

  return {
    oura: import.meta.env.VITE_WEARABLE_OURA_CLIENT_ID || '',
    fitbit: import.meta.env.VITE_WEARABLE_FITBIT_CLIENT_ID || '',
    google_fit: google,
    apple_health: '',
    samsung_health: import.meta.env.VITE_WEARABLE_SAMSUNG_CLIENT_ID || '',
    huawei_health: import.meta.env.VITE_WEARABLE_HUAWEI_CLIENT_ID || '',
    xiaomi_mi_fitness: import.meta.env.VITE_WEARABLE_XIAOMI_CLIENT_ID || '',
    garmin_connect: import.meta.env.VITE_WEARABLE_GARMIN_CLIENT_ID || '',
    withings: import.meta.env.VITE_WEARABLE_WITHINGS_CLIENT_ID || '',
    amazfit: import.meta.env.VITE_WEARABLE_AMAZFIT_CLIENT_ID || '',
    polar: import.meta.env.VITE_WEARABLE_POLAR_CLIENT_ID || '',
    sony: '',
  };
}

export function getWearableRedirectUri(): string {
  const configured = import.meta.env.VITE_WEARABLE_OAUTH_REDIRECT_URI;
  if (configured) return configured;
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}