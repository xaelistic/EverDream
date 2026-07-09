import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../ui';
import { Card } from '../ui/Card';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasUpper || !hasLower || !hasNum || !hasSpecial) {
      setError('Use uppercase, lowercase, a number, and a special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(updateError.message || 'Could not update password.');
        return;
      }
      setDone(true);
      window.location.hash = '#/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, oklch(0.98 0.01 85) 0%, oklch(0.95 0.02 280) 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Card padding="lg">
          {done ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={40} color="oklch(0.55 0.12 155)" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Password updated</h2>
              <p style={{ fontSize: '0.85rem', color: 'oklch(0.45 0.02 270 / 0.8)' }}>
                You can now sign in with your new password.
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.35rem' }}>Set a new password</h2>
              <p style={{ fontSize: '0.8rem', color: 'oklch(0.45 0.02 270 / 0.75)', marginBottom: '1.25rem' }}>
                Choose a strong password for your EverDream account.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>New password</label>
                  <div style={inputRowStyle}>
                    <Lock size={16} color="oklch(0.45 0.02 270 / 0.5)" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Confirm password</label>
                  <div style={inputRowStyle}>
                    <Lock size={16} color="oklch(0.45 0.02 270 / 0.5)" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.6rem', background: 'oklch(0.97 0.03 30)', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                    <AlertCircle size={14} color="oklch(0.55 0.15 30)" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={<Sparkles size={15} />}>
                  Update password
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

const inputRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  height: '42px',
  padding: '0 0.75rem',
  borderRadius: '0.6rem',
  background: 'oklch(0.97 0.01 85)',
  border: '1px solid transparent',
};

const inputStyle = {
  flex: 1,
  border: 'none',
  background: 'none',
  outline: 'none',
  fontSize: '0.85rem',
  color: 'oklch(0.25 0.04 270)',
};