/**
 * Auth URL cleanup
 *
 * OAuth / magic-link / recovery redirects must NEVER leave tokens in the
 * address bar (history, screenshots, referrer leaks).
 *
 * EverDream uses a hash router (`#/…`). If OAuth redirectTo also contains a
 * hash, GoTrue produces broken URLs like:
 *   https://app/#/#access_token=…
 * which both leaks tokens and can break session detection.
 */

const AUTH_HASH_KEYS = [
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
  'token_hash',
  'error',
  'error_code',
  'error_description',
] as const;

const AUTH_QUERY_KEYS = [
  'code',
  'state',
  'error',
  'error_code',
  'error_description',
  'sb',
] as const;

/** True if the current URL carries auth tokens or OAuth codes. */
export function urlHasAuthArtifacts(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  if (AUTH_HASH_KEYS.some((k) => hash.includes(`${k}=`))) return true;
  if (hash.includes('access_token') || hash.includes('refresh_token')) return true;
  // Double-hash residue: #/#access_token=…
  if (/#\/?#?&?access_token=/.test(hash) || hash.includes('#access_token=')) return true;
  const params = new URLSearchParams(search);
  return AUTH_QUERY_KEYS.some((k) => params.has(k));
}

/** Capture recovery intent before stripping the URL. */
export function urlIndicatesPasswordRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const { hash, search } = window.location;
  if (hash.includes('type=recovery') || hash.includes('reset-password')) return true;
  const params = new URLSearchParams(search);
  return params.get('type') === 'recovery';
}

function hashLooksLikeAuth(hash: string): boolean {
  return AUTH_HASH_KEYS.some((k) => hash.includes(`${k}=`));
}

/**
 * Strip auth tokens/codes from the URL and restore a clean app route.
 * Safe to call multiple times.
 */
export function stripAuthParamsFromUrl(opts?: {
  preserveRecovery?: boolean;
  fallbackHash?: string;
}): void {
  if (typeof window === 'undefined') return;

  const preserveRecovery = opts?.preserveRecovery ?? urlIndicatesPasswordRecovery();
  const fallbackHash = opts?.fallbackHash ?? '#/';

  const url = new URL(window.location.href);

  // Remove OAuth query params (PKCE code flow + flags)
  for (const key of AUTH_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  url.searchParams.delete('type');
  url.searchParams.delete('auth');
  url.searchParams.delete('social');

  // Decide clean hash route for the SPA
  let nextHash = fallbackHash;
  if (preserveRecovery) {
    nextHash = '#/reset-password';
  } else if (url.hash && !hashLooksLikeAuth(url.hash)) {
    // Keep non-auth app routes like #/journal; normalise #/# → #/
    let cleaned = url.hash.replace(/^#\/#+/, '#/');
    if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
    if (cleaned === '#' || cleaned === '#/') nextHash = fallbackHash;
    else nextHash = cleaned;
  }

  if (!nextHash.startsWith('#')) nextHash = `#${nextHash}`;

  const clean = `${url.origin}${url.pathname}${url.search}${nextHash}`;

  if (window.location.href !== clean) {
    window.history.replaceState(window.history.state, document.title, clean);
  }
}

/**
 * Consume session from URL (implicit hash or PKCE code) then strip tokens.
 * Call once at app boot before/alongside AuthProvider.
 */
export async function consumeAuthRedirectAndCleanUrl(
  getSession: () => Promise<unknown>,
): Promise<{ wasRecovery: boolean; hadArtifacts: boolean }> {
  if (typeof window === 'undefined') {
    return { wasRecovery: false, hadArtifacts: false };
  }

  const hadArtifacts = urlHasAuthArtifacts();
  const wasRecovery = urlIndicatesPasswordRecovery();

  if (hadArtifacts) {
    try {
      // Triggers @supabase/gotrue-js detectSessionInUrl / PKCE exchange
      await getSession();
    } catch (err) {
      console.warn('[auth] Failed to consume session from URL:', err);
    } finally {
      // Always scrub — even if exchange failed — so secrets leave the bar
      stripAuthParamsFromUrl({ preserveRecovery: wasRecovery });
    }
  }

  return { wasRecovery, hadArtifacts };
}
