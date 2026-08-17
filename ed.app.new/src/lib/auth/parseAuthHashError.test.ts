import { describe, expect, it } from 'vitest';
import { formatAuthErrorMessage, parseAuthCallbackError, parseAuthHashError, parseAuthSearchError } from './parseAuthHashError';

describe('parseAuthHashError', () => {
  it('parses Supabase OAuth failure hash', () => {
    const result = parseAuthHashError(
      '#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user',
    );
    expect(result?.error).toBe('server_error');
    expect(result?.errorCode).toBe('unexpected_failure');
    expect(result?.description).toBe('Database error saving new user');
  });

  it('returns null when hash has no error', () => {
    expect(parseAuthHashError('#/')).toBeNull();
  });

  it('parses PKCE query errors', () => {
    const result = parseAuthSearchError(
      '?error=access_denied&error_code=bad_oauth_callback&error_description=Unable+to+exchange+external+code',
    );
    expect(result?.error).toBe('access_denied');
    expect(result?.description).toBe('Unable to exchange external code');
  });

  it('prefers query errors over hash', () => {
    const result = parseAuthCallbackError(
      '?error=server_error&error_description=provider+is+not+enabled',
      '#error=access_denied&error_description=ignored',
    );
    expect(result?.description).toBe('provider is not enabled');
  });
});

describe('formatAuthErrorMessage', () => {
  it('maps database signup failures to friendly copy', () => {
    expect(formatAuthErrorMessage('Database error saving new user')).toContain('could not finish creating');
  });

  it('highlights unregistered users on sign-in', () => {
    expect(formatAuthErrorMessage('Invalid login credentials', 'signin')).toContain('No account found');
  });

  it('maps interrupted Google PKCE exchanges', () => {
    expect(formatAuthErrorMessage('Unable to exchange external code')).toContain('Continue with Google');
  });
});