import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Link2, Loader2, Smartphone, CheckCircle2 } from 'lucide-react';
import type { WearableConfig, WearableProvider } from '../../lib/wearables';
import { getOAuthUrl } from '../../lib/wearables';
import { WEARABLE_CONNECT_GUIDES } from '../../lib/wearableConnectGuides';

interface WearableConnectModalProps {
  provider: WearableProvider | null;
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  redirectUri: string;
  onConnected: (config: WearableConfig) => void;
  onSync?: (provider: WearableProvider) => void;
  isConnected?: boolean;
  oauthError?: string | null;
}

const GOOGLE_FIT_SETUP_URL = 'https://fit.google.com/';
const GOOGLE_HEALTH_CONNECT_URL = 'https://health.google/health-connect-android';

export function WearableConnectModal({
  provider,
  isOpen,
  onClose,
  clientId,
  redirectUri,
  onConnected,
  onSync,
  isConnected = false,
  oauthError = null,
}: WearableConnectModalProps) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setToken('');
    setError(null);
  }, [provider]);

  if (!isOpen || !provider) return null;

  const guide = WEARABLE_CONNECT_GUIDES[provider];
  const supportsOAuth = guide.authType === 'oauth' && provider !== 'apple_health';
  const canRedirectOAuth = supportsOAuth && Boolean(clientId);
  const showGoogleSetup = provider === 'google_fit' && !clientId;
  const showToken =
    guide.authType === 'oauth' ||
    guide.authType === 'server_side' ||
    provider === 'oura';
  const displayError = error || oauthError;

  const finishConnect = (accessToken: string) => {
    if (!accessToken.trim()) {
      setError('Enter a valid access token or complete sign-in first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onConnected({
        provider,
        enabled: true,
        auth: { provider, accessToken: accessToken.trim() },
      });
      setToken('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const startOAuthRedirect = () => {
    const state = `wearable_${provider}-${Date.now()}`;
    sessionStorage.setItem('wearable_oauth_state', state);
    sessionStorage.setItem('wearable_oauth_provider', provider);

    const url = getOAuthUrl(provider, clientId, redirectUri, state);
    if (!url) {
      setError('OAuth URL could not be built for this provider.');
      return;
    }

    setError(null);
    window.location.href = url;
  };

  const handleOAuth = () => {
    if (provider === 'google_fit' && !clientId) {
      openGoogleHealthSetup();
      return;
    }

    if (!clientId) {
      setError('Sign-in is not configured yet. Follow the steps above and use a personal access token, or ask your admin to enable OAuth.');
      return;
    }

    startOAuthRedirect();
  };

  const openGoogleHealthSetup = () => {
    setError(null);
    window.open(GOOGLE_FIT_SETUP_URL, '_blank', 'noopener,noreferrer');
    window.open(GOOGLE_HEALTH_CONNECT_URL, '_blank', 'noopener,noreferrer');
  };

  const handleGarminLink = () => {
    window.open('https://connect.garmin.com/signin', '_blank', 'noopener,noreferrer');
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close connect dialog"
      />

      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-line bg-cream shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wearable-connect-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-line bg-cream/95 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
              {isConnected ? 'Device connected' : 'Connect device'}
            </p>
            <h2 id="wearable-connect-title" className="font-serif text-xl text-ink">
              {guide.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-parchment text-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted leading-relaxed">{guide.summary}</p>

          {isConnected ? (
            <div className="rounded-2xl border border-sage/30 bg-sage/5 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-sage shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink">Already connected</p>
                <p className="text-xs text-muted mt-1">
                  Use Sync on the device card to pull the latest sleep nights from {guide.name}.
                </p>
                {onSync && (
                  <button
                    type="button"
                    onClick={() => {
                      onSync(provider);
                      onClose();
                    }}
                    className="mt-3 rounded-xl bg-sage hover:bg-sageDark text-cream px-4 py-2 text-sm font-semibold transition"
                  >
                    Sync now
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {guide.steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-line bg-parchment/70 overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="w-8 h-8 rounded-full bg-sage/15 text-sageDark flex items-center justify-center text-sm font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{step.title}</p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                    <div className="mx-3 mb-3 rounded-xl border border-line bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-6 text-center">
                      <div className="mx-auto w-40 h-28 rounded-lg border-2 border-white/10 bg-slate-950/80 flex items-center justify-center shadow-inner">
                        <div className="text-center px-2">
                          <Smartphone className="w-6 h-6 text-sage/80 mx-auto mb-2" strokeWidth={1.5} />
                          <p className="text-[10px] text-cream/90 font-medium leading-snug">{step.visual}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-cream/50 mt-2 uppercase tracking-wider">Step {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>

              {guide.authType === 'native' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Apple Health can only be linked from the EverDream iOS app. Use Google Fit or Oura on the web for now.
                </div>
              )}

              {guide.authType === 'placeholder' && (
                <div className="rounded-2xl border border-line bg-parchment p-4 text-sm text-muted">
                  This integration is not available yet. Try Oura, Google Fit, or Fitbit instead.
                </div>
              )}

              {supportsOAuth && (
                <button
                  type="button"
                  onClick={handleOAuth}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-sage hover:bg-sageDark text-cream py-3.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  {showGoogleSetup
                    ? 'Open Google Fit & Health Connect'
                    : guide.oauthLabel || 'Connect account'}
                </button>
              )}

              {canRedirectOAuth && provider === 'google_fit' && (
                <p className="text-xs text-muted text-center leading-relaxed">
                  You will sign in with Google and approve sleep data access, then return here automatically.
                </p>
              )}

              {showGoogleSetup && (
                <p className="text-xs text-muted text-center leading-relaxed">
                  Confirm sleep tracking is enabled in Google Fit, then paste a token below if you have one.
                </p>
              )}

              {provider === 'garmin_connect' && (
                <button
                  type="button"
                  onClick={handleGarminLink}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-line bg-parchment hover:bg-cream py-3 text-sm font-semibold text-ink transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Sign in on Garmin Connect
                </button>
              )}

              {showToken && guide.authType !== 'placeholder' && guide.authType !== 'native' && (
                <div className="rounded-2xl border border-line bg-cream p-4 space-y-3">
                  <label className="text-xs uppercase tracking-wider text-muted font-medium">
                    {guide.tokenLabel || 'Access token'}
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={guide.tokenPlaceholder || 'Paste access token'}
                    className="w-full rounded-xl border border-line bg-parchment px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-sage/30"
                  />
                  <button
                    type="button"
                    onClick={() => finishConnect(token)}
                    disabled={busy || !token.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink hover:bg-ink/90 text-cream py-2.5 text-sm font-semibold transition disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Connect with token
                  </button>
                  {guide.tokenHelpUrl && (
                    <a
                      href={guide.tokenHelpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sageDark hover:underline inline-flex items-center gap-1"
                    >
                      How to get a token <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {displayError && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {displayError}
            </p>
          )}

          {guide.helpUrl && (
            <a
              href={guide.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-muted hover:text-sageDark transition"
            >
              Official setup guide →
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}