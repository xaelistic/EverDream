/**
 * Build XAELData from a saved dream journal entry for scoring & minting.
 */

import {
  calculateDXPScore,
  calculateXAELScore,
  type XAELData,
} from '../utils/xael';

const EMOTION_SENTIMENT: Record<string, number> = {
  joy: 0.7,
  peaceful: 0.5,
  love: 0.6,
  surprise: 0.3,
  neutral: 0,
  fear: -0.5,
  anger: -0.6,
  sadness: -0.4,
  anxiety: -0.45,
};

export interface DreamForXAEL {
  id: string;
  date?: string;
  content?: string;
  narrative?: string;
  nugget?: string;
  themes?: string[];
  symbols?: string[];
  emotion?: string;
  moodValence?: number;
  category?: string;
  sleepData?: {
    sleepDuration?: number;
    estimatedREM?: number;
    quality?: number;
    movementScore?: number;
  };
  assetMetadata?: { rarityScore?: number };
}

export function dreamToXAELData(dream: DreamForXAEL, userId: string): XAELData {
  const now = new Date().toISOString();
  const narrative = dream.narrative || dream.content || '';
  const title = dream.nugget?.slice(0, 80) || 'Dream entry';
  const themes = dream.themes ?? [];
  const symbols = dream.symbols ?? [];
  const emotion = (dream.emotion || 'neutral').toLowerCase();
  const sentiment =
    typeof dream.moodValence === 'number'
      ? Math.max(-1, Math.min(1, dream.moodValence))
      : (EMOTION_SENTIMENT[emotion] ?? 0);

  const wordCount = narrative.split(/\s+/).filter(Boolean).length;
  const coherenceScore = Math.min(
    100,
    Math.round(wordCount * 0.4 + themes.length * 6 + symbols.length * 4 + (narrative.length > 200 ? 15 : 0)),
  );

  const completenessScore = Math.min(
    100,
    Math.round(
      (narrative.length > 50 ? 30 : 10) +
        (themes.length > 0 ? 20 : 0) +
        (symbols.length > 0 ? 15 : 0) +
        (dream.sleepData ? 20 : 0) +
        (dream.assetMetadata?.rarityScore ? 15 : 0),
    ),
  );

  const sleep = dream.sleepData;
  const sleepMinutes = sleep?.sleepDuration ?? 0;
  const remPct = sleep?.estimatedREM && sleepMinutes
    ? Math.min(40, (sleep.estimatedREM / sleepMinutes) * 100)
    : undefined;

  const xael: XAELData = {
    dreamId: dream.id,
    userId,
    createdAt: dream.date || now,
    recordedAt: dream.date || now,
    capturedAt: now,
    structure: {
      narrative,
      title,
      characters: [],
      locations: [],
      objects: [],
      actions: [],
      themes,
      symbols,
      archetypes: [],
      isLucid: /lucid/i.test(narrative) || dream.category === 'lucid',
      isRecurring: /again|recurring|same dream/i.test(narrative),
      hasBeginning: wordCount > 20,
      hasMiddle: wordCount > 60,
      hasEnd: wordCount > 100,
      coherenceScore,
    },
    valence: {
      detectedEmotions: [],
      sentimentScore: sentiment,
      emotionalIntensity: Math.round(Math.abs(sentiment) * 50 + (dream.assetMetadata?.rarityScore ?? 30) * 0.3),
      dominantEmotion: emotion,
      secondaryEmotions: themes.slice(0, 2),
    },
    wearableData: {
      sleepDurationMinutes: sleepMinutes,
      remPercentage: remPct,
      deepSleepPercentage: remPct ? remPct * 0.6 : undefined,
      restlessnessScore: sleep?.movementScore,
      deviceType: sleep ? 'manual' : 'manual',
    },
    dxpScore: 0,
    xaelscore: 0,
    completenessScore,
    confidenceScore: Math.min(95, 50 + themes.length * 5),
    schemaVersion: '1.0.0',
  };

  xael.xaelscore = calculateXAELScore(xael);
  xael.dxpScore = calculateDXPScore(xael);
  return xael;
}