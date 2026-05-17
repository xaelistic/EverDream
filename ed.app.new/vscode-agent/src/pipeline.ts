import path from 'path';
import { promises as fs } from 'fs';

export interface DreamMetadata {
  title: string;
  sourceText: string;
  style: string;
  tone: string;
  createdAt: string;
  assetFolder: string;
  narrativeFile: string;
  metadataFile: string;
  quote: string;
  xp: {
    base: number;
    semantic: number;
    valence: number;
    duration: number;
    sustain: number;
    trust: number;
    total: number;
  };
  provenance: {
    layer1: {
      biometricSignature: string | null;
      wearableConnected: boolean;
      notes: string;
    };
    layer2: {
      source: string;
      timestamp: string;
      userIntent: string;
    };
    layer3: {
      verification: boolean;
      modelVersion: string;
      note: string;
    };
    layer4: {
      resonanceTags: string[];
      shareable: boolean;
    };
  };
}

const styleAdjectives: Record<string, string> = {
  "Surreal": "glimmering and strange",
  "Realistic": "rooted and tactile",
  "Cyberpunk": "neon-laced and electric",
  "Thai-inspired": "luminous with temple incense and river song",
  "African visionary": "earth-bound and vibrant with ancestral color",
  "Mystical": "soft and otherworldly"
};

const toneAdjectives: Record<string, string> = {
  "Dreamy": "softly unfolding with gentle wonder",
  "Intense": "charged and urgent",
  "Calm": "quiet and reflective",
  "Transformative": "deeply symbolic and revealing",
  "Playful": "bright and curious"
};

export function computeXpScore(values: {
  semantic: number;
  valence: number;
  resonance: number;
  duration: number;
  sustain: number;
  trust: number;
}) {
  const base = 40;
  const total = Math.round(base + values.semantic + values.valence + values.resonance + values.duration + values.sustain + values.trust);

  return {
    base,
    semantic: values.semantic,
    valence: values.valence,
    duration: values.duration,
    sustain: values.sustain,
    trust: values.trust,
    total
  };
}

export function extractDreamQuote(source: string) {
  const sentences = source.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  return sentences[0] || source.slice(0, 120);
}

export function formatFolderName(title: string, date: Date) {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${date.toISOString().slice(0, 10)}-${safeTitle || 'dream-asset'}`;
}

export function stylizeNarrative(original: string, tone: string, style: string) {
  const adjectives = [styleAdjectives[style] || style, toneAdjectives[tone] || tone].filter(Boolean);
  const symbolMatches = Array.from(new Set((original.match(/\b(sky|river|mirror|shadow|forest|city|fire|water|voice|river|light|dream)\b/gi) || []).map((m) => m.toLowerCase())));
  const symbolLine = symbolMatches.length > 0 ? `It carries recurring images like ${symbolMatches.join(', ')} that feel anchored in your biographical signature.` : '';

  const firstLine = `The dream opens as ${adjectives.join(' and ')}, a narrative bridge between waking memory and symbolic resonance.`;
  const body = original
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join('\n');

  return `${firstLine}

${symbolLine}

${body}

In the end, this version leans into the tone and style while staying true to the raw emotional anchor of the original nugget.`.trim();
}

export function remixNarrative(narrative: string, newStyle: string) {
  const lines = narrative.split(/\r?\n/).map((line) => line.trim());
  const header = `Remixed into a ${newStyle} rendering:`;
  return [header, ...lines].join('\n');
}

export async function createPlaceholderImage(assetFolder: string) {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAE0lEQVR42mP8z8AARDAxMDAwAACuAIBSSb4AAAAASUVORK5CYII=';
  const imageBuffer = Buffer.from(pngBase64, 'base64');
  const assetPath = path.join(assetFolder, 'asset.png');
  await fs.writeFile(assetPath, imageBuffer);
  return assetPath;
}

export async function createMetadata(options: {
  title: string;
  sourceText: string;
  style: string;
  tone: string;
  assetFolder: string;
  quote: string;
  provenanceNotes?: string;
}) {
  const createdAt = new Date().toISOString();
  const xp = computeXpScore({ semantic: 24, valence: 16, resonance: 18, duration: 12, sustain: 8, trust: 10 });
  const metadata: DreamMetadata = {
    title: options.title,
    sourceText: options.sourceText,
    style: options.style,
    tone: options.tone,
    createdAt,
    assetFolder: options.assetFolder,
    narrativeFile: path.join(options.assetFolder, 'narrative.md'),
    metadataFile: path.join(options.assetFolder, 'metadata.json'),
    quote: options.quote,
    xp,
    provenance: {
      layer1: {
        biometricSignature: null,
        wearableConnected: false,
        notes: 'Layer 1 prepared for biometric-backed signature when hardware is available.'
      },
      layer2: {
        source: 'local dream nugget',
        timestamp: createdAt,
        userIntent: 'Narrative enrichment and asset generation'
      },
      layer3: {
        verification: false,
        modelVersion: 'everdream-demo-v1',
        note: options.provenanceNotes || 'Prepared for future verification stack with narrative consistency checks.'
      },
      layer4: {
        resonanceTags: ['personal', 'symbolic', 'shareable'],
        shareable: true
      }
    }
  };

  const metadataPath = path.join(options.assetFolder, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  return metadata;
}

export function generateVariants(original: string, tone: string, style: string) {
  const variant1 = stylizeNarrative(original, tone, style);
  const variant2 = stylizeNarrative(`${original}

A second pass re-centers the narration as a felt-memory, pulling out the mood and recurring motifs.`, tone, style);
  const variant3 = stylizeNarrative(`${original}

This variant leans into a poetic, meditative frame and highlights the body-based resonance of the dream.`, tone, style);
  return [variant1, variant2, variant3];
}

export function suggestPremiumText(freeWindowDays: number) {
  return `Your free tier allows one high-quality asset generation every ${freeWindowDays} days. Upgrade to premium to create daily re-renders, comics, and longer-form visual assets while still keeping your data local-first and sovereign.`;
}
