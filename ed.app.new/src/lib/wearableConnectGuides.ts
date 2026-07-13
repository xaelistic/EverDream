import type { WearableProvider } from './wearables';

export type WearableAuthType = 'oauth' | 'native' | 'server_side' | 'placeholder';

export interface WearableGuideStep {
  title: string;
  body: string;
  /** Visual hint shown in the mock device frame */
  visual: string;
}

export interface WearableConnectGuide {
  provider: WearableProvider;
  name: string;
  authType: WearableAuthType;
  summary: string;
  steps: WearableGuideStep[];
  helpUrl?: string;
  oauthLabel?: string;
  tokenLabel?: string;
  tokenPlaceholder?: string;
  tokenHelpUrl?: string;
}

export const WEARABLE_CONNECT_GUIDES: Record<WearableProvider, WearableConnectGuide> = {
  google_fit: {
    provider: 'google_fit',
    name: 'Google Fit',
    authType: 'oauth',
    summary: 'Sign in with Google to read sleep segments from Google Fit / Health Connect.',
    oauthLabel: 'Connect with Google',
    steps: [
      {
        title: 'Enable sleep on your phone',
        body: 'Open Google Fit (or Health Connect on Android) and confirm sleep tracking is on for your watch or phone.',
        visual: 'Sleep tracking ON',
      },
      {
        title: 'Sign in with Google',
        body: 'Tap Connect with Google below. Choose the account that syncs your Fit data and approve sleep read access.',
        visual: 'Google account picker',
      },
      {
        title: 'Return and sync',
        body: 'After approving access, come back here and tap Sync to pull your last 30 nights.',
        visual: 'EverDream ↔ Google Fit',
      },
    ],
    helpUrl: 'https://support.google.com/fit/answer/6098268',
    tokenPlaceholder: 'Paste Google OAuth access token (advanced)',
    tokenHelpUrl: 'https://developers.google.com/fit/rest/v1/get-started',
  },
  oura: {
    provider: 'oura',
    name: 'Oura Ring',
    authType: 'oauth',
    summary: 'Connect Oura for best-in-class sleep stages, HRV, and readiness.',
    oauthLabel: 'Connect Oura account',
    steps: [
      {
        title: 'Open Oura Cloud',
        body: 'Sign in at cloud.ouraring.com with the same account as your ring.',
        visual: 'cloud.ouraring.com',
      },
      {
        title: 'Create a personal access token',
        body: 'Go to Personal Access Tokens → Create new token with daily sleep read scope.',
        visual: 'Personal Access Token',
      },
      {
        title: 'Paste token here',
        body: 'Copy the token and paste it below, then tap Connect. We store it only on this device.',
        visual: 'Token saved locally',
      },
    ],
    helpUrl: 'https://cloud.ouraring.com/docs/authentication',
    tokenLabel: 'Oura personal access token',
    tokenPlaceholder: 'Paste your Oura token',
    tokenHelpUrl: 'https://cloud.ouraring.com/personal-access-tokens',
  },
  fitbit: {
    provider: 'fitbit',
    name: 'Fitbit',
    authType: 'oauth',
    summary: 'Authorize Fitbit to sync sleep stages and heart rate.',
    oauthLabel: 'Connect with Fitbit',
    steps: [
      { title: 'Wear your Fitbit overnight', body: 'Make sure last night synced to the Fitbit app.', visual: 'Fitbit app synced' },
      { title: 'Authorize EverDream', body: 'Tap Connect with Fitbit and approve sleep + heart rate scopes.', visual: 'Fitbit OAuth' },
      { title: 'Sync sleep history', body: 'Use Sync on the device card to import the last 30 days.', visual: 'Sleep stages imported' },
    ],
    helpUrl: 'https://dev.fitbit.com/build/reference/web-api/sleep/',
    tokenPlaceholder: 'Paste Fitbit access token (advanced)',
  },
  apple_health: {
    provider: 'apple_health',
    name: 'Apple Health',
    authType: 'native',
    summary: 'Apple Health requires the EverDream iOS app — HealthKit cannot be authorized from the browser.',
    steps: [
      { title: 'Install EverDream on iPhone', body: 'Download the iOS app when available, or use Apple Watch sleep via the Health app.', visual: 'App Store' },
      { title: 'Open Health → Sharing', body: 'In the Health app, tap your profile → Apps → EverDream (or enable sleep data sharing).', visual: 'Health → Sharing' },
      { title: 'Enable Sleep analysis', body: 'Turn on Sleep, Heart Rate, and Respiratory Rate for EverDream.', visual: 'Sleep permissions' },
    ],
    helpUrl: 'https://support.apple.com/guide/iphone/share-health-data-iph5ede58c3d/ios',
  },
  samsung_health: {
    provider: 'samsung_health',
    name: 'Samsung Health',
    authType: 'oauth',
    summary: 'Connect Samsung Health from your Galaxy Watch or phone.',
    oauthLabel: 'Connect Samsung account',
    steps: [
      { title: 'Sync Galaxy Watch', body: 'Open Samsung Health and confirm sleep from your watch is present.', visual: 'Samsung Health sleep' },
      { title: 'Authorize access', body: 'Sign in with your Samsung account and allow sleep data read access.', visual: 'Samsung OAuth' },
      { title: 'Sync to EverDream', body: 'Return here and tap Sync on the Samsung card.', visual: 'Data imported' },
    ],
    tokenPlaceholder: 'Paste Samsung Health token (advanced)',
  },
  garmin_connect: {
    provider: 'garmin_connect',
    name: 'Garmin Connect',
    authType: 'server_side',
    summary: 'Garmin uses a secure server-side link. Sign in on Garmin Connect, then paste your access token if you have one.',
    steps: [
      { title: 'Open Garmin Connect', body: 'Ensure your watch synced last night in the Garmin Connect app.', visual: 'Garmin Connect' },
      { title: 'Authorize via Garmin', body: 'Use the link below to sign in on Garmin’s site. Server pairing may require admin setup.', visual: 'garmin.com/oauth' },
      { title: 'Paste token (optional)', body: 'If you have a developer or partner token, paste it below to connect immediately.', visual: 'Token connect' },
    ],
    helpUrl: 'https://developer.garmin.com/gc-developer-program/overview/',
    tokenLabel: 'Garmin access token',
    tokenPlaceholder: 'Paste Garmin token if available',
  },
  withings: {
    provider: 'withings',
    name: 'Withings',
    authType: 'oauth',
    summary: 'Connect Withings sleep analyzers or watches.',
    oauthLabel: 'Connect Withings account',
    steps: [
      { title: 'Check Withings app', body: 'Confirm sleep is recorded in the Withings Health Mate app.', visual: 'Health Mate' },
      { title: 'Authorize EverDream', body: 'Sign in with Withings and approve sleep scope.', visual: 'Withings OAuth' },
      { title: 'Sync history', body: 'Tap Sync to import recent nights.', visual: 'Sleep imported' },
    ],
    tokenPlaceholder: 'Paste Withings token (advanced)',
  },
  huawei_health: {
    provider: 'huawei_health',
    name: 'Huawei Health',
    authType: 'oauth',
    summary: 'Connect Huawei Health Kit for TruSleep data.',
    oauthLabel: 'Connect Huawei ID',
    steps: [
      { title: 'Sync Huawei watch', body: 'Open Huawei Health and verify sleep data is present.', visual: 'Huawei Health' },
      { title: 'Authorize', body: 'Sign in with Huawei ID and grant sleep read permission.', visual: 'Huawei OAuth' },
      { title: 'Sync', body: 'Return and sync your sleep history.', visual: 'Import complete' },
    ],
    tokenPlaceholder: 'Paste Huawei token (advanced)',
  },
  xiaomi_mi_fitness: {
    provider: 'xiaomi_mi_fitness',
    name: 'Xiaomi / Mi Fitness',
    authType: 'oauth',
    summary: 'Connect Mi Fitness or Zepp sleep data.',
    oauthLabel: 'Connect Mi account',
    steps: [
      { title: 'Open Mi Fitness', body: 'Confirm sleep synced from your band or watch.', visual: 'Mi Fitness' },
      { title: 'Authorize', body: 'Sign in with Xiaomi account and allow sleep access.', visual: 'Xiaomi OAuth' },
      { title: 'Sync', body: 'Import the last 30 nights with Sync.', visual: 'Sleep data' },
    ],
    tokenPlaceholder: 'Paste Mi Fitness token (advanced)',
  },
  amazfit: {
    provider: 'amazfit',
    name: 'Amazfit (Zepp)',
    authType: 'oauth',
    summary: 'Connect Zepp / Amazfit sleep tracking.',
    oauthLabel: 'Connect Zepp account',
    steps: [
      { title: 'Open Zepp app', body: 'Verify sleep is logged for recent nights.', visual: 'Zepp app' },
      { title: 'Authorize', body: 'Sign in and approve sleep data access.', visual: 'Zepp OAuth' },
      { title: 'Sync', body: 'Pull sleep history into EverDream.', visual: 'Synced' },
    ],
    tokenPlaceholder: 'Paste Zepp token (advanced)',
  },
  polar: {
    provider: 'polar',
    name: 'Polar',
    authType: 'oauth',
    summary: 'Connect Polar Flow sleep and recovery data.',
    oauthLabel: 'Connect Polar account',
    steps: [
      { title: 'Sync Polar watch', body: 'Open Polar Flow and confirm sleep is uploaded.', visual: 'Polar Flow' },
      { title: 'Authorize', body: 'Sign in with Polar and grant AccessLink read access.', visual: 'Polar OAuth' },
      { title: 'Sync', body: 'Import sleep sessions into EverDream.', visual: 'Import' },
    ],
    tokenPlaceholder: 'Paste Polar token (advanced)',
  },
  sony: {
    provider: 'sony',
    name: 'Sony Wena',
    authType: 'placeholder',
    summary: 'Sony does not offer a public API yet. You can still log sleep manually in the tracker.',
    steps: [
      { title: 'No public API', body: 'Sony Wena integration is not available for third-party apps yet.', visual: 'Coming soon' },
      { title: 'Use manual logging', body: 'Log sleep in the Tracker tab or connect another wearable.', visual: 'Tracker' },
    ],
  },
};