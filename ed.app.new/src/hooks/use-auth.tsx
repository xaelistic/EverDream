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
import { supabase, getCurrentUser } from '../lib/supabase/client';
import { getEmailConfirmRedirectUrl, getPasswordResetRedirectUrl, isRecoveryHash } from '../lib/auth/redirects';

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

/**
 * Internal hook implementation.
 * Automatically signs in anonymously on first visit if no session exists.
 */
function useAuthInternal(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => isRecoveryHash());

  // Check current auth state on mount
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;

        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            isAnonymous: currentUser.is_anonymous ?? true,
          });
        } else if (import.meta.env.VITE_REQUIRE_AUTH === 'true') {
          setUser(null);
        } else {
          // No session — sign in anonymously (skipped when login is required)
          const { data, error: signInError } = await supabase.auth.signInAnonymously();
          if (!mounted) return;

          if (signInError) {
            // If anonymous auth fails, allow offline mode (user = null but not loading)
            console.warn('[useAuth] Anonymous sign-in failed, running in offline mode:', signInError.message);
            setUser(null);
          } else if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              isAnonymous: true,
            });
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.warn('[useAuth] Auth check failed, running in offline mode:', err);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          isAnonymous: session.user.is_anonymous ?? true,
        });
        if (isRecoveryHash()) {
          setIsRecoveryMode(true);
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
        emailRedirectTo: window.location.origin,
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
      setUser({
        id: data.user.id,
        email: data.user.email,
        isAnonymous: true,
      });
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
