/**
 * Auth redirect URLs — must match Supabase GoTrue allow list
 * (GOTRUE_SITE_URL / URI_ALLOW_LIST).
 *
 * IMPORTANT: Do NOT put app hash routes (`#/…`) in OAuth redirectTo.
 * GoTrue delivers tokens via the URL fragment; a pre-existing hash becomes
 * `#/#access_token=…` and leaves secrets in the address bar / history.
 *
 * Use a clean origin (optionally `?auth=callback`) and let the client:
 *  1) exchange/detect the session
 *  2) strip tokens from the URL
 *  3) navigate to the hash route
 */

export function getAppOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5173';
}

/** Base path without hash — safe for OAuth / email redirects. */
export function getAuthCallbackUrl(query?: Record<string, string>): string {
  const origin = getAppOrigin();
  const path = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const url = new URL(path || '/', origin);
  url.searchParams.set('auth', 'callback');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function getPasswordResetRedirectUrl(): string {
  // Query flag survives better than hash for email clients; client maps to #/reset-password
  return getAuthCallbackUrl({ type: 'recovery' });
}

export function getEmailConfirmRedirectUrl(): string {
  return getAuthCallbackUrl();
}

export function getOAuthRedirectUrl(intent: 'login' | 'link' = 'login'): string {
  return getAuthCallbackUrl(intent === 'link' ? { social: 'link' } : undefined);
}

export function isRecoveryHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (hash.includes('type=recovery') || hash.includes('reset-password')) return true;
  return new URLSearchParams(search).get('type') === 'recovery';
}
