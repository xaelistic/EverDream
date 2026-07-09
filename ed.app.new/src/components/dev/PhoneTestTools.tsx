import React, { useState } from 'react';
import { storage } from '../../lib/storage';
import { useAuth } from '../../hooks/use-auth';
import { useSubscription } from '../../hooks/use-subscription';
import type { LocalDream } from '../../lib/storage/indexedDB';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

declare global {
  interface Window {
    storage?: any;
  }
}

/**
 * PhoneTestTools — Dev-only panel for testing native-like features on real devices.
 *
 * Use this when loading the app URL on your phone (or installed PWA).
 *
 * - Tests the real IndexedDB-backed storage layer (the one used by dreams/sleep).
 * - Tests browser Notification API (works in installed PWA on Android; limited on iOS).
 *
 * How to use on phone:
 * 1. On same WiFi: find your PC IP (`ipconfig` in cmd) and open http://192.168.x.x:5173
 * 2. (Better for PWA features) Use ngrok: `npx ngrok http 5173` and open the https URL on phone.
 * 3. Add to Home Screen for standalone "native" feel.
 * 4. Tap the buttons below to exercise storage and notifications.
 *
 * For true native notifications + more device APIs (background, rich actions, secure storage),
 * the fastest path is adding Capacitor (keeps 95% of your web code). Pure Expo Go would require a React Native port. Let me know if you want either.
 *
 * For true native notifications + more device APIs (background, rich actions),
 * we should add Capacitor (or migrate toward Expo). Let me know if you want that next.
 */
const TEST_ACCOUNTS = [
  { label: 'Admin (pro)', email: 'admin@everdream.test', password: 'EverDream!Test2026' },
  { label: 'Free tier', email: 'free@everdream.test', password: 'EverDream!Test2026' },
  { label: 'Plus tier', email: 'plus@everdream.test', password: 'EverDream!Test2026' },
  { label: 'Pro tier', email: 'pro@everdream.test', password: 'EverDream!Test2026' },
] as const;

export default function PhoneTestTools() {
  const { user, signIn, signOut } = useAuth();
  const { tierLabel, isAdmin, refresh: refreshSubscription } = useSubscription();
  const [log, setLog] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  if (!import.meta.env.DEV) return null;

  const addLog = (msg: string) => {
    setLog((prev) => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // === Storage Tests (uses the real unified storage API) ===
  const testSaveDream = async () => {
    try {
      const testDream: Partial<LocalDream> = {
        content: `Test dream from phone at ${new Date().toISOString()}`,
        capture_mode: 'text',
        category: 'test',
        themes: ['phone-test', 'storage'],
        emotion: 'curious',
        visibility: 'private',
      };

      const saved = await storage.dreams.save(testDream);
      addLog(`✅ Saved test dream (local ID: ${saved.id})`);
      addLog(`   Storage layer: IndexedDB (local-first)`);
    } catch (err: any) {
      addLog(`❌ Save failed: ${err.message}`);
    }
  };

  const testLoadDreams = async () => {
    try {
      const dreams = await storage.dreams.getAll();
      const testOnes = dreams.filter((d: any) => d.themes?.includes('phone-test'));
      addLog(`✅ Loaded ${dreams.length} total dreams. ${testOnes.length} phone-test dreams.`);
      if (testOnes.length > 0) {
        addLog(`   Latest: "${testOnes[0].content?.substring(0, 60)}..."`);
      }
    } catch (err: any) {
      addLog(`❌ Load failed: ${err.message}`);
    }
  };

  const testStorageStats = async () => {
    try {
      const stats = await storage.maintenance.stats();
      addLog(`✅ Storage stats: ${JSON.stringify(stats)}`);
    } catch (err: any) {
      addLog(`❌ Stats failed: ${err.message}`);
    }
  };

  const testClearTestData = async () => {
    try {
      const all = await storage.dreams.getAll();
      const toDelete = all.filter((d: any) => d.themes?.includes('phone-test'));
      for (const d of toDelete) {
        await storage.dreams.delete(d.id);
      }
      addLog(`✅ Cleared ${toDelete.length} test dreams`);
    } catch (err: any) {
      addLog(`❌ Clear failed: ${err.message}`);
    }
  };

  // === Notification Tests (web PWA or native via Capacitor) ===
  const testRequestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        addLog(`🔔 [Native] Notification permission: ${result.display}`);
        if (result.display === 'granted') {
          addLog('   Native local notifications enabled. This will work in background on device.');
        }
      } catch (err: any) {
        addLog(`❌ [Native] Permission error: ${err.message}`);
      }
      return;
    }

    // Web / PWA fallback
    if (!('Notification' in window)) {
      addLog('❌ Notifications not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      addLog(`🔔 [Web] Notification permission: ${permission}`);

      if (permission === 'granted') {
        addLog('   Great — you can now receive notifications from this PWA.');
      } else if (permission === 'denied') {
        addLog('   Permission denied. User will need to enable in browser settings.');
      }
    } catch (err: any) {
      addLog(`❌ [Web] Permission request error: ${err.message}`);
    }
  };

  const testShowNotification = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'EverDream (Native)',
              body: `Native test notification from Capacitor at ${new Date().toLocaleTimeString()}. Real device notifications!`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: { test: true },
            },
          ],
        });
        addLog('✅ [Native] Local notification scheduled (check your device notification center / lock screen).');
        addLog('   This uses the native notification system — much closer to production native behavior.');
      } catch (err: any) {
        addLog(`❌ [Native] Schedule failed: ${err.message}`);
      }
      return;
    }

    // Web / PWA fallback
    if (!('Notification' in window)) {
      addLog('❌ Notifications API not available');
      return;
    }

    if (Notification.permission !== 'granted') {
      addLog('⚠️ Request permission first (button above)');
      return;
    }

    try {
      const notif = new Notification('EverDream Test (Phone)', {
        body: `This is a test notification from the PWA at ${new Date().toLocaleTimeString()}. Local storage + notifications are working!`,
        icon: '/icons/icon-192.png',
        tag: 'everdream-phone-test',
      });

      notif.onclick = () => {
        addLog('📱 Notification was clicked!');
        window.focus();
        notif.close();
      };

      addLog('✅ [Web] Notification shown (check your notification tray / lock screen)');
      addLog('   Note: In installed PWA this feels more native. Background delivery is limited vs real native apps.');
    } catch (err: any) {
      addLog(`❌ [Web] Show notification failed: ${err.message}`);
    }
  };

  const testServiceWorkerNotification = async () => {
    if (Capacitor.isNativePlatform()) {
      addLog('ℹ️ In native Capacitor app, use the "Show test notification" button above for LocalNotifications (better than SW fallback).');
      return;
    }

    // Web / PWA fallback
    if (!('serviceWorker' in navigator)) {
      addLog('❌ No service worker — falling back to regular Notification');
      await testShowNotification();  // use await if needed
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;

      if (Notification.permission !== 'granted') {
        addLog('⚠️ Grant notification permission first');
        return;
      }

      // Many Workbox SWs support this
      await reg.showNotification('EverDream (via SW)', {
        body: 'Test notification delivered through the PWA service worker. Better for installed apps.',
        icon: '/icons/icon-192.png',
        tag: 'everdream-sw-test',
      });

      addLog('✅ [Web] Service worker notification requested');
    } catch (err: any) {
      addLog(`❌ [Web] SW notification error (falling back): ${err.message}`);
      await testShowNotification();
    }
  };

  const clearLog = () => setLog([]);

  const loginAs = async (email: string, password: string) => {
    setAuthBusy(true);
    try {
      if (user && !user.isAnonymous) {
        await signOut();
      }
      const { error } = await signIn(email, password);
      if (error) throw error;
      await refreshSubscription();
      addLog(`✅ Signed in as ${email}`);
    } catch (err: any) {
      addLog(`❌ Login failed: ${err?.message || 'unknown error'}`);
      addLog('   Run: npm run seed:admin (with Supabase configured)');
    } finally {
      setAuthBusy(false);
    }
  };

  const forceOnboarding = () => {
    localStorage.setItem('forceOnboarding', '1');
    addLog('✅ Onboarding queued — reload the page');
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        fontSize: 12,
        maxWidth: 'min(92vw, 380px)',
      }}
    >
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: '#1a1a2e',
            color: '#a8eddc',
            border: '1px solid #a8eddc33',
            borderRadius: 999,
            padding: '8px 14px',
            fontSize: 13,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
          }}
        >
          📱 Phone Test Tools (dev)
        </button>
      ) : (
        <div
          style={{
            background: 'rgba(15,15,26,0.98)',
            color: '#ddd',
            border: '1px solid #a8eddc33',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong style={{ color: '#a8eddc' }}>📱 Phone Test Tools (dev only)</strong>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 10, lineHeight: 1.3 }}>
            Open this URL on your phone (same WiFi) → <strong>http://YOUR-PC-IP:5173</strong><br />
            Or use <code>npx ngrok http 5173</code> for HTTPS + easy link. Then "Add to Home Screen".
          </div>

          <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8, lineHeight: 1.35 }}>
            <strong style={{ color: '#a8eddc' }}>Auth:</strong>{' '}
            {user?.email || (user?.isAnonymous ? 'anonymous' : 'offline')}
            {user?.email ? ` · ${tierLabel}${isAdmin ? ' · admin' : ''}` : ''}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {TEST_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                onClick={() => loginAs(acct.email, acct.password)}
                disabled={authBusy}
                style={btnStyle}
              >
                {acct.label}
              </button>
            ))}
            <button onClick={forceOnboarding} style={btnStyle}>Force onboarding</button>
            <button onClick={() => { window.location.hash = '#/admin'; addLog('→ #/admin'); }} style={btnStyle}>Admin dash</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={testSaveDream} style={btnStyle}>Save test dream (IndexedDB)</button>
            <button onClick={testLoadDreams} style={btnStyle}>Load dreams</button>
            <button onClick={testStorageStats} style={btnStyle}>Storage stats</button>
            <button onClick={testClearTestData} style={{ ...btnStyle, background: '#3a2a2a' }}>Clear test data</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={testRequestNotificationPermission} style={btnStyle}>Request notif permission</button>
            <button onClick={testShowNotification} style={btnStyle}>Show test notification</button>
            <button onClick={testServiceWorkerNotification} style={btnStyle}>Show via Service Worker</button>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 11 }}>Log</strong>
              <button onClick={clearLog} style={{ fontSize: 10, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>clear</button>
            </div>
            <div
              style={{
                background: '#0a0a12',
                borderRadius: 6,
                padding: '6px 8px',
                fontFamily: 'monospace',
                fontSize: 11,
                maxHeight: 120,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {log.length === 0 ? <span style={{ opacity: 0.5 }}>Tap buttons above to test…</span> : log.join('\n')}
            </div>
          </div>

          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 6 }}>
            Local storage uses real IndexedDB layer. Notifications use browser API (PWA feels more native when installed).
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#1f2a3a',
  color: '#a8eddc',
  border: '1px solid #a8eddc33',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
