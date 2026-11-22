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
import { clearProfileCache } from '../lib/profileService';

const AUTH_WAIT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('auth-timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

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
      const deadline = Date.now() + AUTH_WAIT_MS;
      const remaining = () => Math.max(400, deadline - Date.now());
      try {
        // Ensure OAuth/magic-link tokens were consumed and stripped from the URL.
        // A stuck getSession must not leave the loading screen up forever.
        const returningFromAuth = urlHasAuthArtifacts();
        let redirect = { wasRecovery: false, hadArtifacts: false };
        let redirectSettled = false;
        try {
          redirect = await withTimeout(authRedirectReady, returningFromAuth ? 25000 : remaining());
          redirectSettled = true;
        } catch (err) {
          console.warn('[useAuth] Auth redirect wait ended:', err);
        }
        if (!mounted) return;
        if (redirect.wasRecovery) {
          setIsRecoveryMode(true);
        }

        // Strip tokens only after the exchange has finished. A phone return
        // that is still exchanging must keep ?code= or Google sign-in dies.
        if (redirectSettled && urlHasAuthArtifacts()) {
          stripAuthParamsFromUrl({ preserveRecovery: redirect.wasRecovery || isRecoveryHash() });
        }

        let currentUser = null as Awaited<ReturnType<typeof getCurrentUser>>;
        try {
          currentUser = await withTimeout(getCurrentUser(), remaining());
        } catch (err) {
          console.warn('[useAuth] Session check ended, using the stored session:', err);
          try {
            const { data } = await withTimeout(supabase.auth.getSession(), Math.min(1500, remaining()));
            currentUser = data.session?.user ?? null;
          } catch {
            currentUser = null;
          }
        }
        if (!mounted) return;

        if (currentUser) {
          setUser(mapUser(currentUser));
        } else if (FEATURE_REQUIRE_AUTH || import.meta.env.VITE_REQUIRE_AUTH === 'true') {
          setUser(null);
        } else {
          const { data, error: signInError } = await withTimeout(
            supabase.auth.signInAnonymously(),
            remaining(),
          );
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

      if (event === 'INITIAL_SESSION') {
        if (session?.user) setUser(mapUser(session.user));
        setLoading(false);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        stripAuthParamsFromUrl({ preserveRecovery: true });
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Wipe every cached profile so we never paint the previous account's avatar
        clearProfileCache();
        setUser(mapUser(session.user));
        setLoading(false);
        if (isRecoveryHash() || urlIndicatesPasswordRecovery()) {
          setIsRecoveryMode(true);
        }
        if (urlHasAuthArtifacts()) {
          stripAuthParamsFromUrl({
            preserveRecovery: isRecoveryHash() || urlIndicatesPasswordRecovery(),
          });
        }
      } else if (event === 'SIGNED_OUT') {
        clearProfileCache();
        setUser(null);
        setIsRecoveryMode(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        setUser(mapUser(session.user));
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
    const previousId = user?.id ?? null;
    const { error: signOutError } = await supabase.auth.signOut();
    // Clear profile cache even if signOut partially fails — safer for account switch
    clearProfileCache(previousId);
    clearProfileCache();
    if (signOutError) {
      setError(signOutError);
      throw signOutError;
    }
    setUser(null);
  }, [user?.id]);

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
