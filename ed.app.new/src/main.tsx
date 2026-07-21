import React from 'react';
import ReactDOM from 'react-dom/client';
import { ensureBrowserStorage } from './lib/storage';
import { SkinProvider } from './contexts/SkinContext';
import { AuthProvider } from './hooks/use-auth';
import { SubscriptionProvider } from './hooks/use-subscription';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './index.css';
import './skins/pearl-light.css';
import './skins/pearl-dark.css';
import './skins/midnight.css';
import './skins/sakura.css';
import './skins/ember.css';
import './skins/noir.css';
import { initEnvValidation } from './lib/env';
import { authRedirectReady } from './lib/supabase/client';
import { stripAuthParamsFromUrl, urlHasAuthArtifacts } from './lib/auth/urlCleanup';

// Validate environment variables early (prints clear warnings/errors for missing
// Supabase / API keys and throws on critical misconfiguration). This prevents
// mysterious "Supabase crashes" later and makes the app obviously runnable or not.
initEnvValidation();

ensureBrowserStorage();

// If the user landed with tokens already in the bar, scrub them as soon as the
// session has been read — never leave JWTs in history/referrer/screenshots.
async function boot() {
  try {
    await authRedirectReady;
  } catch (err) {
    console.warn('[boot] auth redirect handling failed:', err);
    if (urlHasAuthArtifacts()) {
      stripAuthParamsFromUrl();
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <SkinProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SkinProvider>
    </React.StrictMode>,
  );
}

void boot();
