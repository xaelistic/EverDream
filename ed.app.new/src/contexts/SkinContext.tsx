/**
 * Everdream — Skin Context
 *
 * Provides skin switching across multiple visual themes.
 * Persists choice to localStorage.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { isValidSkinId } from '../lib/skins';

export type SkinId = 'default' | 'pearl' | 'pearl-dark' | 'midnight' | 'sakura';

const SKIN_CLASSES = ['skin-pearl', 'skin-pearl-dark', 'skin-midnight', 'skin-sakura'] as const;

interface SkinContextValue {
  skin: SkinId;
  setSkin: (skin: SkinId) => void;
  /** @deprecated Use isThemed — kept for pearl-specific checks */
  isPearl: boolean;
  isDefault: boolean;
  /** True when any non-paper theme is active */
  isThemed: boolean;
}

const SkinContextFull = createContext<SkinContextValue>({
  skin: 'default',
  setSkin: () => {},
  isPearl: false,
  isDefault: true,
  isThemed: false,
});

export function useSkinFull(): SkinContextValue {
  return useContext(SkinContextFull);
}

export function useSkin(): SkinContextValue {
  return useSkinFull();
}

const STORAGE_KEY = 'everdream-skin';

function skinToClass(skin: SkinId): string | null {
  switch (skin) {
    case 'pearl':
      return 'skin-pearl';
    case 'pearl-dark':
      return 'skin-pearl-dark';
    case 'midnight':
      return 'skin-midnight';
    case 'sakura':
      return 'skin-sakura';
    default:
      return null;
  }
}

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<SkinId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidSkinId(stored)) return stored;
    } catch {}
    return 'default';
  });

  const setSkin = (newSkin: SkinId) => {
    setSkinState(newSkin);
    try {
      localStorage.setItem(STORAGE_KEY, newSkin);
    } catch {}
  };

  useEffect(() => {
    const html = document.documentElement;
    SKIN_CLASSES.forEach((cls) => html.classList.remove(cls));
    const activeClass = skinToClass(skin);
    if (activeClass) html.classList.add(activeClass);
  }, [skin]);

  const isThemed = skin !== 'default';

  return (
    <SkinContextFull.Provider
      value={{
        skin,
        setSkin,
        isPearl: skin === 'pearl',
        isDefault: skin === 'default',
        isThemed,
      }}
    >
      {children}
    </SkinContextFull.Provider>
  );
}