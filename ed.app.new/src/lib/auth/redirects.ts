/**
 * Auth redirect URLs — must match Supabase GoTrue allow list (GOTRUE_SITE_URL / URI_ALLOW_LIST).
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173';
}

export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}/#/reset-password`;
}

export function getEmailConfirmRedirectUrl(): string {
  return `${getAppOrigin()}/#/`;
}

export function isRecoveryHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  return hash.includes('type=recovery') || hash.includes('reset-password');
}