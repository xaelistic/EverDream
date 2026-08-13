/**
 * Supabase Edge Function: generate-image v4
 *
 * Multi-provider image generation with OpenRouter as the primary path
 * (SPEC-14). Returns JSON by default so the client can show source + cost.
 *
 * Provider priority:
 *   1. OpenRouter (primary — Flux / Gemini image models)
 *   2. Fal AI (paid fallback)
 *   3. Hugging Face Inference (free-tier fallback)
 *   4. Pollinations (emergency / loyalty fallback only)
 *
 * Secrets (`supabase secrets set`):
 *   OPENROUTER_API_KEY              required for the primary path
 *   OPENROUTER_IMAGE_MODEL          optional, default black-forest-labs/flux.2-klein-4b
 *   OPENROUTER_IMAGE_MODEL_QUALITY  optional quality-tier model
 *   FAL_AI_KEY                      optional
 *   HF_INFERENCE_API_KEY            optional
 *
 * Request body:
 *   {
 *     prompt: string,
 *     style?: 'dreamlike' | 'realistic' | 'artistic' | 'minimal' | 'cinematic',
 *     width?: number,
 *     height?: number,
 *     format?: 'json' | 'binary',
 *     quality?: 'cheap' | 'quality',
 *     referenceImage?: string   // https or data URL
 *   }
 *
 * JSON success:
 *   { imageUrl, source, model, cost_usd, prompt, width, height }
 */

interface GenerateImageRequest {
  prompt?: string;
  style?: string;
  width?: number;
  height?: number;
  format?: 'binary' | 'json';
  quality?: 'cheap' | 'quality';
  referenceImage?: string;
  model?: string;
}

interface GenerationResult {
  imageUrl: string;
  contentType: string;
  bytes?: Uint8Array;
  source: string;
  model?: string;
  cost_usd?: number;
  prompt: string;
  width: number;
  height: number;
}

const HF_API_URL =
  'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';
const FAL_API_URL = 'https://fal.ai/api/fal-ai/fast-sdxl';
const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

// Cheapest production-quality OpenRouter image model as of 2026-08-13.
// Do not silently upgrade this — personalization happens in the prompt, not the model.
const DEFAULT_OPENROUTER_MODEL = 'black-forest-labs/flux.2-klein-4b';
const DEFAULT_OPENROUTER_QUALITY_MODEL = 'black-forest-labs/flux.2-flex';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

const STYLE_MAP: Record<string, string> = {
  dreamlike: 'surreal, ethereal, soft lighting, dreamlike atmosphere',
  realistic: 'photorealistic, detailed, natural lighting',
  artistic: 'oil painting style, impressionistic, vibrant colors',
  minimal: 'minimalist, clean lines, simple composition',
  cinematic: 'cinematic lighting, dramatic, wide angle, film grain',
};

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const MAX_PROMPT_LENGTH = 2000;
const PROVIDER_TIMEOUT_MS = 120_000;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : 'https://everdream.n1g3.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function buildEnhancedPrompt(prompt: string, style: string): string {
  const styleDesc = STYLE_MAP[style] || STYLE_MAP.dreamlike;
  return `${prompt.trim()}, ${styleDesc}, 4k, high quality`;
}

function jsonResponse(
  data: unknown,
  status: number,
  extraHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function errorResponse(
  message: string,
  status: number,
  extraHeaders: Record<string, string>,
): Response {
  return jsonResponse({ error: message }, status, extraHeaders);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectRatioFromSize(width: number, height: number): string {
  const known = new Set([
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '3:2',
    '2:3',
    '4:5',
    '5:4',
    '2:1',
    '1:2',
  ]);
  const d = gcd(width, height);
  const key = `${width / d}:${height / d}`;
  if (known.has(key)) return key;
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.08) return '1:1';
  if (ratio > 1.6) return '16:9';
  if (ratio < 0.65) return '9:16';
  return ratio > 1 ? '4:3' : '3:4';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function toDataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${bytesToBase64(bytes)}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function successResponse(
  result: GenerationResult,
  format: 'json' | 'binary',
  extraHeaders: Record<string, string>,
): Response {
  const meta = {
    'X-Image-Source': result.source,
    'X-Image-Model': result.model || '',
    'X-Image-Cost': result.cost_usd != null ? String(result.cost_usd) : '',
    'Cache-Control': 'public, max-age=86400',
  };

  if (format === 'binary' && result.bytes) {
    return new Response(result.bytes, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        ...meta,
        ...extraHeaders,
      },
    });
  }

  return jsonResponse(
    {
      imageUrl: result.imageUrl,
      source: result.source,
      model: result.model || null,
      cost_usd: result.cost_usd ?? null,
      prompt: result.prompt,
      width: result.width,
      height: result.height,
    },
    200,
    extraHeaders,
  );
}

function resolveOpenRouterModel(quality?: string, requested?: string): string {
  const cheap =
    Deno.env.get('OPENROUTER_IMAGE_MODEL') || DEFAULT_OPENROUTER_MODEL;
  const premium =
    Deno.env.get('OPENROUTER_IMAGE_MODEL_QUALITY') ||
    DEFAULT_OPENROUTER_QUALITY_MODEL;

  // Only allow an explicit override if it looks like an OpenRouter slug.
  if (requested && /^[\w.-]+\/[\w.-]+$/.test(requested)) {
    return requested;
  }
  return quality === 'quality' ? premium : cheap;
}

function parseReference(referenceImage?: string) {
  if (!referenceImage || typeof referenceImage !== 'string') return undefined;
  const trimmed = referenceImage.trim();
  if (!trimmed) return undefined;
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('data:image/')
  ) {
    return undefined;
  }
  return [
    {
      type: 'image_url',
      image_url: { url: trimmed },
    },
  ];
}

// ── Provider: OpenRouter (primary) ───────────────────────────

async function generateWithOpenRouter(
  prompt: string,
  style: string,
  width: number,
  height: number,
  quality?: string,
  requestedModel?: string,
  referenceImage?: string,
): Promise<GenerationResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const model = resolveOpenRouterModel(quality, requestedModel);
  const enhancedPrompt = buildEnhancedPrompt(prompt, style);
  const aspectRatio = aspectRatioFromSize(width, height);
  const inputReferences = parseReference(referenceImage);

  const body: Record<string, unknown> = {
    model,
    prompt: enhancedPrompt,
    n: 1,
    aspect_ratio: aspectRatio,
    output_format: 'png',
  };
  if (inputReferences) body.input_references = inputReferences;

  console.log(
    `[generate-image] OpenRouter model=${model} aspect=${aspectRatio} refs=${inputReferences ? 1 : 0}`,
  );

  const response = await fetchWithTimeout(OPENROUTER_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://everdream.app',
      'X-Title': 'EverDream',
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `OpenRouter failed: ${response.status} - ${raw.slice(0, 400)}`,
    );
  }

  let data: {
    data?: Array<{
      b64_json?: string;
      url?: string;
      media_type?: string;
    }>;
    usage?: { cost?: number };
    error?: { message?: string };
  };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('OpenRouter returned non-JSON response');
  }

  if (data.error?.message) {
    throw new Error(`OpenRouter error: ${data.error.message}`);
  }

  const image = data.data?.[0];
  if (!image) throw new Error('OpenRouter returned no image');

  const contentType = image.media_type || 'image/png';
  const cost = typeof data.usage?.cost === 'number' ? data.usage.cost : undefined;

  if (image.b64_json) {
    const imageUrl = `data:${contentType};base64,${image.b64_json}`;
    let bytes: Uint8Array | undefined;
    try {
      const binary = atob(image.b64_json);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      bytes = undefined;
    }

    console.log(
      `[generate-image] openrouter ${model} ~$${cost ?? '?'} (${contentType})`,
    );

    return {
      imageUrl,
      contentType,
      bytes,
      source: 'openrouter',
      model,
      cost_usd: cost,
      prompt: enhancedPrompt,
      width,
      height,
    };
  }

  if (image.url) {
    const fetched = await fetchWithTimeout(image.url, { method: 'GET' });
    if (!fetched.ok) {
      throw new Error(`Failed to fetch OpenRouter image URL: ${fetched.status}`);
    }
    const buf = new Uint8Array(await fetched.arrayBuffer());
    const type = fetched.headers.get('content-type') || contentType;
    return {
      imageUrl: toDataUrl(buf, type),
      contentType: type,
      bytes: buf,
      source: 'openrouter',
      model,
      cost_usd: cost,
      prompt: enhancedPrompt,
      width,
      height,
    };
  }

  throw new Error('OpenRouter image missing b64_json and url');
}

// ── Provider: Hugging Face (free fallback) ───────────────────

async function generateWithHuggingFace(
  prompt: string,
  style: string,
  width: number,
  height: number,
): Promise<GenerationResult> {
  const apiKey = Deno.env.get('HF_INFERENCE_API_KEY');
  if (!apiKey) throw new Error('HF_INFERENCE_API_KEY not set');

  const enhancedPrompt = buildEnhancedPrompt(prompt, style);

  const response = await fetchWithTimeout(HF_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly, watermark, text',
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width,
        height,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 503) {
      throw new Error('Hugging Face model is loading, please try again');
    }
    throw new Error(`Hugging Face failed: ${response.status} - ${errorText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return {
    imageUrl: toDataUrl(bytes, contentType),
    contentType,
    bytes,
    source: 'huggingface',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    prompt: enhancedPrompt,
    width,
    height,
  };
}

// ── Provider: Fal AI (paid fallback) ─────────────────────────

async function generateWithFalAI(
  prompt: string,
  style: string,
  width: number,
  height: number,
): Promise<GenerationResult> {
  const apiKey = Deno.env.get('FAL_AI_KEY');
  if (!apiKey) throw new Error('FAL_AI_KEY not set');

  const enhancedPrompt = buildEnhancedPrompt(prompt, style);

  const response = await fetchWithTimeout(FAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      image_size: { width, height },
      num_inference_steps: 25,
      guidance_scale: 7.5,
      negative_prompt: 'blurry, low quality, distorted, ugly, watermark',
    }),
  });

  if (!response.ok) {
    throw new Error(`Fal AI returned ${response.status}`);
  }

  const data = await response.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error('Fal AI returned no image URL');

  const imageResponse = await fetchWithTimeout(imageUrl, { method: 'GET' });
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch Fal AI image: ${imageResponse.status}`);
  }

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

  return {
    imageUrl: toDataUrl(bytes, contentType),
    contentType,
    bytes,
    source: 'fal',
    model: 'fal-ai/fast-sdxl',
    prompt: enhancedPrompt,
    width,
    height,
  };
}

// ── Provider: Pollinations (emergency only) ──────────────────

async function generateWithPollinations(
  prompt: string,
  style: string,
  width: number,
  height: number,
): Promise<GenerationResult> {
  const enhancedPrompt = buildEnhancedPrompt(prompt, style);
  const url =
    `${POLLINATIONS_BASE}/${encodeURIComponent(enhancedPrompt)}` +
    `?width=${width}&height=${height}&nologo=true&safe=true&seed=${Date.now()}`;

  console.warn('[generate-image] Using Pollinations loyalty fallback');

  const response = await fetchWithTimeout(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Pollinations failed: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return {
    imageUrl: toDataUrl(bytes, contentType),
    contentType,
    bytes,
    source: 'pollinations',
    model: 'pollinations-flux',
    prompt: enhancedPrompt,
    width,
    height,
  };
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405, headers);
  }

  try {
    let body: GenerateImageRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON body', 400, headers);
    }

    const {
      prompt,
      style = 'dreamlike',
      width = DEFAULT_WIDTH,
      height = DEFAULT_HEIGHT,
      format = 'json',
      quality,
      referenceImage,
      model: requestedModel,
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return errorResponse(
        'Missing or invalid "prompt" field. Must be a non-empty string.',
        400,
        headers,
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return errorResponse(
        `Prompt too long. Maximum ${MAX_PROMPT_LENGTH} characters.`,
        400,
        headers,
      );
    }

    const w = Math.min(Math.max(Number(width) || DEFAULT_WIDTH, 256), 2048);
    const h = Math.min(Math.max(Number(height) || DEFAULT_HEIGHT, 256), 2048);
    const outputFormat = format === 'binary' ? 'binary' : 'json';
    const errors: string[] = [];

    // 1. OpenRouter — primary
    try {
      console.log('[generate-image] Trying OpenRouter...');
      const result = await generateWithOpenRouter(
        prompt,
        style,
        w,
        h,
        quality,
        requestedModel,
        referenceImage,
      );
      console.log(
        `[generate-image] OpenRouter succeeded model=${result.model} cost=${result.cost_usd ?? 'n/a'}`,
      );
      return successResponse(result, outputFormat, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] OpenRouter failed:', msg);
      errors.push(`openrouter: ${msg}`);
    }

    // 2. Fal AI
    try {
      console.log('[generate-image] Trying Fal AI...');
      const result = await generateWithFalAI(prompt, style, w, h);
      console.log('[generate-image] Fal AI succeeded');
      return successResponse(result, outputFormat, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] Fal AI failed:', msg);
      errors.push(`fal-ai: ${msg}`);
    }

    // 3. Hugging Face (free) + one retry if the model is loading
    try {
      console.log('[generate-image] Trying Hugging Face...');
      const result = await generateWithHuggingFace(prompt, style, w, h);
      console.log('[generate-image] Hugging Face succeeded');
      return successResponse(result, outputFormat, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] Hugging Face failed:', msg);
      errors.push(`huggingface: ${msg}`);

      if (msg.includes('loading')) {
        console.log('[generate-image] Waiting for HF model to load...');
        await delay(5000);
        try {
          const retryResult = await generateWithHuggingFace(prompt, style, w, h);
          console.log('[generate-image] Hugging Face succeeded on retry');
          return successResponse(retryResult, outputFormat, headers);
        } catch (retryErr) {
          const retryMsg =
            retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.warn('[generate-image] Hugging Face retry failed:', retryMsg);
          errors.push(`huggingface-retry: ${retryMsg}`);
        }
      }
    }

    // 4. Pollinations — emergency / loyalty only
    try {
      const result = await generateWithPollinations(prompt, style, w, h);
      console.log('[generate-image] Pollinations loyalty fallback succeeded');
      return successResponse(result, outputFormat, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-image] Pollinations failed:', msg);
      errors.push(`pollinations: ${msg}`);
    }

    console.error('[generate-image] All providers failed:', errors);
    return errorResponse(
      'Image generation is currently unavailable. Please try again later.',
      502,
      headers,
    );
  } catch (err) {
    console.error('[generate-image] Unexpected error:', err);
    return errorResponse(
      'An unexpected error occurred during image generation.',
      500,
      headers,
    );
  }
});
