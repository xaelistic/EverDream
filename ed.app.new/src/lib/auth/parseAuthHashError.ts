export interface AuthHashError {
  error: string;
  errorCode?: string;
  description: string;
}

function parseAuthErrorParams(params: URLSearchParams): AuthHashError | null {
  const error = params.get('error');
  if (!error) return null;

  const description = (params.get('error_description') || error).replace(/\+/g, ' ');
  return {
    error,
    errorCode: params.get('error_code') || undefined,
    description,
  };
}

/** Parse Supabase GoTrue error params from the URL hash after a failed OAuth redirect. */
export function parseAuthHashError(hash: string): AuthHashError | null {
  if (!hash || !hash.includes('error=')) return null;

  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return parseAuthErrorParams(new URLSearchParams(raw));
}

/** PKCE / query-string errors after Google (or other) OAuth returns to the app. */
export function parseAuthSearchError(search: string): AuthHashError | null {
  if (!search || !search.includes('error=')) return null;
  return parseAuthErrorParams(new URLSearchParams(search.startsWith('?') ? search : `?${search}`));
}

/** Prefer query errors (PKCE) then hash errors (implicit / recovery). */
export function parseAuthCallbackError(
  search = typeof window === 'undefined' ? '' : window.location.search,
  hash = typeof window === 'undefined' ? '' : window.location.hash,
): AuthHashError | null {
  return parseAuthSearchError(search) || parseAuthHashError(hash);
}

/** Map raw Supabase auth errors to user-facing copy. */
export function formatAuthErrorMessage(message: string, mode: 'signin' | 'signup' = 'signin'): string {
  const lower = message.toLowerCase();

  if (lower.includes('database error saving new user')) {
    return 'We could not finish creating your account. Please try again in a moment, or sign up with email instead.';
  }

  if (
    lower.includes('invalid login credentials')
    || lower.includes('invalid_credentials')
    || (lower.includes('user') && lower.includes('not found'))
  ) {
    if (mode === 'signin') {
      return 'No account found for that email and password. Create an account below, or use Google or Meta to sign in.';
    }
    return 'Could not create your account. You may already have an account — try signing in instead.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the confirmation link.';
  }

  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Sign in instead, or use Google if you registered that way.';
  }

  if (
    lower.includes('unable to exchange')
    || lower.includes('code verifier')
    || lower.includes('invalid flow state')
    || lower.includes('pkce')
  ) {
    return 'Google sign-in was interrupted before it could finish. Please tap Continue with Google again.';
  }

  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Google sign-in is not enabled on the server yet. Please use email, or try again shortly.';
  }

  if (
    lower.includes('no api key')
    || lower.includes('invalid api key')
    || (lower.includes('unauthorized') && (lower.includes('kong') || lower.includes('apikey')))
  ) {
    return 'Sign-in service rejected this app key. Please try again in a moment.';
  }

  return message;
}

export function clearAuthHashError(): void {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  if (!hash.includes('error=')) return;
  window.history.replaceState({}, document.title, `${window.location.pathname}#/`);
}