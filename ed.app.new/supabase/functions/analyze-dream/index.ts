/**
 * Supabase Edge Function: analyze-dream v4
 *
 * Returns the client DreamAnalysis shape (category, themes, symbols,
 * narrative, nugget, interpretation) — not the old NVCNT-only payload.
 *
 * Voice: insightful, health-conscious, symbolic, informative, not woo.
 *
 * OpenRouter (EN stack — Gemini reserved for later non-EN):
 *   1. OPENROUTER_ANALYSIS_MODEL or z-ai/glm-4.7-flash
 *   2. deepseek/deepseek-v4-flash-0731
 *
 * Secrets:
 *   OPENROUTER_API_KEY
 *   OPENROUTER_ANALYSIS_MODEL (optional)
 */

interface DreamAnalysis {
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  valence: number;
  interpretation: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
}

interface AnalyzeRequestBody {
  text?: string;
  sleep?: {
    source?: string;
    durationMinutes?: number;
    remMinutes?: number;
    deepMinutes?: number;
    lightMinutes?: number;
    awakeMinutes?: number;
    efficiency?: number;
    score?: number;
  };
}

interface ProviderResult {
  analysis: DreamAnalysis;
  provider: string;
  model: string;
}

const MAX_INPUT_LENGTH = 8000;
const DEFAULT_MODEL = 'z-ai/glm-4.7-flash';
const FALLBACK_MODELS = ['deepseek/deepseek-v4-flash-0731'];

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

const CATEGORIES = [
  'nightmare',
  'lucid',
  'recurring',
  'peaceful',
  'prophetic',
  'anxiety',
  'adventure',
] as const;

const ANALYSIS_PROMPT = `You are EverDream's dream analyst: a sleep-health coach who also understands symbolism.

Write like a clear clinician-journalist, not a mystic.
- Be insightful and specific to THIS dream.
- Use symbols as metaphors for emotion, stress, relationships, and body/sleep state.
- Be health-conscious when it fits (sleep debt, overstimulation, unresolved tension, recovery).
- Do not diagnose, predict the future, or claim a dream has one true meaning.
- Prefer "often associated with" / "may reflect" over certainty.
- Do not sound spacey, cosmic, or New Age.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "category": "nightmare|lucid|recurring|peaceful|prophetic|anxiety|adventure",
  "themes": ["3-5 short themes"],
  "emotion": "joy|fear|sadness|anger|surprise|peace|anxiety|wonder|excitement",
  "symbols": ["2-6 concrete symbols from the dream"],
  "narrative": "120-180 words, first person present tense, vivid but not purple prose",
  "nugget": "one concrete sentence, 12-20 words",
  "valence": -1.0,
  "interpretation": {
    "symbols": { "symbol": "plain-language association" },
    "meaning": "2-4 sentences of useful psychological / health-aware insight",
    "commonPattern": "when dreams like this often show up in waking life"
  }
}

valence is -1 (distress) to 1 (ease).

The input may be a messy voice memo.
- Never write Speaker 1, Speaker 2, speaker labels, or timestamps.
- Drop fillers (um, uh, like, you know, I mean).
- Drop any talk about recording, filming, transcribing, or the app.
- narrative and nugget are the dream itself only, first person present tense.

Dream:
`;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  extra: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function emptyAnalysis(): DreamAnalysis {
  return {
    category: 'uncategorized',
    themes: [],
    emotion: 'neutral',
    symbols: [],
    narrative: '',
    nugget: '',
    valence: 0,
    interpretation: { symbols: {}, meaning: '', commonPattern: '' },
  };
}

function stripTranscriptMeta(raw: string): string {
  let text = (raw || '').replace(/\r\n/g, '\n');
  text = text.replace(/^\s*(?:\[?\s*)?(?:speaker|spk)[\s_-]*\d+\s*\]?\s*[:.\-–—]?\s*/gim, '');
  text = text.replace(/\b(?:speaker|spk)[\s_-]*\d+\b[:.\-–—]?\s*/gi, '');
  text = text.replace(/\[?\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b\]?/g, '');
  text = text.replace(
    /[^.!?\n]*(?:\b(?:record(?:ing|ed)?|filming|video journal|audio journal|voice memo|transcript|transcrib(?:e|ing)|speaker\s*\d+)\b)[^.!?\n]*[.!?]?/gi,
    ' ',
  );
  text = text.replace(/\b(?:um+|uh+|er+|ah+|hmm+|you know|i mean)\b[,.]?/gi, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?…]$/.test(text)) text += '.';
  return text;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

const CATEGORY_ALIASES: Record<string, string> = {
  nightmare: 'nightmare',
  horror: 'nightmare',
  terror: 'nightmare',
  fear: 'nightmare',
  scary: 'nightmare',
  lucid: 'lucid',
  awareness: 'lucid',
  recurring: 'recurring',
  repeating: 'recurring',
  loop: 'recurring',
  peaceful: 'peaceful',
  calm: 'peaceful',
  serene: 'peaceful',
  healing: 'peaceful',
  joy: 'peaceful',
  prophetic: 'prophetic',
  precognitive: 'prophetic',
  omen: 'prophetic',
  anxiety: 'anxiety',
  anxious: 'anxiety',
  stress: 'anxiety',
  worry: 'anxiety',
  panic: 'anxiety',
  adventure: 'adventure',
  flying: 'adventure',
  chase: 'adventure',
  journey: 'adventure',
  quest: 'adventure',
};

const EMOTION_ALIASES: Record<string, string> = {
  joy: 'joy',
  happy: 'joy',
  happiness: 'joy',
  positive: 'joy',
  fear: 'fear',
  fearful: 'fear',
  scared: 'fear',
  terrified: 'fear',
  sadness: 'sadness',
  sad: 'sadness',
  grief: 'sadness',
  anger: 'anger',
  angry: 'anger',
  rage: 'anger',
  surprise: 'surprise',
  surprised: 'surprise',
  calm: 'peace',
  peace: 'peace',
  peaceful: 'peace',
  excitement: 'excitement',
  excited: 'excitement',
  anxiety: 'anxiety',
  anxious: 'anxiety',
  worried: 'anxiety',
  wonder: 'wonder',
  awe: 'wonder',
};

function classifyCategory(raw: string, text = '', valence = 0): string {
  const key = raw.toLowerCase().trim();
  if ((CATEGORIES as readonly string[]).includes(key)) return key;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];
  const blob = text.toLowerCase();
  if (/\b(chase|monster|falling|attack|scream)\b/.test(blob)) return 'nightmare';
  if (/\b(lucid|i knew i was dreaming)\b/.test(blob)) return 'lucid';
  if (/\b(again|same dream|recurring)\b/.test(blob)) return 'recurring';
  if (/\b(future|warning|omen)\b/.test(blob)) return 'prophetic';
  if (/\b(late|exam|worried|can't find)\b/.test(blob)) return 'anxiety';
  if (/\b(flying|ocean|journey|explore)\b/.test(blob)) return 'adventure';
  if (valence <= -0.35) return 'anxiety';
  if (valence >= 0.35) return 'peaceful';
  return 'adventure';
}

function classifyEmotion(raw: string, text = '', valence = 0): string {
  const mapped = EMOTION_ALIASES[raw.toLowerCase().trim()];
  if (mapped) return mapped;
  const blob = text.toLowerCase();
  if (/\b(terrified|afraid|scared|panic)\b/.test(blob)) return 'fear';
  if (/\b(sad|crying|grief)\b/.test(blob)) return 'sadness';
  if (/\b(angry|furious|rage)\b/.test(blob)) return 'anger';
  if (/\b(wonder|awe|beautiful|magical)\b/.test(blob)) return 'wonder';
  if (/\b(joy|laugh|happy)\b/.test(blob)) return 'joy';
  if (/\b(anxious|worried|uneasy)\b/.test(blob)) return 'anxiety';
  if (valence <= -0.4) return 'fear';
  if (valence >= 0.4) return 'joy';
  return 'wonder';
}

function normalizeAnalysis(raw: Partial<DreamAnalysis>, sourceText = ''): DreamAnalysis {
  const valence = parseValence(raw.valence);
  const category = classifyCategory(String(raw.category || ''), sourceText, valence);
  const emotion = classifyEmotion(String(raw.emotion || ''), sourceText, valence);
  const themes = Array.isArray(raw.themes)
    ? raw.themes.map(String).filter(Boolean).slice(0, 6)
    : [];
  const symbols = Array.isArray(raw.symbols)
    ? raw.symbols.map(String).filter(Boolean).slice(0, 8)
    : [];
  const interpRaw = raw.interpretation;
  const interp =
    interpRaw && typeof interpRaw === 'object'
      ? interpRaw
      : { symbols: {}, meaning: typeof interpRaw === 'string' ? interpRaw : '', commonPattern: '' };
  const symbolMap: Record<string, string> = {};
  if (interp.symbols && typeof interp.symbols === 'object') {
    for (const [k, v] of Object.entries(interp.symbols)) {
      if (k && v) symbolMap[String(k)] = String(v);
    }
  }

  return {
    category,
    themes,
    emotion,
    symbols,
    narrative: stripTranscriptMeta(String(raw.narrative || '')).slice(0, 2500),
    nugget: stripTranscriptMeta(String(raw.nugget || '')).slice(0, 240),
    valence,
    interpretation: {
      symbols: symbolMap,
      meaning: String(interp.meaning || '').slice(0, 1500),
      commonPattern: String(interp.commonPattern || '').slice(0, 400),
    },
  };
}

function parseValence(value: unknown): number {
  if (typeof value === 'number') return clamp(value, -1, 1);
  const text = String(value || '').toLowerCase();
  if (text.includes('distress') || text.includes('neg')) return -0.4;
  if (text.includes('ease') || text.includes('pos')) return 0.4;
  if (text.includes('mix') || text.includes('ambiv')) return 0;
  const n = Number(value);
  return clamp(Number.isFinite(n) ? n : 0, -1, 1);
}

function parseModelJson(content: string, sourceText = ''): DreamAnalysis {
  const clean = content.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model returned no JSON object');
  let parsed: Partial<DreamAnalysis>;
  try {
    parsed = JSON.parse(clean.slice(start, end + 1)) as Partial<DreamAnalysis>;
  } catch {
    throw new Error('Model returned incomplete JSON');
  }
  const analysis = normalizeAnalysis(parsed, sourceText);
  if (!analysis.narrative && !analysis.nugget && analysis.themes.length === 0) {
    throw new Error('Model JSON missing usable analysis fields');
  }
  return analysis;
}

function sleepPromptBlock(sleep?: AnalyzeRequestBody['sleep']): string {
  if (!sleep || !sleep.durationMinutes) return '';
  const hours = Math.floor(sleep.durationMinutes / 60);
  const minutes = sleep.durationMinutes % 60;
  return `

Last night's sleep (${sleep.source || 'tracker'}): ${hours}h ${minutes}m. REM ${sleep.remMinutes ?? '?'}m, deep ${sleep.deepMinutes ?? '?'}m, light ${sleep.lightMinutes ?? '?'}m, awake ${sleep.awakeMinutes ?? '?'}m.${sleep.efficiency != null ? ` Efficiency ${sleep.efficiency}%.` : ''}${sleep.score != null ? ` Score ${sleep.score}.` : ''}
Use this as health context in interpretation.meaning (sleep debt, high REM/vividness, fragmentation). Do not invent extra numbers.`;
}

async function analyzeWithOpenRouter(
  text: string,
  model: string,
  sleep?: AnalyzeRequestBody['sleep'],
): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://everdream.app',
      'X-Title': 'EverDream',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return only compact valid JSON. No markdown.' },
        { role: 'user', content: ANALYSIS_PROMPT + text + sleepPromptBlock(sleep) },
      ],
      temperature: 0.4,
      max_tokens: 1800,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter ${model} ${response.status}: ${raw.slice(0, 280)}`);
  }

  const data = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string | null; reasoning?: string } }>;
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(data.error.message);

  const message = data.choices?.[0]?.message;
  const analysis = parseFromMessage(message, text);
  return { analysis, provider: 'openrouter', model };
}

function collectMessageParts(message?: {
  content?: string | null;
  reasoning?: string;
  reasoning_details?: Array<string | { text?: string }>;
}): string[] {
  const parts: string[] = [];
  if (message?.content) parts.push(message.content);
  if (message?.reasoning) parts.push(message.reasoning);
  for (const detail of message?.reasoning_details || []) {
    if (typeof detail === 'string') parts.push(detail);
    else if (detail?.text) parts.push(detail.text);
  }
  return parts;
}

function parseFromMessage(message?: {
  content?: string | null;
  reasoning?: string;
  reasoning_details?: Array<string | { text?: string }>;
}, sourceText = ''): DreamAnalysis {
  const parts = collectMessageParts(message);
  let lastError = 'Model returned no JSON object';
  for (const part of parts) {
    try {
      return parseModelJson(part, sourceText);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, headers);
  }

  try {
    let body: AnalyzeRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
    }

    const text = typeof body.text === 'string' ? stripTranscriptMeta(body.text) : '';
    if (text.length < 10) {
      return jsonResponse(
        {
          analysis: emptyAnalysis(),
          provider: 'none',
          note: 'Text too short for meaningful analysis',
        },
        200,
        headers,
      );
    }

    const safeText = text.slice(0, MAX_INPUT_LENGTH);
    const primary =
      Deno.env.get('OPENROUTER_ANALYSIS_MODEL') || DEFAULT_MODEL;
    const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
    const errors: string[] = [];

    for (const model of models) {
      try {
        console.log(`[analyze-dream] Trying ${model}...`);
        const result = await analyzeWithOpenRouter(safeText, model, body.sleep);
        console.log(`[analyze-dream] ${model} succeeded`);
        return jsonResponse(result, 200, headers);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[analyze-dream] ${model} failed: ${msg}`);
        errors.push(`${model}: ${msg}`);
      }
    }

    return jsonResponse(
      {
        analysis: emptyAnalysis(),
        provider: 'none',
        errors,
      },
      200,
      headers,
    );
  } catch (err) {
    console.error('[analyze-dream] Unexpected error:', err);
    return jsonResponse({ error: 'An unexpected error occurred.' }, 500, headers);
  }
});
