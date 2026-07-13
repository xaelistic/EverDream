/**
 * Supabase Edge Function: analyze-dream
 *
 * XAEL NVCNT Matrix Analysis - Multi-provider with automatic fallback.
 * Analyzes dreams using the Subconscious Data Structurer protocol.
 *
 * NVCNT Matrix Dimensions:
 * - Narrative: Coherence and story arc (anti-spam gatekeeper)
 * - Valence: Absolute emotional magnitude + polarity
 * - Complexity: (Avg Abstraction Level * Semantic Variance)
 *   - hierarchical_depth: 0.0 (concrete) to 1.0 (abstract/philosophical)
 *   - semantic_variance: 0.0 (same domain) to 1.0 (bridged domains)
 *   - conceptual_payload: Array of concepts with abstraction levels
 * - Novelty: Statistical rarity of words/scenarios
 * - Texture: Sensory/material/lighting density for 3D/VR rendering
 *
 * Provider Priority:
 * 1. OpenRouter owl-alpha (FREE - high-performance agentic model)
 * 2. Google Gemini 1.5 Flash (free tier - 60 req/min)
 * 3. OpenAI GPT-4o-mini (cheap - ~$0.15/1M tokens)
 * 4. NVIDIA Nemotron (open source, cost-effective)
 *
 * Environment variables (set via `supabase secrets set`):
 *   OPENROUTER_API_KEY — OpenRouter API key (required, free tier available)
 *   GEMINI_API_KEY — Google AI Studio key (free tier, optional backup)
 *   OPENAI_API_KEY — OpenAI API key ($5 free credit, optional backup)
 *   NVIDIA_API_KEY — NVIDIA API key for Nemotron models (optional backup)
 *
 * Request body:
 *   { text: string } — The dream text to analyze
 *
 * Response:
 *   { analysis: NVCNTMatrix, provider: string, model: string }
 *
 * Error responses:
 *   400 — Missing or invalid input
 *   502 — All providers failed
 *   500 — Unexpected server error
 */



// ── Types ────────────────────────────────────────────────────

interface ConceptualPayload {
  concept: string;
  abstraction_level: number; // 1-10 (1=physical object, 10=high-order philosophy)
  domain_cluster: string; // e.g., "physics", "emotion", "sociology"
}

interface ComplexityMetric {
  score: number; // 0.0 to 1.0
  hierarchical_depth: number; // 0.0 to 1.0
  semantic_variance: number; // 0.0 to 1.0
  conceptual_payload: ConceptualPayload[];
}

interface NarrativeMetric {
  score: number; // 0.0 to 1.0
  summary: string;
}

interface ValenceMetric {
  score: number; // 0.0 to 1.0 (absolute emotional magnitude)
  polarity: number; // -1.0 to 1.0
}

interface NoveltyMetric {
  score: number; // 0.0 to 1.0
  unique_identifiers: string[];
}

interface TextureMetric {
  score: number; // 0.0 to 1.0
  render_prompt: string;
}

interface NVCNTMatrix {
  narrative: NarrativeMetric;
  valence: ValenceMetric;
  complexity: ComplexityMetric;
  novelty: NoveltyMetric;
  texture: TextureMetric;
}

interface AnalyzeRequestBody {
  text?: string;
}

interface ProviderResult {
  analysis: NVCNTMatrix;
  provider: string;
  model: string;
}

// ── Constants ────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 10000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_ANALYSIS: NVCNTMatrix = {
  narrative: {
    score: 0.0,
    summary: '',
  },
  valence: {
    score: 0.0,
    polarity: 0.0,
  },
  complexity: {
    score: 0.0,
    hierarchical_depth: 0.0,
    semantic_variance: 0.0,
    conceptual_payload: [],
  },
  novelty: {
    score: 0.0,
    unique_identifiers: [],
  },
  texture: {
    score: 0.0,
    render_prompt: '',
  },
};

const XAEL_PROMPT = `You are the Subconscious Data Structurer for the DreamScape Protocol.
Analyze the dream transcript and extract the NVCNT Matrix.

CRITICAL DEFINITIONS:
- COMPLEXITY is NOT about big words or visual weirdness. It is about CONCEPTUAL HIERARCHY (abstract/philosophical depth) and SEMANTIC VARIANCE (how conceptually distant the ideas are from one another).
- NOVELTY is about statistical rarity and unusual linguistic choices.
- TEXTURE is purely about sensory, material, and spatial renderability.

Return a STRICT JSON object matching this schema:

{
  "narrative": {
    "score": 0.0 to 1.0,
    "summary": "string"
  },
  "valence": {
    "score": 0.0 to 1.0,
    "polarity": -1.0 to 1.0
  },
  "complexity": {
    "score": 0.0 to 1.0,
    "hierarchical_depth": 0.0 to 1.0,
    "semantic_variance": 0.0 to 1.0,
    "conceptual_payload": [
      {
        "concept": "string",
        "abstraction_level": 1 to 10,
        "domain_cluster": "string"
      }
    ]
  },
  "novelty": {
    "score": 0.0 to 1.0,
    "unique_identifiers": ["string"]
  },
  "texture": {
    "score": 0.0 to 1.0,
    "render_prompt": "string"
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

  // Use owl-alpha model from OpenRouter - FREE, high-performance for agentic workloads
  const model = 'openrouter/owl-alpha';

  try {
    console.log(`[analyze-dream][openrouter] Using model: ${model}`);
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
          content: XAEL_PROMPT.replace('{DREAM_TEXT}', text),
        }],
        max_tokens: 2000,
      }),
    });

    console.log(`[analyze-dream][openrouter] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[analyze-dream][openrouter] Response received, choices: ${data.choices?.length || 0}`);
    
    const content = data.choices?.[0]?.message?.content || '{}';
    const clean = content.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean) as NVCNTMatrix;

    return { analysis, provider: 'openrouter', model };
  } catch (err) {
    throw new Error(`OpenRouter failed: ${err instanceof Error ? err.message : String(err)}`);
  }
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
        parts: [{ text: XAEL_PROMPT.replace('{DREAM_TEXT}', text) }],
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
  const analysis = JSON.parse(clean) as NVCNTMatrix;

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
        content: XAEL_PROMPT.replace('{DREAM_TEXT}', text),
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
  const analysis = JSON.parse(clean) as NVCNTMatrix;

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
        content: XAEL_PROMPT.replace('{DREAM_TEXT}', text),
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
  const analysis = JSON.parse(clean) as NVCNTMatrix;

  return { analysis, provider: 'nemotron', model: 'nemotron-4-340b' };
}

// ── Main Handler ──────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
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
        analysis: FALLBACK_ANALYSIS,
        provider: 'none',
        note: 'Text too short for meaningful analysis',
      });
    }

    const safeText = trimmed.length > MAX_INPUT_LENGTH
      ? trimmed.substring(0, MAX_INPUT_LENGTH)
      : trimmed;

    // Try providers in order: free → cheap → expensive
    // OpenRouter (owl-alpha) is now first - it's FREE and high-performance
    const providers = [
      { name: 'openrouter', fn: () => analyzeWithOpenRouter(safeText) },
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
      analysis: FALLBACK_ANALYSIS,
      provider: 'none',
      errors,
    });

  } catch (err) {
    console.error('[analyze-dream] Unexpected error:', err);
    return errorResponse('An unexpected error occurred.', 500);
  }
});
