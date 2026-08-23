/**
 * Supabase Edge Function: transcribe-audio
 *
 * Provider order:
 *   1. Groq Whisper (GROQ_API_KEY) — fast, reliable
 *   2. OpenRouter OpenAI-compatible transcriptions (OPENROUTER_API_KEY)
 *   3. Hugging Face Inference Providers router (HF_INFERENCE_API_KEY)
 *   4. Legacy api-inference.huggingface.co (same key)
 *
 * Request body: raw audio bytes
 * Headers: Content-Type, X-Language, X-Filename
 */

interface TranscriptionResult {
  text: string;
  language: string;
  source: string;
}

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

const HF_ROUTER_URLS = [
  'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3',
  'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo',
];
const HF_LEGACY_URL = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2500;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

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

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-language, x-filename',
    Vary: 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function errorResponse(
  message: string,
  status: number,
  extra: Record<string, string>,
): Response {
  return jsonResponse(
    { error: message, text: '', language: 'en', source: 'none' },
    status,
    extra,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extensionFor(contentType: string, fileName?: string): string {
  const name = (fileName || '').toLowerCase();
  if (name.includes('.')) {
    const ext = name.split('.').pop();
    if (ext && ext.length <= 5) return ext;
  }
  const type = contentType.toLowerCase();
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg') || type.includes('opus')) return 'ogg';
  if (type.includes('flac')) return 'flac';
  if (type.includes('webm')) return 'webm';
  return 'webm';
}

function parseTranscriptBody(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      text?: string;
      transcript?: string;
      generated_text?: string;
    };
    return stripTranscriptMeta(parsed.text || parsed.transcript || parsed.generated_text || '');
  } catch {
    return stripTranscriptMeta(raw);
  }
}

async function transcribeOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  audioBytes: ArrayBuffer,
  contentType: string,
  language: string,
  fileName: string | undefined,
  extraHeaders: Record<string, string> = {},
): Promise<string | null> {
  const ext = extensionFor(contentType, fileName);
  const form = new FormData();
  form.append(
    'file',
    new Blob([audioBytes], { type: contentType || `audio/${ext}` }),
    fileName || `audio.${ext}`,
  );
  form.append('model', model);
  if (language) form.append('language', language);
  form.append('response_format', 'json');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: form,
  });
  const raw = await response.text();
  if (!response.ok) {
    console.warn('[transcribe-audio]', endpoint, response.status, raw.slice(0, 240));
    return null;
  }
  const text = parseTranscriptBody(raw);
  return text || null;
}

async function transcribeHuggingFace(
  url: string,
  apiKey: string | undefined,
  audioBytes: ArrayBuffer,
  contentType: string,
): Promise<{ text: string | null; retryable: boolean; error: string }> {
  const headers: Record<string, string> = {
    'Content-Type': contentType || 'audio/webm',
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: audioBytes,
  });
  const raw = await response.text();
  if (response.ok) {
    return { text: parseTranscriptBody(raw) || null, retryable: false, error: '' };
  }
  const retryable = response.status === 503 || raw.includes('loading') || response.status === 429;
  console.warn('[transcribe-audio] HF', url, response.status, raw.slice(0, 240));
  return { text: null, retryable, error: raw.slice(0, 240) };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed. Use POST.', 405, cors);
  }

  try {
    const audioBytes = await req.arrayBuffer();

    if (!audioBytes || audioBytes.byteLength === 0) {
      return errorResponse('No audio data provided. Send audio as raw binary body.', 400, cors);
    }

    if (audioBytes.byteLength > MAX_AUDIO_SIZE_BYTES) {
      return errorResponse(
        `Audio file too large (${(audioBytes.byteLength / 1024 / 1024).toFixed(1)} MB). Max: ${(MAX_AUDIO_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
        400,
        cors,
      );
    }

    const language = req.headers.get('X-Language') || 'en';
    const contentType = req.headers.get('Content-Type') || 'audio/webm';
    const fileName = req.headers.get('X-Filename') || undefined;
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const hfApiKey = Deno.env.get('HF_INFERENCE_API_KEY');
    const lastErrors: string[] = [];

    if (groqKey) {
      try {
        const text = await transcribeOpenAICompatible(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          groqKey,
          Deno.env.get('GROQ_TRANSCRIBE_MODEL') || 'whisper-large-v3',
          audioBytes,
          contentType,
          language,
          fileName,
        );
        if (text) {
          return jsonResponse({ text, language, source: 'groq-whisper' } satisfies TranscriptionResult, 200, cors);
        }
        lastErrors.push('groq: empty');
      } catch (err) {
        lastErrors.push(`groq: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (openRouterKey) {
      const models = [
        Deno.env.get('OPENROUTER_TRANSCRIBE_MODEL') || 'openai/whisper-large-v3',
        'groq/whisper-large-v3',
      ];
      for (const model of models) {
        try {
          const text = await transcribeOpenAICompatible(
            'https://openrouter.ai/api/v1/audio/transcriptions',
            openRouterKey,
            model,
            audioBytes,
            contentType,
            language,
            fileName,
            {
              'HTTP-Referer': 'https://everdream.app',
              'X-Title': 'EverDream',
            },
          );
          if (text) {
            return jsonResponse(
              { text, language, source: 'openrouter-whisper' } satisfies TranscriptionResult,
              200,
              cors,
            );
          }
        } catch (err) {
          lastErrors.push(`openrouter ${model}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    const urls = [...HF_ROUTER_URLS, HF_LEGACY_URL];
    for (const url of urls) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) await delay(RETRY_DELAY_MS * attempt);
        try {
          const result = await transcribeHuggingFace(url, hfApiKey, audioBytes, contentType);
          if (result.text) {
            return jsonResponse(
              { text: result.text, language, source: 'hf-whisper' } satisfies TranscriptionResult,
              200,
              cors,
            );
          }
          lastErrors.push(`hf ${url}: ${result.error || 'empty'}`);
          if (!result.retryable) break;
        } catch (err) {
          lastErrors.push(`hf ${url}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    console.error('[transcribe-audio] all providers failed', lastErrors.slice(0, 6));
    return errorResponse(
      'Transcription service is unavailable. Please try again in a moment.',
      502,
      cors,
    );
  } catch (err) {
    console.error('[transcribe-audio] Unexpected error:', err);
    return errorResponse('An unexpected error occurred during transcription.', 500, cors);
  }
});
