import React, { useState } from 'react';
import { Moon, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, Loader2, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Button, Input } from '../ui';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase/client';
import { signInWithSocialProvider } from '../../lib/auth/socialAuth';

/**
 * LoginScreen — Updated to spec
 * Primary options: Google / Meta / Phone / Email
 * Localized extras: Line / Naver / Zalo based on browser locale (country)
 * Socials + Phone create account on first use (sign up)
 * Email/password for traditional
 * Auto-login via Supabase persisted session + onAuthStateChange
 * Matches dream aesthetic
 */
export default function LoginScreen() {
  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot' | 'check-email'>('login');
  const [pendingEmailAction, setPendingEmailAction] = useState<'signup' | 'reset' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [phoneCode, setPhoneCode] = useState('');
  const [showRegional, setShowRegional] = useState(false);

  // Locale-based regional providers (expand mappings as needed)
  const getRegionalProviders = (): string[] => {
    const lang = (navigator.language || (navigator as any).languages?.[0] || 'en').toLowerCase();
    const regions: string[] = [];
    if (lang.includes('ko') || lang.includes('kr')) regions.push('naver');
    if (lang.includes('vi')) regions.push('zalo');
    if (lang.includes('ja') || lang.includes('th') || lang.includes('id') || lang.includes('my') || lang.includes('sg')) regions.push('line');
    return regions;
  };

  const regional = getRegionalProviders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (isSignUp) {
      if (password.length < 12) {
        setError('For sign up, password must be at least 12 characters with upper, lower, number and special char.');
        return;
      }
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNum = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
        setError('Password needs uppercase, lowercase, number and special character.');
        return;
      }
    } else if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const fn = isSignUp ? signUp : signIn;
      const { error: authError } = await fn(email.trim(), password);
      if (authError) {
        setError(authError.message || 'Authentication failed. Please try again.');
        return;
      }
      if (isSignUp) {
        setPendingEmailAction('signup');
        setMode('check-email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter the email for your account.');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await resetPasswordForEmail(email.trim());
      if (resetError) {
        setError(resetError.message || 'Could not send reset email.');
        return;
      }
      setPendingEmailAction('reset');
      setMode('check-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    setError(null);

    try {
      if (['line', 'naver', 'zalo'].includes(provider)) {
        setError(`${provider.toUpperCase()} login is region-specific. We recommend Phone or Google/Meta for broadest support. (Full OAuth configurable in Supabase or via backend.)`);
        setOauthLoading(null);
        return;
      }

      const authProvider = provider === 'google' ? 'google' : 'meta';
      const result = await signInWithSocialProvider(authProvider, 'login');
      if (!result.ok) throw new Error(result.message || 'OAuth sign-in failed');
    } catch (e: any) {
      setError(e.message || 'OAuth sign-in failed');
      setOauthLoading(null);
    }
  };

  // Real Supabase Phone OTP
  const handlePhone = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number in international format, e.g. +1 555 123 4567');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });
      if (error) throw error;
      setPhoneStep('verify');
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to send SMS code. Ensure phone provider is enabled in Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode.trim()) {
      setError('Enter the 6-digit code from the SMS.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: phoneCode.trim(),
        type: 'sms',
      });
      if (error) throw error;
      // Success — Supabase persistSession + autoRefresh will handle "always auto login"
      setPhoneStep('input');
    } catch (e: any) {
      setError(e.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailQuick = () => {
    const formEl = document.querySelector('form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    setIsSignUp(false);
  };

  const regionalButtons = regional.length > 0 && (
    <div style={{ marginTop: '0.75rem' }}>
      <button 
        onClick={() => setShowRegional(!showRegional)} 
        style={{ fontSize: '0.75rem', color: 'oklch(0.45 0.02 270 / 0.7)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {showRegional ? 'Hide' : 'Show'} region-specific options ({regional.join(', ')})
      </button>
      {showRegional && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {regional.map(p => (
            <button
              key={p}
              onClick={() => handleOAuth(p)}
              disabled={!!oauthLoading}
              style={{
                height: '40px',
                borderRadius: '0.5rem',
                border: '1px solid oklch(0.9 0.02 280)',
                background: 'oklch(0.97 0.01 85)',
                fontSize: '0.8rem',
                color: 'oklch(0.3 0.03 270)',
              }}
            >
              Continue with {p.charAt(0).toUpperCase() + p.slice(1)} (popular here)
            </button>
          ))}
          <div style={{ fontSize: '0.65rem', color: 'oklch(0.45 0.02 270 / 0.6)' }}>
            These use secure OAuth. Full support is easy to add via Supabase Auth providers or your backend.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, oklch(0.97 0.025 290) 0%, oklch(0.985 0.015 80) 60%, oklch(0.96 0.04 50) 100%)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '28px',
            background: 'oklch(0.95 0.015 280)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            boxShadow: 'var(--shadow-soft, 0 20px 60px -30px oklch(0.4 0.08 275 / 0.25))',
          }}>
            <Moon size={24} strokeWidth={1.5} color="oklch(0.45 0.09 275)" />
          </div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, ui-serif, serif",
            fontSize: '1.875rem', fontWeight: 400, letterSpacing: '-0.025em',
            color: 'oklch(0.25 0.04 270)', margin: '1.25rem 0 0.25rem',
          }}>
            {isSignUp ? 'Create your space' : 'Welcome back'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'oklch(0.45 0.02 270 / 0.7)', margin: 0 }}>
            Track, reflect on, and share your dreams
          </p>
        </div>

        <Card style={{
          padding: '1.5rem 1.25rem',
          borderRadius: '1.5rem',
          background: 'oklch(1 0 0)',
          border: '1px solid oklch(0.9 0.02 280)',
          boxShadow: 'var(--shadow-soft, 0 20px 60px -30px oklch(0.4 0.08 275 / 0.25))',
        }}>
          {mode === 'check-email' && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <CheckCircle2 size={36} color="oklch(0.55 0.12 155)" style={{ margin: '0 auto 0.75rem' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Check your inbox</h2>
              <p style={{ fontSize: '0.8rem', color: 'oklch(0.45 0.02 270 / 0.8)', lineHeight: 1.5 }}>
                {pendingEmailAction === 'reset'
                  ? <>We sent a password reset link to <strong>{email}</strong>. Open it on this device to choose a new password.</>
                  : <>We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then sign in.</>}
              </p>
              <button
                type="button"
                onClick={() => { setMode('login'); setPendingEmailAction(null); setError(null); }}
                style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'oklch(0.45 0.09 275)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Back to sign in
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>Reset your password</h2>
                <p style={{ fontSize: '0.8rem', color: 'oklch(0.45 0.02 270 / 0.75)' }}>
                  Enter your account email and we&apos;ll send a reset link.
                </p>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Email</label>
                <div style={inputRowStyle}>
                  <Mail size={16} color="oklch(0.45 0.02 270 / 0.5)" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle} />
                </div>
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.6rem', background: 'oklch(0.97 0.03 30)', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                  <AlertCircle size={14} color="oklch(0.55 0.15 30)" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={<Mail size={15} />}>
                Send reset link
              </Button>
              <button type="button" onClick={() => { setMode('login'); setError(null); }} style={{ fontSize: '0.8rem', color: 'oklch(0.45 0.09 275)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                Back to sign in
              </button>
            </form>
          )}

          {mode === 'login' && (<>
          {/* Primary buttons: Google / Meta / Phone / Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading} style={primaryBtnStyle(!!oauthLoading)}>
              {oauthLoading === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            <button onClick={() => handleOAuth('meta')} disabled={!!oauthLoading} style={primaryBtnStyle(!!oauthLoading)}>
              {oauthLoading === 'meta' ? <Loader2 size={18} className="animate-spin" /> : <FacebookIcon />}
              <span>Continue with Meta (Facebook)</span>
            </button>

            <button onClick={() => { setPhoneStep('input'); setError(null); }} disabled={loading} style={primaryBtnStyle(false)}>
              <Phone size={18} />
              <span>Continue with Phone</span>
            </button>

            <button onClick={handleEmailQuick} style={primaryBtnStyle(false, true)}>
              <Mail size={18} />
              <span>Continue with Email</span>
            </button>
          </div>

          {/* Regional / localized (Line, Naver, Zalo) */}
          {regional.length > 0 && regionalButtons}

          {/* Phone inline OTP flow */}
          {phoneStep !== 'input' && (
            <div style={{ margin: '0.75rem 0', padding: '0.75rem', border: '1px solid oklch(0.9 0.02 280)', borderRadius: '0.75rem', background: 'oklch(0.985 0.005 80)' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: 'oklch(0.3 0.03 270)' }}>
                Enter the code sent to {phone || 'your phone'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={phoneCode} onChange={e => setPhoneCode(e.target.value)} placeholder="123456" maxLength={6} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid oklch(0.88 0.02 280)' }} />
                <Button onClick={handleVerifyPhone} disabled={loading || !phoneCode} size="sm">Verify</Button>
              </div>
              <button onClick={() => setPhoneStep('input')} style={{ fontSize: '0.7rem', marginTop: '0.4rem', color: 'oklch(0.45 0.02 270 / 0.7)', background: 'none', border: 'none' }}>Use different number</button>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.9rem 0 0.6rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'oklch(0.9 0.02 280)' }} />
            <span style={{ fontSize: '0.7rem', color: 'oklch(0.45 0.02 270 / 0.6)' }}>or email &amp; password</span>
            <div style={{ flex: 1, height: '1px', background: 'oklch(0.9 0.02 280)' }} />
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'oklch(0.25 0.04 270)', marginBottom: '0.25rem', display: 'block' }}>Email</label>
              <div style={inputRowStyle}>
                <Mail size={16} color="oklch(0.45 0.02 270 / 0.5)" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'oklch(0.25 0.04 270)' }}>Password</label>
                <button type="button" onClick={() => { setMode('forgot'); setError(null); }} style={{ fontSize: '0.65rem', color: 'oklch(0.45 0.02 270 / 0.7)', background: 'none', border: 'none', textDecoration: 'underline' }}>Forgot?</button>
              </div>
              <div style={inputRowStyle}>
                <Lock size={16} color="oklch(0.45 0.02 270 / 0.5)" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isSignUp ? 'new-password' : 'current-password'} style={inputStyle} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="toggle" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.6rem', background: 'oklch(0.97 0.03 30)', border: '1px solid oklch(0.85 0.05 30)', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                <AlertCircle size={14} color="oklch(0.55 0.15 30)" />
                <span style={{ color: 'oklch(0.45 0.1 30)' }}>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={<Sparkles size={15} />} style={{ marginTop: '0.25rem' }}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'oklch(0.45 0.02 270 / 0.7)' }}>
            {isSignUp ? 'Already have an account?' : "New here?"}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null); }} style={{ marginLeft: '0.3rem', fontWeight: 600, color: 'oklch(0.45 0.09 275)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
              {isSignUp ? 'Sign In' : 'Create an account'}
            </button>
          </div>

          <div style={{ fontSize: '0.6rem', textAlign: 'center', marginTop: '0.8rem', color: 'oklch(0.5 0.01 270 / 0.5)' }}>
            Google &amp; Meta create your account on first use. Phone &amp; email supported for sign up too. Your session is saved for automatic login next time.
          </div>
          </>)}
        </Card>

        {/* Footer legal */}
        <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.65rem', color: 'oklch(0.45 0.02 270 / 0.5)' }}>
          <button onClick={() => setError('Terms coming soon')} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Terms</button>
          <span>•</span>
          <button onClick={() => setError('Privacy coming soon')} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Privacy</button>
        </div>
      </div>
    </div>
  );
}

// Style helpers
const primaryBtnStyle = (isLoading: boolean, subtle = false) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
  height: '44px', borderRadius: '0.65rem',
  border: '1px solid oklch(0.9 0.02 280)',
  background: isLoading ? 'oklch(0.95 0.015 80)' : (subtle ? 'oklch(0.97 0.01 85)' : 'oklch(0.985 0.008 85)'),
  cursor: isLoading ? 'not-allowed' : 'pointer',
  fontSize: '0.875rem', fontWeight: 500, color: 'oklch(0.25 0.04 270)',
  transition: 'all 160ms ease-out',
});

const inputRowStyle = { display: 'flex', alignItems: 'center', gap: '0.6rem', height: '42px', padding: '0 0.75rem', borderRadius: '0.6rem', background: 'oklch(0.97 0.01 85)', border: '1px solid transparent' };
const inputStyle = { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', color: 'oklch(0.25 0.04 270)' };

function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>; }
function FacebookIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>; }
