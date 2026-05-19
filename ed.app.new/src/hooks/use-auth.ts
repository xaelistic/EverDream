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

import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase/client';

export interface AuthUser {
  id: string;
  email?: string;
  isAnonymous: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Hook to manage authentication state.
 * Automatically signs in anonymously on first visit if no session exists.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        } else {
          // No session — sign in anonymously
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

      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          isAnonymous: session.user.is_anonymous ?? true,
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (signInError) {
      setError(signInError);
      throw signInError;
    }
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

  return { user, loading, error, signIn, signInAnonymously, signOut };
}
