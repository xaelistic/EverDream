/**
 * Supabase Edge Function: analyze-dream
 *
 * Multi-provider dream analysis with automatic fallback.
 * Tries providers in order of cost (free first, paid last).
 *
 * Provider Priority:
 * 1. OpenRouter (owl-alpha model)
 * 2. Pollinations Text API (free, unlimited)
 * 3. Google Gemini 1.5 Flash (free tier)
 * 4. OpenAI GPT-4o-mini (cheap)
 * 5. NVIDIA Nemotron (open source, cost-effective)
 *
 * Environment variables (set via `supabase secrets set`):
 *   OPENROUTER_API_KEY — OpenRouter API key (free tier available)
 *   GEMINI_API_KEY — Google AI Studio key (free tier)
 *   OPENAI_API_KEY — OpenAI API key ($5 free credit)
 *   NVIDIA_API_KEY — NVIDIA API key for Nemotron models
 *
 * Request body:
 *   { text: string } — The dream text to analyze
 *
 * Response:
 *   { analysis: DreamAnalysis, provider: string, model: string }
 *
 * Error responses:
 *   400 — Missing or invalid input
 *   502 — All providers failed
 *   500 — Unexpected server error
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ── Types ────────────────────────────────────────────────────

interface DreamAnalysis {
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  valence?: number;
  interpretation: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
}

interface AnalyzeRequestBody {
  text?: string;
}

interface ProviderResult {
  analysis: DreamAnalysis;
  provider: string;
  model: string;
}

// ── Constants ────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 10000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_ANALYSIS: DreamAnalysis = {
  category: 'uncategorized',
  themes: ['dream', 'experience'],
  emotion: 'neutral',
  symbols: [],
  narrative: '',
  nugget: '',
  valence: 0,
  interpretation: {
    symbols: {},
    meaning: 'Analysis unavailable — all providers failed',
    commonPattern: '',
  },
};

const ANALYSIS_PROMPT = `Analyze this dream and provide a detailed response in JSON format:
{
  "category": "nightmare/lucid/recurring/peaceful/prophetic/anxiety/adventure",
  "themes": ["theme1", "theme2", "theme3"],
  "emotion": "primary emotional tone",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "narrative": "expanded 200-word vivid narrative in first person present tense",
  "nugget": "one captivating sentence (15-20 words)",
  "valence": -1.0 to 1.0 (negative to positive emotional tone, single number),
  "interpretation": {
    "symbols": {
      "symbol1": "what it represents",
      "symbol2": "what it represents"
    },
    "meaning": "psychological insight about what this dream reveals",
    "commonPattern": "when people typically have dreams like this"
  }
}

Dream: {DREAM_TEXT}

Respond ONLY with valid JSON, no markdown.`;

// ── Helpers ──────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message, analysis: FALLBACK_ANALYSIS, provider: 'none' }, status);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Provider: OpenRouter (Free models) ───────────────────────

async function analyzeWithOpenRouter(text: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  // Use owl-alpha model from OpenRouter
  const model = 'openrouter/owl-alpha';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://everdream.app',
        'X-Title': 'EverDream',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text),
        }],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const clean = content.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean) as DreamAnalysis;

    return { analysis, provider: 'openrouter', model };
  } catch (err) {
    throw new Error(`OpenRouter failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Provider: Pollinations Text (Free, no key) ───────────────

async function analyzeWithPollinations(text: string): Promise<ProviderResult> {
  const prompt = encodeURIComponent(
    ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text) + ' Respond ONLY with valid JSON.'
  );
  const url = `https://text.pollinations.ai/${prompt}?model=openai&seed=${Date.now() % 1000000}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations returned ${response.status}`);
  }

  const content = await response.text();
  const clean = content.replace(/```json|```/g, '').trim();
  const analysis = JSON.parse(clean) as DreamAnalysis;

  return { analysis, provider: 'pollinations', model: 'text' };
}

// ── Provider: Google Gemini (Free tier) ──────────────────────

async function analyzeWithGemini(text: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text) }],
      }],
      generationConfig: { maxOutputTokens: 2000 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = content.replace(/```json|```/g, '').trim();
  const analysis = JSON.parse(clean) as DreamAnalysis;

  return { analysis, provider: 'gemini', model: 'gemini-1.5-flash' };
}

// ── Provider: OpenAI GPT-4o-mini (Cheap) ─────────────────────

async function analyzeWithOpenAI(text: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text),
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const clean = content.replace(/```json|```/g, '').trim();
  const analysis = JSON.parse(clean) as DreamAnalysis;

  return { analysis, provider: 'openai', model: 'gpt-4o-mini' };
}

// ── Provider: NVIDIA Nemotron (Open Source, Cost-Effective) ──────

async function analyzeWithNemotron(text: string): Promise<ProviderResult> {
  const apiKey = Deno.env.get('NVIDIA_API_KEY');
  if (!apiKey) throw new Error('NVIDIA_API_KEY not set');

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-4-340b-instruct',
      messages: [{
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{DREAM_TEXT}', text),
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Nemotron returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const clean = content.replace(/```json|```/g, '').trim();
  const analysis = JSON.parse(clean) as DreamAnalysis;

  return { analysis, provider: 'nemotron', model: 'nemotron-4-340b' };
}

// ── Main Handler ──────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    let body: AnalyzeRequestBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const { text } = body;
    if (!text || typeof text !== 'string') {
      return errorResponse('Missing or invalid "text" field.', 400);
    }

    const trimmed = text.trim();
    if (trimmed.length < 10) {
      return jsonResponse({
        analysis: { ...FALLBACK_ANALYSIS, narrative: trimmed, nugget: trimmed.substring(0, 100) },
        provider: 'none',
        note: 'Text too short for meaningful analysis',
      });
    }

    const safeText = trimmed.length > MAX_INPUT_LENGTH
      ? trimmed.substring(0, MAX_INPUT_LENGTH)
      : trimmed;

    // Try providers in order: free → cheap → expensive
    const providers = [
      { name: 'openrouter', fn: () => analyzeWithOpenRouter(safeText) },
      { name: 'pollinations', fn: () => analyzeWithPollinations(safeText) },
      { name: 'gemini', fn: () => analyzeWithGemini(safeText) },
      { name: 'openai', fn: () => analyzeWithOpenAI(safeText) },
      { name: 'nemotron', fn: () => analyzeWithNemotron(safeText) },
    ];

    const errors: string[] = [];

    for (const provider of providers) {
      try {
        console.log(`[analyze-dream] Trying ${provider.name}...`);
        const result = await provider.fn();
        console.log(`[analyze-dream] ${provider.name} succeeded`);
        return jsonResponse(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[analyze-dream] ${provider.name} failed: ${msg}`);
        errors.push(`${provider.name}: ${msg}`);
      }
    }

    // All providers failed
    console.error('[analyze-dream] All providers failed:', errors);
    return jsonResponse({
      analysis: { ...FALLBACK_ANALYSIS, narrative: safeText, nugget: safeText.substring(0, 100) },
      provider: 'none',
      errors,
    });

  } catch (err) {
    console.error('[analyze-dream] Unexpected error:', err);
    return errorResponse('An unexpected error occurred.', 500);
  }
});
