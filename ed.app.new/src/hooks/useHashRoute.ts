import { useCallback, useEffect, useState } from 'react';

export type RouteScreen =
  | 'home'
  | 'reflection'
  | 'journal'
  | 'tracker'
  | 'record'
  | 'capture'
  | 'dream'
  | 'insights'
  | 'dashboard'
  | 'wearables'
  | 'privacy'
  | 'achievements'
  | 'assets'
  | 'more'
  | 'import-photos'
  | 'admin'
  | 'settings'
  | 'video-journal'
  | 'profile';

export type AppRoute = {
  screen: RouteScreen;
  dreamId: string | null;
  profileHandle: string | null;
};

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return { screen: 'home', dreamId: null, profileHandle: null };

  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'dream' && parts[1]) {
    return { screen: 'dream', dreamId: decodeURIComponent(parts[1]), profileHandle: null };
  }
  if (parts[0] === 'profile' && parts[1]) {
    return { screen: 'profile', dreamId: null, profileHandle: decodeURIComponent(parts[1]) };
  }

  const screen = parts[0] as RouteScreen;
  const allowed: RouteScreen[] = [
    'home',
    'reflection',
    'journal',
    'tracker',
    'record',
    'capture',
    'insights',
    'dashboard',
    'wearables',
    'privacy',
    'achievements',
    'assets',
    'more',
    'import-photos',
    'admin',
    'settings',
    'video-journal',
    'profile',
  ];
  if (screen === 'reflection') {
    return { screen: 'home', dreamId: null };
  }

  if (allowed.includes(screen)) {
    return { screen, dreamId: null, profileHandle: null };
  }
  return { screen: 'home', dreamId: null, profileHandle: null };
}

export function useHashRoute() {
  const [route, setRouteState] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHash() : { screen: 'home', dreamId: null, profileHandle: null }
  );

  useEffect(() => {
    const onHash = () => setRouteState(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((screen: RouteScreen, id?: string | null) => {
    if (screen === 'dream' && id) {
      window.location.hash = `#/dream/${encodeURIComponent(id)}`;
      return;
    }
    if (screen === 'profile' && id) {
      window.location.hash = `#/profile/${encodeURIComponent(id)}`;
      return;
    }
    window.location.hash = `#/${screen === 'home' ? '' : screen}`;
  }, []);

  return { route, navigate, setRoute: setRouteState };
}
