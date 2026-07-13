import { describe, expect, it } from 'vitest';
import { formatAuthErrorMessage, parseAuthHashError } from './parseAuthHashError';

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
});

describe('formatAuthErrorMessage', () => {
  it('maps database signup failures to friendly copy', () => {
    expect(formatAuthErrorMessage('Database error saving new user')).toContain('could not finish creating');
  });

  it('highlights unregistered users on sign-in', () => {
    expect(formatAuthErrorMessage('Invalid login credentials', 'signin')).toContain('No account found');
  });
});