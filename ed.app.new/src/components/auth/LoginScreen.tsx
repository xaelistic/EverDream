import React, { useState } from 'react';
import { Moon, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Button, Input, Card, Spinner } from '../ui';

/**
 * LoginScreen — clean login/signup UI with email/password.
 * Supports toggling between sign-in and sign-up modes.
 * Shows loading spinner during auth operations.
 *
 * @example
 * <LoginScreen />
 */
export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const fn = isSignUp ? signUp : signIn;
      const { error: authError } = await fn(email.trim(), password);
      if (authError) {
        setError(authError.message || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '24px',
    }}>
      <Card style={{ width: '100%', maxWidth: '420px', padding: '40px 32px' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #5ec4a8, #4a9e86)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(94,196,168,0.3)',
          }}>
            <Moon size={32} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.8rem',
            color: '#1a1a2e',
            margin: '0 0 4px',
          }}>
            Lucid
          </h1>
          <p style={{ color: '#9b96b0', fontSize: '0.8rem', margin: 0 }}>
            {isSignUp ? 'Create your dream journal' : 'Welcome back, dreamer'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(232,143,160,0.1)',
            border: '1px solid rgba(232,143,160,0.3)',
            borderRadius: '12px',
            marginBottom: '20px',
          }}>
            <AlertCircle size={16} color="#e88fa0" />
            <span style={{ fontSize: '0.8rem', color: '#e88fa0' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              fontSize: '0.7rem', fontWeight: 600, color: '#4a4860',
              textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px',
            }}>
              Email
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-cream, #fffefb)',
              border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
              borderRadius: '12px', padding: '10px 16px',
            }}>
              <Mail size={18} color="#9b96b0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  border: 'none', background: 'none', outline: 'none', flex: 1,
                  fontSize: '0.875rem', color: '#4a4860',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              fontSize: '0.7rem', fontWeight: 600, color: '#4a4860',
              textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px',
            }}>
              Password
            </label>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-cream, #fffefb)',
              border: '1px solid var(--glass-border, rgba(168,237,220,0.22))',
              borderRadius: '12px', padding: '10px 16px',
            }}>
              <Lock size={18} color="#9b96b0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                style={{
                  border: 'none', background: 'none', outline: 'none', flex: 1,
                  fontSize: '0.875rem', color: '#4a4860',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} color="#9b96b0" /> : <Eye size={16} color="#9b96b0" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: '8px' }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span style={{ fontSize: '0.8rem', color: '#9b96b0' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, color: '#5ec4a8',
              marginLeft: '4px',
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </Card>
    </div>
  );
}
