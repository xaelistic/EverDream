/**
 * Supabase Edge Function: transcribe-audio
 *
 * Proxies the HuggingFace Inference API for Whisper transcription.
 * Keeps the HF API key server-side and handles model-loading retries.
 *
 * Environment variables (set via `supabase secrets set`):
 *   HF_INFERENCE_API_KEY — HuggingFace API token (free at huggingface.co)
 *
 * Request body (binary):
 *   Raw audio bytes (any format Whisper accepts: wav, mp3, ogg, webm, etc.)
 *
 * Request headers:
 *   Content-Type: audio/wav (or appropriate audio MIME type)
 *   X-Language: en (optional language hint)
 *
 * Response:
 *   { text: string, language: string, source: "hf-whisper" }
 *
 * Error responses:
 *   400 — No audio data provided
 *   502 — Upstream HuggingFace error
 *   500 — Unexpected server error
 */

// ── Types ────────────────────────────────────────────────────

interface TranscriptionResult {
  text: string;
  language: string;
  source: 'hf-whisper';
}

// ── Constants ────────────────────────────────────────────────

const HF_WHISPER_URL =
  'https://api-inference.huggingface.co/models/openai/whisper-large-v3';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://everdream.n1g3.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-language',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Helpers ──────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse(
    {
      error: message,
      text: '',
      language: 'en',
      source: 'hf-whisper',
    },
    status,
  );
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405);
  }

  try {
    // Read audio bytes from request body
    const audioBytes = await req.arrayBuffer();

    if (!audioBytes || audioBytes.byteLength === 0) {
      return errorResponse('No audio data provided. Send audio as raw binary body.', 400);
    }

    if (audioBytes.byteLength > MAX_AUDIO_SIZE_BYTES) {
      return errorResponse(
        `Audio file too large (${(audioBytes.byteLength / 1024 / 1024).toFixed(1)} MB). Max: ${(MAX_AUDIO_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
        400,
      );
    }

    const language = req.headers.get('X-Language') || 'en';
    const contentType = req.headers.get('Content-Type') || 'audio/webm';
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (openRouterKey) {
      try {
        const bytes = new Uint8Array(audioBytes);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
        }
        const format = contentType.includes('wav')
          ? 'wav'
          : contentType.includes('mp4') || contentType.includes('m4a')
            ? 'm4a'
            : contentType.includes('mpeg') || contentType.includes('mp3')
              ? 'mp3'
              : contentType.includes('ogg')
                ? 'ogg'
                : 'webm';
        const orResponse = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://everdream.app',
            'X-Title': 'EverDream',
          },
          body: JSON.stringify({
            model: Deno.env.get('OPENROUTER_TRANSCRIBE_MODEL') || 'openai/whisper-large-v3',
            language,
            input_audio: {
              data: btoa(binary),
              format,
            },
          }),
        });
        const raw = await orResponse.text();
        if (orResponse.ok) {
          const parsed = JSON.parse(raw) as { text?: string };
          const text = (parsed.text || '').trim();
          if (text) {
            return jsonResponse({ text, language, source: 'openrouter-whisper' });
          }
        }
        console.warn('[transcribe-audio] OpenRouter failed:', orResponse.status, raw.slice(0, 240));
      } catch (err) {
        console.warn('[transcribe-audio] OpenRouter error:', err);
      }
    }

    const hfApiKey = Deno.env.get('HF_INFERENCE_API_KEY');
    const hfHeaders: Record<string, string> = {};
    if (hfApiKey) hfHeaders['Authorization'] = `Bearer ${hfApiKey}`;

    let lastError = '';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[transcribe-audio] Retry attempt ${attempt}/${MAX_RETRIES} after model load wait`);
        await delay(RETRY_DELAY_MS);
      }

      const hfResponse = await fetch(HF_WHISPER_URL, {
        method: 'POST',
        headers: hfHeaders,
        body: audioBytes,
      });

      if (hfResponse.ok) {
        const result = await hfResponse.json();
        const text = (result.text || '').trim();
        return jsonResponse({
          text,
          language: result.language || language,
          source: 'hf-whisper',
        });
      }

      const errorText = await hfResponse.text();
      if (hfResponse.status === 503 || errorText.includes('loading')) {
        lastError = errorText;
        continue;
      }
      console.error(`[transcribe-audio] HF error ${hfResponse.status}:`, errorText);
      return errorResponse(
        `Transcription service returned ${hfResponse.status}. Please try again.`,
        502,
      );
    }

    console.error('[transcribe-audio] Model loading timeout after retries', lastError);
    return errorResponse(
      'Transcription model is still loading. Please try again in a moment.',
      502,
    );
  } catch (err) {
    console.error('[transcribe-audio] Unexpected error:', err);
    return errorResponse('An unexpected error occurred during transcription.', 500);
  }
});
