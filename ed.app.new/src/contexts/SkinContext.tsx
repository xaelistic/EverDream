/**
 * Everdream — Skin Context
 * 
 * Provides skin switching between Default (paper) and Pearl Light themes.
 * Persists choice to localStorage.
 * 
 * Usage:
 *   import { useSkin } from './contexts/SkinContext';
 *   const { skin, setSkin, isPearl } = useSkin();
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type SkinId = 'default' | 'pearl';

interface SkinContextValue {
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
  isPearl: boolean;
  isDefault: boolean;
}

const SkinContext = createContext<SkinId>('default');

export function useSkin(): SkinContextValue {
  const skin = useContext(SkinContext);
  return {
    skin,
    setSkin: () => {}, // overridden by provider
    isPearl: skin === 'pearl',
    isDefault: skin === 'default',
  };
}

// We need a proper provider that exposes setSkin
const SkinContextFull = createContext<SkinContextValue>({
  skin: 'default',
  setSkin: () => {},
  isPearl: false,
  isDefault: true,
});

export function useSkinFull(): SkinContextValue {
  return useContext(SkinContextFull);
}

const STORAGE_KEY = 'everdream-skin';

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'pearl' || stored === 'default') return stored;
    } catch {}
    return 'default';
  });

  const setSkin = (newSkin: SkinId) => {
    setSkinState(newSkin);
    try {
      localStorage.setItem(STORAGE_KEY, newSkin);
    } catch {}
  };

  // Apply/remove the skin-pearl class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (skin === 'pearl') {
      html.classList.add('skin-pearl');
    } else {
      html.classList.remove('skin-pearl');
    }
  }, [skin]);

  return (
    <SkinContextFull .Provider value={{ skin, setSkin, isPearl: skin === 'pearl', isDefault: skin === 'default' }} data-component="SkinContext">
      {children}
    </SkinContextFull.Provider>
  );
}
