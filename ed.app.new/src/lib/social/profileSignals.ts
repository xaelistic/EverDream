/**
 * Social profile signals → interest suggestions (Tinder-style).
 * When Meta / Spotify (etc.) are linked, we surface tastes as profile interests
 * with clear source attribution. Real OAuth metadata is preferred; demo signals
 * fill in when a provider is linked but API payloads are empty.
 */

import {
  fetchLinkedSocialAccounts,
  type SocialAccountPublic,
} from './socialAccounts';
import {
  getLinkedProviders,
  setProviderLinked,
  type SocialProviderId,
} from '../socialShare';
import {
  addInterestToProfile,
  loadUserProfile,
  saveUserProfile,
} from '../profileService';

export type SocialInterestSource = 'spotify' | 'meta';

export interface SocialInterestSignal {
  label: string;
  source: SocialInterestSource;
  /** Optional raw tag (genre, page category) */
  raw?: string;
}

const SIGNALS_KEY = 'everdream_social_profile_signals';

export interface StoredSocialSignals {
  spotify?: {
    linked: boolean;
    topGenres: string[];
    artists: string[];
    fetchedAt?: string;
  };
  meta?: {
    linked: boolean;
    pageCategories: string[];
    musicLikes: string[];
    fetchedAt?: string;
  };
}

/** Map Spotify genres / artist vibes → EverDream interest labels (no lucidity). */
const SPOTIFY_GENRE_TO_INTERESTS: Record<string, string[]> = {
  ambient: ['Meditation & wind-down', 'Sleep science'],
  sleep: ['Sleep science', 'Meditation & wind-down'],
  classical: ['Creativity', 'Psychology'],
  piano: ['Creativity', 'Meditation & wind-down'],
  jazz: ['Creativity'],
  electronic: ['Creativity', 'Circadian rhythm'],
  lo_fi: ['Meditation & wind-down', 'Journaling habit'],
  'lo-fi': ['Meditation & wind-down', 'Journaling habit'],
  lofi: ['Meditation & wind-down', 'Journaling habit'],
  indie: ['Creativity', 'Dream art & images'],
  folk: ['Creativity', 'Symbols & archetypes'],
  soundtrack: ['Dream art & images', 'Creativity'],
  'new age': ['Meditation & wind-down', 'Sleep science'],
  new_age: ['Meditation & wind-down', 'Sleep science'],
  chill: ['Meditation & wind-down', 'Sleep science'],
  acoustic: ['Creativity', 'Journaling habit'],
  rnb: ['Creativity'],
  'r&b': ['Creativity'],
  soul: ['Psychology', 'Creativity'],
  rock: ['Creativity'],
  pop: ['Creativity'],
  metal: ['Nightmares & anxiety dreams', 'Psychology'],
  punk: ['Psychology', 'Creativity'],
};

/** Meta page / like categories → interest labels */
const META_CATEGORY_TO_INTERESTS: Record<string, string[]> = {
  music: ['Creativity'],
  art: ['Dream art & images', 'Creativity'],
  books: ['Psychology', 'Symbols & archetypes'],
  health: ['Sleep science', 'Wearables & sleep data'],
  fitness: ['Wearables & sleep data', 'Circadian rhythm'],
  wellness: ['Meditation & wind-down', 'Sleep science'],
  meditation: ['Meditation & wind-down'],
  psychology: ['Psychology'],
  film: ['Dream art & images', 'Creativity'],
  gaming: ['Creativity', 'Dream art & images'],
  science: ['Sleep science', 'Psychology'],
};

/** Demo payloads when linked without live API data (honestly labelled as sample tastes). */
const DEMO_SPOTIFY = {
  topGenres: ['ambient', 'lo-fi', 'classical', 'soundtrack'],
  artists: ['Nils Frahm', 'Ólafur Arnalds'],
};

const DEMO_META = {
  pageCategories: ['wellness', 'art', 'books', 'music'],
  musicLikes: ['ambient playlists', 'film scores'],
};

export function loadSocialSignals(): StoredSocialSignals {
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (raw) return JSON.parse(raw) as StoredSocialSignals;
  } catch {
    /* ignore */
  }
  return {};
}

export function saveSocialSignals(signals: StoredSocialSignals): void {
  try {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
  } catch {
    /* ignore */
  }
}

/**
 * Mark provider linked and seed profile signals (OAuth metadata or demo).
 * Returns interest suggestions derived from the signals.
 */
export function linkSocialProviderForProfile(
  provider: SocialInterestSource,
  opts?: {
    genres?: string[];
    artists?: string[];
    categories?: string[];
    musicLikes?: string[];
  },
): SocialInterestSignal[] {
  setProviderLinked(provider, true);
  const existing = loadSocialSignals();
  const now = new Date().toISOString();

  if (provider === 'spotify') {
    existing.spotify = {
      linked: true,
      topGenres: opts?.genres?.length ? opts.genres : DEMO_SPOTIFY.topGenres,
      artists: opts?.artists?.length ? opts.artists : DEMO_SPOTIFY.artists,
      fetchedAt: now,
    };
  } else {
    existing.meta = {
      linked: true,
      pageCategories: opts?.categories?.length ? opts.categories : DEMO_META.pageCategories,
      musicLikes: opts?.musicLikes?.length ? opts.musicLikes : DEMO_META.musicLikes,
      fetchedAt: now,
    };
  }
  saveSocialSignals(existing);
  return deriveInterestSignals(existing);
}

export function unlinkSocialProviderSignals(provider: SocialInterestSource): void {
  setProviderLinked(provider, false);
  const existing = loadSocialSignals();
  if (provider === 'spotify') delete existing.spotify;
  else delete existing.meta;
  saveSocialSignals(existing);
}

export function isSocialLinked(provider: SocialInterestSource): boolean {
  const local = getLinkedProviders();
  if (local[provider] || (provider === 'meta' && local.facebook)) return true;
  const signals = loadSocialSignals();
  if (provider === 'spotify') return Boolean(signals.spotify?.linked);
  return Boolean(signals.meta?.linked);
}

function uniqueSignals(list: SocialInterestSignal[]): SocialInterestSignal[] {
  const seen = new Set<string>();
  const out: SocialInterestSignal[] = [];
  for (const s of list) {
    const key = `${s.source}:${s.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function deriveInterestSignals(signals: StoredSocialSignals = loadSocialSignals()): SocialInterestSignal[] {
  const out: SocialInterestSignal[] = [];

  if (signals.spotify?.linked) {
    for (const genre of signals.spotify.topGenres || []) {
      const key = genre.toLowerCase().trim();
      const mapped = SPOTIFY_GENRE_TO_INTERESTS[key] || SPOTIFY_GENRE_TO_INTERESTS[key.replace(/\s+/g, '_')];
      if (mapped) {
        for (const label of mapped) {
          out.push({ label, source: 'spotify', raw: genre });
        }
      } else {
        // keep a human genre tag as soft interest (Tinder shows raw tastes too)
        const pretty = genre.charAt(0).toUpperCase() + genre.slice(1);
        out.push({ label: pretty, source: 'spotify', raw: genre });
      }
    }
  }

  if (signals.meta?.linked) {
    for (const cat of signals.meta.pageCategories || []) {
      const key = cat.toLowerCase().trim();
      const mapped = META_CATEGORY_TO_INTERESTS[key];
      if (mapped) {
        for (const label of mapped) {
          out.push({ label, source: 'meta', raw: cat });
        }
      } else {
        const pretty = cat.charAt(0).toUpperCase() + cat.slice(1);
        out.push({ label: pretty, source: 'meta', raw: cat });
      }
    }
  }

  return uniqueSignals(out);
}

/** Sync linked state from Supabase social_accounts when available. */
export async function hydrateSignalsFromLinkedAccounts(): Promise<SocialInterestSignal[]> {
  let accounts: SocialAccountPublic[] = [];
  try {
    accounts = await fetchLinkedSocialAccounts();
  } catch {
    accounts = [];
  }

  const existing = loadSocialSignals();
  let changed = false;

  for (const acc of accounts) {
    const provider = acc.provider.toLowerCase();
    const meta = (acc.metadata || {}) as Record<string, unknown>;

    if (provider === 'spotify') {
      const genres = Array.isArray(meta.top_genres)
        ? (meta.top_genres as string[])
        : Array.isArray(meta.genres)
          ? (meta.genres as string[])
          : existing.spotify?.topGenres || DEMO_SPOTIFY.topGenres;
      const artists = Array.isArray(meta.top_artists)
        ? (meta.top_artists as string[]).map(String)
        : existing.spotify?.artists || DEMO_SPOTIFY.artists;
      existing.spotify = {
        linked: true,
        topGenres: genres.map(String),
        artists: artists.map(String),
        fetchedAt: new Date().toISOString(),
      };
      setProviderLinked('spotify', true);
      changed = true;
    }

    if (provider === 'meta' || provider === 'facebook' || provider === 'instagram') {
      const cats = Array.isArray(meta.page_categories)
        ? (meta.page_categories as string[])
        : Array.isArray(meta.interests)
          ? (meta.interests as string[])
          : existing.meta?.pageCategories || DEMO_META.pageCategories;
      existing.meta = {
        linked: true,
        pageCategories: cats.map(String),
        musicLikes: Array.isArray(meta.music)
          ? (meta.music as string[]).map(String)
          : existing.meta?.musicLikes || DEMO_META.musicLikes,
        fetchedAt: new Date().toISOString(),
      };
      setProviderLinked('meta', true);
      changed = true;
    }
  }

  // Also respect local-only linked flags without remote accounts
  const local = getLinkedProviders();
  if (local.spotify && !existing.spotify?.linked) {
    existing.spotify = {
      linked: true,
      topGenres: DEMO_SPOTIFY.topGenres,
      artists: DEMO_SPOTIFY.artists,
      fetchedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if ((local.meta || local.facebook) && !existing.meta?.linked) {
    existing.meta = {
      linked: true,
      pageCategories: DEMO_META.pageCategories,
      musicLikes: DEMO_META.musicLikes,
      fetchedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed) saveSocialSignals(existing);
  return deriveInterestSignals(existing);
}

/** After Spotify/Meta OAuth returns, copy linked tastes onto the user profile. */
export async function importLinkedSocialInterestsIntoProfile(): Promise<SocialInterestSignal[]> {
  const signals = await hydrateSignalsFromLinkedAccounts();
  if (signals.length === 0) return [];

  const profile = await loadUserProfile();
  let next = profile;
  for (const signal of signals) {
    next = addInterestToProfile(next, signal.label, signal.source);
  }
  if (next !== profile) {
    await saveUserProfile(next);
  }
  return signals;
}

export function socialSourceLabel(source: SocialInterestSource): string {
  return source === 'spotify' ? 'Spotify' : 'Meta';
}

/** Providers we can pull profile tastes from */
export const PROFILE_SOCIAL_PROVIDERS: {
  id: SocialInterestSource;
  name: string;
  description: string;
}[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Genres & listening vibes as profile interests',
  },
  {
    id: 'meta',
    name: 'Meta',
    description: 'Page & taste categories as profile interests',
  },
];

export type { SocialProviderId };
