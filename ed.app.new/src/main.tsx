import React from 'react';
import ReactDOM from 'react-dom/client';
import { ensureBrowserStorage } from './lib/storage';
import { SkinProvider } from './contexts/SkinContext';
import { AuthProvider } from './hooks/use-auth';
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

// Validate environment variables early (prints clear warnings/errors for missing
// Supabase / API keys and throws on critical misconfiguration). This prevents
// mysterious "Supabase crashes" later and makes the app obviously runnable or not.
initEnvValidation();

ensureBrowserStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SkinProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </SkinProvider>
  </React.StrictMode>,
);
