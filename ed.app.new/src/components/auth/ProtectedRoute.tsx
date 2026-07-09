import React from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Spinner } from '../ui';
import LoginScreen from './LoginScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — redirects to login if not authenticated.
 * Shows a loading spinner while checking auth state.
 *
 * @example
 * <ProtectedRoute>
 *   <DreamJournalApp />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isRecoveryMode } = useAuth();
  const requireAuth = import.meta.env.VITE_REQUIRE_AUTH === 'true';

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      }}>
        <Spinner size={40} color="#5ec4a8" />
      </div>
    );
  }

  if (isRecoveryMode) {
    return <ResetPasswordScreen />;
  }

  if (requireAuth && (!user || user.isAnonymous)) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
