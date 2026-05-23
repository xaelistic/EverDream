import { useCallback, useEffect, useState } from 'react';

export type RouteScreen =
  | 'home'
  | 'reflection'
  | 'journal'
  | 'record'
  | 'dream'
  | 'insights'
  | 'dashboard'
  | 'wearables'
  | 'privacy'
  | 'achievements'
  | 'assets'
  | 'more';

export type AppRoute = {
  screen: RouteScreen;
  dreamId: string | null;
};

function parseHash(): AppRoute {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return { screen: 'home', dreamId: null };

  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'dream' && parts[1]) {
    return { screen: 'dream', dreamId: decodeURIComponent(parts[1]) };
  }

  const screen = parts[0] as RouteScreen;
  const allowed: RouteScreen[] = [
    'home',
    'reflection',
    'journal',
    'record',
    'insights',
    'dashboard',
    'wearables',
    'privacy',
    'achievements',
    'assets',
    'more',
  ];
  if (allowed.includes(screen)) {
    return { screen, dreamId: null };
  }
  return { screen: 'home', dreamId: null };
}

export function useHashRoute() {
  const [route, setRouteState] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHash() : { screen: 'home', dreamId: null }
  );

  useEffect(() => {
    const onHash = () => setRouteState(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((screen: RouteScreen, dreamId?: string | null) => {
    if (screen === 'dream' && dreamId) {
      window.location.hash = `#/dream/${encodeURIComponent(dreamId)}`;
      return;
    }
    window.location.hash = `#/${screen === 'home' ? '' : screen}`;
  }, []);

  return { route, navigate, setRoute: setRouteState };
}
