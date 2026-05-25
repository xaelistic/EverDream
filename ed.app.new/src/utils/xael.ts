/**
 * XAEL (Experience Analysis & Encoding Layer)
 * Unified data structure combining:
 * - Structure (dream narrative, entities, themes)
 * - Valence (emotional tone, intensity, sentiment)
 * - Wearable Data (HRV, sleep stages, biometrics)
 * 
 * Used for: DXP calculation, Image Generation prompts, AI analysis
 */

export interface WearableData {
  // Sleep Metrics
  sleepDurationMinutes: number;
  remPercentage?: number;
  deepSleepPercentage?: number;
  lightSleepPercentage?: number;
  awakePercentage?: number;
  
  // Biometrics
  avgHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  hrvScore?: number; // Heart Rate Variability
  respiratoryRate?: number;
  bodyTemperature?: number;
  spo2?: number; // Blood oxygen
  
  // Movement
  movementCount?: number;
  restlessnessScore?: number; // 0-100
  
  // Device Info
  deviceId?: string;
  deviceType?: 'oura' | 'whoop' | 'fitbit' | 'apple_watch' | 'garmin' | 'manual';
  recordedAt?: string;
}

export interface EmotionalAnalysis {
  // Facial Detection Results
  detectedEmotions: Array<{
    emotion: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral';
    confidence: number;
    timestamp: number;
  }>;
  
  // Voice/Audio Analysis (if audio recorded)
  voiceTone?: {
    pitch: number;
    energy: number;
    speechRate: number;
    emotions: string[];
  };
  
  // Text-based Sentiment
  sentimentScore: number; // -1 to 1
  emotionalIntensity: number; // 0-100
  dominantEmotion: string;
  secondaryEmotions: string[];
  
  // User Prompted Emotions
  userReportedMood?: string[];
  userReportedIntensity?: number; // 1-10
}

export interface DreamStructure {
  // Narrative Elements
  narrative: string;
  title: string;
  
  // Extracted Entities
  characters: string[];
  locations: string[];
  objects: string[];
  actions: string[];
  
  // Themes & Symbols
  themes: string[];
  symbols: string[];
  archetypes: string[];
  
  // Temporal/Spatial
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'unknown';
  setting?: string;
  isLucid?: boolean;
  isRecurring?: boolean;
  
  // Story Arc
  hasBeginning: boolean;
  hasMiddle: boolean;
  hasEnd: boolean;
  coherenceScore: number; // 0-100
}

export interface XAELData {
  // Core Components
  structure: DreamStructure;
  valence: EmotionalAnalysis;
  wearableData: WearableData;
  
  // Metadata
  dreamId: string;
  userId: string;
  createdAt: string;
  recordedAt: string; // When the dream occurred
  capturedAt: string; // When user logged it
  
  // Derived Metrics
  dxpScore: number; // Dream Experience Points (0-1000)
  xaelscore: number; // Unified experience score (0-100)
  
  // Quality Indicators
  completenessScore: number; // How much data was captured (0-100)
  confidenceScore: number; // AI confidence in analysis (0-100)
  
  // Versioning
  schemaVersion: string;
}

export interface ImageGenerationPrompt {
  xaelInput: XAELData;
  prompt: string;
  negativePrompt: string;
  style: string;
  aspectRatio: string;
  seed?: number;
  steps?: number;
  cfgScale?: number;
}

/**
 * Calculate unified XAEL score from components
 * Formula: XAEL = (Structure × 0.3 + Valence × 0.4 + Wearable × 0.3) × Completeness
 */
export function calculateXAELScore(xael: XAELData): number {
  const structureScore = xael.structure.coherenceScore || 50;
  
  const valenceScore = Math.abs(xael.valence.sentimentScore) * 50 + 
                       (xael.valence.emotionalIntensity / 2);
  
  let wearableScore = 50; // Default if no wearable data
  if (xael.wearableData) {
    const { remPercentage, deepSleepPercentage, hrvScore, restlessnessScore } = xael.wearableData;
    
    const sleepQuality = ((remPercentage || 20) + (deepSleepPercentage || 15)) / 35 * 50;
    const hrvComponent = hrvScore ? Math.min(hrvScore / 100, 1) * 25 : 12.5;
    const restPenalty = restlessnessScore ? (100 - restlessnessScore) / 100 * 25 : 12.5;
    
    wearableScore = sleepQuality + hrvComponent + restPenalty;
  }
  
  const rawScore = (structureScore * 0.3) + (valenceScore * 0.4) + (wearableScore * 0.3);
  
  return Math.round(rawScore * (xael.completenessScore / 100));
}

/**
 * Calculate DXP (Dream Experience Points)
 * Gamified scoring system (0-1000 XP)
 */
export function calculateDXPScore(xael: XAELData): number {
  const baseScore = calculateXAELScore(xael);
  
  // Multipliers for special conditions
  let multiplier = 1.0;
  
  if (xael.structure.isLucid) multiplier *= 1.5;
  if (xael.structure.isRecurring) multiplier *= 1.3;
  if (xael.structure.themes.length >= 3) multiplier *= 1.2;
  if (xael.wearableData.remPercentage && xael.wearableData.remPercentage > 25) multiplier *= 1.2;
  if (xael.valence.emotionalIntensity > 70) multiplier *= 1.1;
  
  // Completeness bonus
  const completenessBonus = xael.completenessScore / 100;
  
  return Math.min(1000, Math.round(baseScore * multiplier * completenessBonus * 10));
}

/**
 * Generate image generation prompt from XAEL data
 */
export function generateImagePrompt(xael: XAELData, style: string = 'surreal'): ImageGenerationPrompt {
  const { structure, valence, wearableData } = xael;
  
  // Build positive prompt
  const elements: string[] = [];
  
  // Add setting
  if (structure.setting) {
    elements.push(`in ${structure.setting}`);
  }
  
  // Add key objects and characters
  if (structure.objects.length > 0) {
    elements.push(`featuring ${structure.objects.slice(0, 3).join(', ')}`);
  }
  
  if (structure.characters.length > 0) {
    elements.push(`with ${structure.characters.slice(0, 2).join(' and ')}`);
  }
  
  // Add mood/atmosphere based on valence
  const moodAdjectives: Record<string, string> = {
    'happy': 'bright, joyful, vibrant',
    'sad': 'melancholic, somber, muted',
    'fearful': 'dark, ominous, unsettling',
    'surprised': 'dynamic, unexpected, striking',
    'neutral': 'balanced, harmonious, calm'
  };
  
  const moodDesc = moodAdjectives[valence.dominantEmotion] || 'mysterious, ethereal';
  elements.push(moodDesc);
  
  // Add style descriptor
  const styleDescriptors: Record<string, string> = {
    'surreal': 'surrealist painting, dreamlike, Salvador Dali style',
    'realistic': 'photorealistic, cinematic, highly detailed',
    'abstract': 'abstract art, expressionist, bold colors',
    'anime': 'anime style, studio ghibli, beautiful',
    'oil': 'oil painting, classical art, textured brushstrokes',
    'digital': 'digital art, concept art, ArtStation trending'
  };
  
  const styleDesc = styleDescriptors[style] || styleDescriptors['surreal'];
  
  // Build negative prompt
  const negativeElements = [
    'blurry', 'low quality', 'distorted', 'ugly', 'deformed',
    'text', 'watermark', 'signature', 'cropped', 'worst quality'
  ];
  
  if (valence.sentimentScore < -0.3) {
    negativeElements.push('too dark', 'overwhelming');
  }
  
  const positivePrompt = `A dream scene, ${structure.title}, ${elements.join(', ')}, ${styleDesc}, masterpiece, high detail`;
  const negativePrompt = negativeElements.join(', ');
  
  // Determine aspect ratio based on sleep phase (creative choice)
  const aspectRatio = wearableData.remPercentage && wearableData.remPercentage > 25 
    ? '16:9' // Cinematic for REM dreams
    : '4:5'; // Portrait for normal dreams
  
  return {
    xaelInput: xael,
    prompt: positivePrompt,
    negativePrompt: negativePrompt,
    style: style,
    aspectRatio: aspectRatio,
    seed: Math.floor(Math.random() * 1000000),
    steps: 30,
    cfgScale: 7.5
  };
}

/**
 * Convert XAEL to JSON for storage/transmission
 */
export function xaelToJSON(xael: XAELData): string {
  return JSON.stringify(xael, null, 2);
}

/**
 * Parse XAEL from JSON
 */
export function xaelFromJSON(json: string): XAELData {
  const data = JSON.parse(json);
  
  // Validate required fields
  if (!data.dreamId || !data.userId || !data.structure || !data.valence) {
    throw new Error('Invalid XAEL data: missing required fields');
  }
  
  return data as XAELData;
}

/**
 * Create empty XAEL template
 */
export function createEmptyXAEL(userId: string, dreamId: string): XAELData {
  const now = new Date().toISOString();
  
  return {
    dreamId,
    userId,
    createdAt: now,
    recordedAt: now,
    capturedAt: now,
    structure: {
      narrative: '',
      title: 'Untitled Dream',
      characters: [],
      locations: [],
      objects: [],
      actions: [],
      themes: [],
      symbols: [],
      archetypes: [],
      coherenceScore: 0,
      hasBeginning: false,
      hasMiddle: false,
      hasEnd: false
    },
    valence: {
      detectedEmotions: [],
      sentimentScore: 0,
      emotionalIntensity: 0,
      dominantEmotion: 'neutral',
      secondaryEmotions: []
    },
    wearableData: {
      sleepDurationMinutes: 0,
      deviceId: undefined,
      deviceType: 'manual'
    },
    dxpScore: 0,
    xaelscore: 0,
    completenessScore: 0,
    confidenceScore: 0,
    schemaVersion: '1.0.0'
  };
}

export default {
  calculateXAELScore,
  calculateDXPScore,
  generateImagePrompt,
  xaelToJSON,
  xaelFromJSON,
  createEmptyXAEL
};
