/**
 * Normalize dream analysis payloads from mixed API shapes (legacy DreamAnalysis
 * vs NVCNT matrix) into safe string fields for React rendering.
 */

export interface NarrativeMetric {
  score?: number;
  summary?: string;
}

export interface NVCNTMatrix {
  narrative?: NarrativeMetric;
  valence?: { score?: number; polarity?: number };
  complexity?: {
    score?: number;
    conceptual_payload?: Array<{ concept?: string }>;
  };
  novelty?: { score?: number; unique_identifiers?: string[] };
  texture?: { score?: number; render_prompt?: string };
}

export interface DreamAnalysisFields {
  category?: string;
  themes?: string[];
  emotion?: string;
  symbols?: string[];
  narrative?: unknown;
  nugget?: unknown;
  valence?: number;
  interpretation?: {
    symbols?: Record<string, string>;
    meaning?: unknown;
    commonPattern?: string;
  };
}

export function isNarrativeMetric(value: unknown): value is NarrativeMetric {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'summary' in value
  );
}

export function coerceNarrativeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (isNarrativeMetric(value)) {
    return typeof value.summary === 'string' ? value.summary : fallback;
  }
  return fallback;
}

export function isNVCNTMatrix(analysis: unknown): analysis is NVCNTMatrix {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return false;
  const record = analysis as Record<string, unknown>;
  if ('category' in record || 'nugget' in record) return false;
  return isNarrativeMetric(record.narrative);
}

export function nvcntToDreamAnalysis(matrix: NVCNTMatrix, sourceText: string): DreamAnalysisFields {
  const summary = coerceNarrativeText(matrix.narrative, sourceText);
  const polarity = matrix.valence?.polarity ?? 0;
  const symbols =
    matrix.complexity?.conceptual_payload
      ?.map((item) => item.concept)
      .filter((concept): concept is string => typeof concept === 'string' && concept.length > 0) ?? [];

  let category = 'uncategorized';
  if (polarity <= -0.3) category = 'anxiety';
  else if (polarity >= 0.3) category = 'peaceful';

  return {
    category,
    themes: matrix.novelty?.unique_identifiers?.slice(0, 5) ?? ['dream'],
    emotion: polarity >= 0 ? 'positive' : polarity <= -0.2 ? 'anxious' : 'neutral',
    symbols,
    narrative: summary || sourceText,
    nugget: (summary || sourceText).substring(0, 100),
    valence: polarity,
    interpretation: {
      symbols: {},
      meaning: summary || 'Analysis unavailable',
      commonPattern: '',
    },
  };
}

export function normalizeDreamAnalysis(
  analysis: unknown,
  sourceText = '',
): DreamAnalysisFields {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    return { narrative: sourceText, nugget: sourceText.substring(0, 100) };
  }

  if (isNVCNTMatrix(analysis)) {
    return nvcntToDreamAnalysis(analysis, sourceText);
  }

  const record = analysis as DreamAnalysisFields;
  const narrative = coerceNarrativeText(record.narrative, sourceText);
  const nugget =
    typeof record.nugget === 'string'
      ? record.nugget
      : narrative.substring(0, 100);

  const meaning = coerceNarrativeText(record.interpretation?.meaning, 'Analysis unavailable');

  return {
    ...record,
    narrative,
    nugget,
    interpretation: record.interpretation
      ? {
          ...record.interpretation,
          meaning,
        }
      : undefined,
  };
}

export function sanitizeDreamForUI<T extends Record<string, unknown>>(dream: T): T {
  const narrative = coerceNarrativeText(dream.narrative, typeof dream.content === 'string' ? dream.content : '');
  const nugget =
    typeof dream.nugget === 'string' && dream.nugget.length > 0
      ? dream.nugget
      : narrative.substring(0, 100);

  return {
    ...dream,
    narrative,
    nugget,
  };
}