import React from 'react';

export interface PrivacyToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  note?: string;
}

/**
 * PrivacyToggle — A toggle switch for privacy settings.
 *
 * @example
 * <PrivacyToggle
 *   label="AI Dream Analysis"
 *   description="Allow Claude AI to analyze dream content"
 *   value={settings.aiAnalysis}
 *   onChange={(v) => setSettings({...settings, aiAnalysis: v})}
 *   required
 *   note="Required for core functionality"
 * />
 */
export function PrivacyToggle({ label, description, value, onChange, required, note }: PrivacyToggleProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '4px 0',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#4a4860',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          {label}
          {required && (
            <span style={{
              fontSize: '0.6rem',
              background: 'rgba(94,196,168,0.15)',
              color: '#5ec4a8',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
            }}>
              REQUIRED
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9b96b0', marginTop: '2px', lineHeight: 1.4 }}>
          {description}
        </div>
        {note && (
          <div style={{ fontSize: '0.65rem', color: '#c49a42', marginTop: '4px', fontStyle: 'italic' }}>
            {note}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !required && onChange(!value)}
        disabled={required}
        style={{
          width: '48px',
          height: '28px',
          borderRadius: '14px',
          border: 'none',
          background: value ? '#5ec4a8' : 'rgba(155,150,176,0.3)',
          cursor: required ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 180ms ease-out',
          flexShrink: 0,
          opacity: required ? 0.7 : 1,
        }}
      >
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: '3px',
          left: value ? '23px' : '3px',
          transition: 'left 180ms ease-out',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  );
}
