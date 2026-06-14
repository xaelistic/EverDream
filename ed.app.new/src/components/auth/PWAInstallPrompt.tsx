import React, { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '../ui';
import { Card } from '../ui/Card';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAInstallPrompt — shows a banner when the browser supports
 * "Add to Home Screen" installation.
 *
 * Listens for the `beforeinstallprompt` event and shows a
 * dismissable banner with an install button.
 *
 * @example
 * <PWAInstallPrompt />
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9000,
      padding: '12px 16px',
      background: 'rgba(15,15,26,0.95)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(168,237,220,0.15)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
            Install Lucid
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9b96b0' }}>
            Add to your home screen for the best experience
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={handleInstall} icon={<Download size={14} />}>
          Install
        </Button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9b96b0', padding: '4px',
          }}
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
