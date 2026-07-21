/**
 * useAuth — Authentication Hook
 *
 * Provides authentication state for the EverDream app.
 * Supports anonymous auth via Supabase, with email OTP as an upgrade path.
 *
 * Usage:
 * ```tsx
 * const { user, loading, signIn, signOut } = useAuth();
 * if (loading) return <Spinner />;
 * if (!user) return <LoginScreen />;
 * return <DreamJournalApp />;
 * ```
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase, getCurrentUser, authRedirectReady } from '../lib/supabase/client';
import { getEmailConfirmRedirectUrl, getPasswordResetRedirectUrl, isRecoveryHash } from '../lib/auth/redirects';
import { FEATURE_REQUIRE_AUTH } from '../config/features';
import {
  stripAuthParamsFromUrl,
  urlHasAuthArtifacts,
  urlIndicatesPasswordRecovery,
} from '../lib/auth/urlCleanup';

export interface AuthUser {
  id: string;
  email?: string;
  isAnonymous: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  isRecoveryMode: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * AuthProvider — wraps the app and provides auth state via context.
 * Must be used at the top of the component tree.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthInternal();
  return (
    <AuthContext.Provider value={auth} data-component="use-auth">
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state from any child component.
 * Must be used within an <AuthProvider>.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

function mapUser(user: { id: string; email?: string | null; is_anonymous?: boolean }): AuthUser {
  return {
    id: user.id,
    email: user.email ?? undefined,
    // Only treat as anonymous when GoTrue explicitly marks it.
    // `?? true` wrongly kept email/OAuth users on the login screen.
    isAnonymous: user.is_anonymous === true,
  };
}

/**
 * Internal hook implementation.
 * Automatically signs in anonymously on first visit if no session exists.
 */
function useAuthInternal(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(
    () => isRecoveryHash() || urlIndicatesPasswordRecovery(),
  );

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        // Ensure OAuth/magic-link tokens were consumed and stripped from the URL
        const redirect = await authRedirectReady;
        if (!mounted) return;
        if (redirect.wasRecovery) {
          setIsRecoveryMode(true);
        }

        // Belt-and-suspenders: never leave tokens in the bar
        if (urlHasAuthArtifacts()) {
          stripAuthParamsFromUrl({ preserveRecovery: redirect.wasRecovery || isRecoveryHash() });
        }

        const currentUser = await getCurrentUser();
        if (!mounted) return;

        if (currentUser) {
          setUser(mapUser(currentUser));
        } else if (FEATURE_REQUIRE_AUTH || import.meta.env.VITE_REQUIRE_AUTH === 'true') {
          setUser(null);
        } else {
          const { data, error: signInError } = await supabase.auth.signInAnonymously();
          if (!mounted) return;

          if (signInError) {
            console.warn('[useAuth] Anonymous sign-in failed, running in offline mode:', signInError.message);
            setUser(null);
          } else if (data.user) {
            setUser(mapUser(data.user));
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.warn('[useAuth] Auth check failed, running in offline mode:', err);
        setUser(null);
        if (urlHasAuthArtifacts()) {
          stripAuthParamsFromUrl();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        stripAuthParamsFromUrl({ preserveRecovery: true });
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(mapUser(session.user));
        if (isRecoveryHash() || urlIndicatesPasswordRecovery()) {
          setIsRecoveryMode(true);
        }
        if (urlHasAuthArtifacts()) {
          stripAuthParamsFromUrl({
            preserveRecovery: isRecoveryHash() || urlIndicatesPasswordRecovery(),
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRecoveryMode(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password?: string): Promise<{ error: Error | null }> => {
    setError(null);
    if (password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError);
        return { error: signInError };
      }
      return { error: null };
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getEmailConfirmRedirectUrl(),
      },
    });
    if (signInError) {
      setError(signInError);
      return { error: signInError };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailConfirmRedirectUrl(),
      },
    });
    if (signUpError) {
      setError(signUpError);
      return { error: signUpError };
    }
    return { error: null };
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (resetError) {
      setError(resetError);
      return { error: resetError };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<{ error: Error | null }> => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError);
      return { error: updateError };
    }
    setIsRecoveryMode(false);
    return { error: null };
  }, []);

  const signInAnonymously = useCallback(async () => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      setError(signInError);
      throw signInError;
    }
    if (data.user) {
      setUser(mapUser(data.user));
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError);
      throw signOutError;
    }
    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    isRecoveryMode,
    signIn,
    signUp,
    resetPasswordForEmail,
    updatePassword,
    signInAnonymously,
    signOut,
  };
}
