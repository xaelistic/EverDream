import React, { useState } from 'react';
import { Moon, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Button, Input, Card } from '../ui';

/**
 * LoginScreen — Sleep Whispers / Lucid design
 * Full-height centered card on calming gradient background
 * Supports OAuth (Google, Facebook, Instagram, TikTok), email/password
 * Toggles between signin/signup modes with smooth transitions
 */
export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
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

  const handleOAuth = async (provider: string) => {
    if (provider === 'tiktok') {
      setError('TikTok login coming soon!');
      return;
    }
    setOauthLoading(provider);
    try {
      const supabaseProvider = provider === 'google' ? 'google' : 'facebook';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Supabase will redirect
    } catch (e: any) {
      setError(e.message || 'OAuth sign-in failed');
      setOauthLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, oklch(0.97 0.025 290) 0%, oklch(0.985 0.015 80) 60%, oklch(0.96 0.04 50) 100%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
      }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: 'oklch(0.95 0.015 280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: 'var(--shadow-soft, 0 20px 60px -30px oklch(0.4 0.08 275 / 0.25))',
          }}>
            <Moon size={24} strokeWidth={1.5} color="oklch(0.45 0.09 275)" />
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, ui-serif, serif",
            fontSize: '1.875rem',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            color: 'oklch(0.25 0.04 270)',
            margin: '2rem 0 0.5rem',
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: 'oklch(0.45 0.02 270 / 0.7)',
            margin: 0,
          }}>
            Track, reflect on, and share your dreams
          </p>
        </div>

        {/* Auth Card */}
        <Card style={{
          padding: '2rem',
          borderRadius: '1.5rem',
          background: 'oklch(1 0 0)',
          border: '1px solid oklch(0.9 0.02 280)',
          boxShadow: 'var(--shadow-soft, 0 20px 60px -30px oklch(0.4 0.08 275 / 0.25), 0 4px 12px -8px oklch(0.4 0.08 275 / 0.1))',
        }}>
          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                height: '44px',
                borderRadius: '0.75rem',
                border: '1px solid oklch(0.9 0.02 280)',
                background: oauthLoading === 'google' ? 'oklch(0.95 0.015 80)' : 'oklch(0.985 0.008 85)',
                cursor: oauthLoading !== null ? 'not-allowed' : 'pointer',
                transition: 'all 180ms ease-out',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'oklch(0.25 0.04 270)',
              }}
              onMouseEnter={(e) => {
                if (oauthLoading === null) e.currentTarget.style.background = 'oklch(0.95 0.015 80)';
              }}
              onMouseLeave={(e) => {
                if (oauthLoading === null) e.currentTarget.style.background = 'oklch(0.985 0.008 85)';
              }}
            >
              {oauthLoading === 'google' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuth('meta')}
              disabled={oauthLoading !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                height: '44px',
                borderRadius: '0.75rem',
                border: '1px solid oklch(0.9 0.02 280)',
                background: oauthLoading === 'meta' ? 'oklch(0.95 0.015 80)' : 'oklch(0.985 0.008 85)',
                cursor: oauthLoading !== null ? 'not-allowed' : 'pointer',
                transition: 'all 180ms ease-out',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'oklch(0.25 0.04 270)',
              }}
              onMouseEnter={(e) => {
                if (oauthLoading === null) e.currentTarget.style.background = 'oklch(0.95 0.015 80)';
              }}
              onMouseLeave={(e) => {
                if (oauthLoading === null) e.currentTarget.style.background = 'oklch(0.985 0.008 85)';
              }}
            >
              {oauthLoading === 'meta' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continue with Facebook</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleOAuth('tiktok')}
              disabled={true}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '44px',
                borderRadius: '0.75rem',
                border: '1px solid oklch(0.9 0.02 280)',
                background: 'oklch(0.95 0.015 80)',
                cursor: 'not-allowed',
                opacity: 0.6,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'oklch(0.25 0.04 270)',
                paddingRight: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.9 6.24-1.72 1.39-4.02 1.94-6.18 1.48-2.92-.58-5.31-2.9-5.98-5.79-.17-.72-.23-1.47-.18-2.2.05-.73.22-1.45.5-2.13.67-1.66 1.97-3.02 3.6-3.79.57-.27 1.17-.47 1.79-.59V5.46c-.87.15-1.71.5-2.44 1.02-1.27.91-2.11 2.33-2.31 3.88-.04.3-.06.6-.06.91 0 3.31 2.69 6 6 6 .56 0 1.1-.08 1.62-.23.51-.15.99-.37 1.43-.65V.02z"/>
                </svg>
                Continue with TikTok
              </div>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'oklch(0.45 0.02 270 / 0.6)',
                background: 'oklch(0.9 0.02 280)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                Soon
              </span>
            </button>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.25rem 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'oklch(0.9 0.02 280)' }} />
            <span style={{
              fontSize: '0.75rem',
              color: 'oklch(0.45 0.02 270 / 0.6)',
              fontWeight: 500,
            }}>
              or
            </span>
            <div style={{ flex: 1, height: '1px', background: 'oklch(0.9 0.02 280)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'oklch(0.25 0.04 270)',
                marginBottom: '0.5rem',
                display: 'block',
              }}>
                Email
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                height: '44px',
                padding: '0 1rem',
                borderRadius: '0.75rem',
                background: 'oklch(0.97 0.01 85)',
                border: '1px solid transparent',
                transition: 'border-color 180ms ease-out',
              }}>
                <Mail size={18} color="oklch(0.45 0.02 270 / 0.5)" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    color: 'oklch(0.25 0.04 270)',
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}>
                <label style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'oklch(0.25 0.04 270)',
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setError('Password reset coming soon!')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.75rem',
                    color: 'oklch(0.45 0.02 270 / 0.7)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationColor: 'transparent',
                    transition: 'text-decoration-color 180ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'oklch(0.45 0.09 275)'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                >
                  Forgot?
                </button>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                height: '44px',
                padding: '0 1rem',
                borderRadius: '0.75rem',
                background: 'oklch(0.97 0.01 85)',
                border: '1px solid transparent',
                transition: 'border-color 180ms ease-out',
              }}>
                <Lock size={18} color="oklch(0.45 0.02 270 / 0.5)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    color: 'oklch(0.25 0.04 270)',
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} color="oklch(0.45 0.02 270 / 0.5)" /> : <Eye size={16} color="oklch(0.45 0.02 270 / 0.5)" />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'oklch(0.97 0.03 30)',
                border: '1px solid oklch(0.85 0.05 30)',
                borderRadius: '0.75rem',
              }}>
                <AlertCircle size={16} color="oklch(0.55 0.15 30)" />
                <span style={{ fontSize: '0.75rem', color: 'oklch(0.45 0.1 30)' }}>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<Sparkles size={16} />}
              style={{ marginTop: '0.5rem' }}
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'oklch(0.45 0.02 270 / 0.7)' }}>
              {isSignUp ? 'Already have an account?' : "New here?"}
            </span>
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'oklch(0.45 0.09 275)',
                marginLeft: '0.25rem',
                textDecoration: 'underline',
                textDecorationColor: 'transparent',
                transition: 'text-decoration-color 180ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'oklch(0.45 0.09 275)'}
              onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
            >
              {isSignUp ? 'Sign In' : 'Create an account'} →
            </button>
          </div>
        </Card>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          color: 'oklch(0.45 0.02 270 / 0.5)',
        }}>
          <button
            onClick={() => setError('Terms of Service modal coming soon!')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              transition: 'text-decoration-color 180ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'oklch(0.45 0.02 270 / 0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            onClick={() => setError('Privacy Policy modal coming soon!')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              textDecoration: 'underline',
              textDecorationColor: 'transparent',
              transition: 'text-decoration-color 180ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'oklch(0.45 0.02 270 / 0.7)'}
            onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
}
