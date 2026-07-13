import type { WearableConfig } from './wearables';

export const DEFAULT_WEARABLE_CONFIGS: WearableConfig[] = [
  { provider: 'oura', auth: { provider: 'oura', accessToken: '' }, enabled: false },
  { provider: 'apple_health', auth: { provider: 'apple_health', accessToken: '' }, enabled: false },
  { provider: 'samsung_health', auth: { provider: 'samsung_health', accessToken: '' }, enabled: false },
  { provider: 'huawei_health', auth: { provider: 'huawei_health', accessToken: '' }, enabled: false },
  { provider: 'xiaomi_mi_fitness', auth: { provider: 'xiaomi_mi_fitness', accessToken: '' }, enabled: false },
  { provider: 'garmin_connect', auth: { provider: 'garmin_connect', accessToken: '' }, enabled: false },
  { provider: 'withings', auth: { provider: 'withings', accessToken: '' }, enabled: false },
  { provider: 'fitbit', auth: { provider: 'fitbit', accessToken: '' }, enabled: false },
  { provider: 'google_fit', auth: { provider: 'google_fit', accessToken: '' }, enabled: false },
  { provider: 'amazfit', auth: { provider: 'amazfit', accessToken: '' }, enabled: false },
  { provider: 'polar', auth: { provider: 'polar', accessToken: '' }, enabled: false },
  { provider: 'sony', auth: { provider: 'sony', accessToken: '' }, enabled: false },
];