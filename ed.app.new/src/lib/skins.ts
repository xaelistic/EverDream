import type { SkinId } from '../contexts/SkinContext';

export interface SkinMeta {
  id: SkinId;
  name: string;
  tagline: string;
  className: string | null;
  preview: [string, string, string];
  swatches: { color: string; label: string }[];
}

export const SKINS: SkinMeta[] = [
  {
    id: 'default',
    name: 'Paper',
    tagline: 'Warm parchment, grounded',
    className: null,
    preview: ['#f5f0e8', '#e8dfd0', '#7a9e7e'],
    swatches: [
      { color: '#f5f0e8', label: 'Cream' },
      { color: '#e8dfd0', label: 'Parchment' },
      { color: '#7a9e7e', label: 'Sage' },
    ],
  },
  {
    id: 'pearl',
    name: 'Pearl Light',
    tagline: 'Iridescent, airy, luminous',
    className: 'skin-pearl',
    preview: ['#f7f5ff', '#a8eddc', '#c8b8ff'],
    swatches: [
      { color: '#f7f5ff', label: 'Pearl' },
      { color: '#a8eddc', label: 'Aqua' },
      { color: '#c8b8ff', label: 'Lavender' },
    ],
  },
  {
    id: 'pearl-dark',
    name: 'Pearl Dark',
    tagline: 'Deep void, neon accents',
    className: 'skin-pearl-dark',
    preview: ['#0d0d1a', '#5ec4a8', '#9b8fd4'],
    swatches: [
      { color: '#0d0d1a', label: 'Void' },
      { color: '#5ec4a8', label: 'Aqua' },
      { color: '#c8b8ff', label: 'Neon' },
    ],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Indigo night sky, silver stars',
    className: 'skin-midnight',
    preview: ['#0a0f1e', '#4a6fa5', '#8b9dc3'],
    swatches: [
      { color: '#0a0f1e', label: 'Night' },
      { color: '#4a6fa5', label: 'Indigo' },
      { color: '#c4d4e8', label: 'Star' },
    ],
  },
  {
    id: 'sakura',
    name: 'Sakura',
    tagline: 'Cherry blossom, soft blush',
    className: 'skin-sakura',
    preview: ['#fff5f7', '#f4a8b8', '#e8c4d0'],
    swatches: [
      { color: '#fff5f7', label: 'Blush' },
      { color: '#f4a8b8', label: 'Petal' },
      { color: '#d4a0a8', label: 'Rose' },
    ],
  },
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'Copper dusk, warm glow',
    className: 'skin-ember',
    preview: ['#1a1410', '#c87840', '#f0c878'],
    swatches: [
      { color: '#1a1410', label: 'Dusk' },
      { color: '#c87840', label: 'Copper' },
      { color: '#f0c878', label: 'Amber' },
    ],
  },
  {
    id: 'noir',
    name: 'Noir',
    tagline: 'Monochrome, gold editorial',
    className: 'skin-noir',
    preview: ['#0a0a0a', '#888888', '#c8a848'],
    swatches: [
      { color: '#0a0a0a', label: 'Black' },
      { color: '#888888', label: 'Silver' },
      { color: '#c8a848', label: 'Gold' },
    ],
  },
];

export const SKIN_IDS = SKINS.map((s) => s.id) as SkinId[];

export function getSkinMeta(id: SkinId): SkinMeta {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isValidSkinId(value: string): value is SkinId {
  return SKIN_IDS.includes(value as SkinId);
}