import React from 'react';
import ReactDOM from 'react-dom/client';
import { ensureBrowserStorage } from './lib/storage';
import { SkinProvider } from './contexts/SkinContext';
import { AuthProvider } from './hooks/use-auth';
import App from './App';
import './index.css';
import './skins/pearl-light.css';

ensureBrowserStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SkinProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SkinProvider>
  </React.StrictMode>,
);
