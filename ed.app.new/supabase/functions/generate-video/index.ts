/**
 * generate-video
 *
 * Image-to-video clip of a dream using OpenRouter's async video API.
 * First/last frames come from the storyboard so the clip plays through the telling
 * instead of Ken-Burns orbiting a still.
 *
 * Default model: bytedance/seedance-2.0-fast (strong I2V, cheap).
 * Override: OPENROUTER_VIDEO_MODEL
 */

const OPENROUTER_VIDEOS = 'https://openrouter.ai/api/v1/videos';
const DEFAULT_MODEL = 'bytedance/seedance-2.0-fast';
const FALLBACK_MODEL = 'alibaba/wan-2.6';
const POLL_MS = 5000;
const MAX_WAIT_MS = 110_000;

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

const MODEL_ALLOWLIST = [
  'bytedance/seedance-2.0-fast',
  'bytedance/seedance-2.0',
  'alibaba/wan-2.6',
  'alibaba/wan-2.7',
  'google/veo-3.1-lite',
];

interface GenerateVideoRequest {
  prompt?: string;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  jobId?: string;
  pollingUrl?: string;
  model?: string;
  dreamId?: string;
  qualityScore?: number;
  routedReason?: string;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function authHeaders(): Record<string, string> {
  const key = Deno.env.get('OPENROUTER_API_KEY') || '';
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://everdream.app',
    'X-Title': 'EverDream',
  };
}

function isPublicUrl(url?: string): boolean {
  return Boolean(url && /^https:\/\//i.test(url) && !url.startsWith('data:'));
}

function clipPrompt(raw: string): string {
  const beat = raw.replace(/\s+/g, ' ').trim().slice(0, 700);
  return [
    'Short dream clip, one continuous lived moment in first person present.',
    beat,
    'The scene is alive: people and objects move, light shifts, fabric and weather respond.',
    'Smooth cinematic motion, slightly surreal, grounded physics, 24fps film look.',
    'Do not treat the input as a photograph with a drifting camera.',
    'Do not orbit, Ken Burns, zoom-only, or freeze the subject.',
    'Keep identity, wardrobe, and setting consistent with the first frame.',
  ].join(' ');
}

interface JobStatus {
  id?: string;
  polling_url?: string;
  status?: string;
  unsigned_urls?: string[];
  error?: string;
  usage?: { cost?: number };
  model?: string;
}

async function pollJob(pollingUrl: string, remainingMs: number): Promise<JobStatus> {
  const deadline = Date.now() + remainingMs;
  let last: JobStatus = { status: 'pending' };
  while (Date.now() < deadline) {
    const response = await fetch(pollingUrl, { headers: authHeaders() });
    last = await response.json().catch(() => ({})) as JobStatus;
    if (last.status === 'completed' || last.status === 'failed' || last.status === 'cancelled') {
      return last;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return last;
}

async function persistVideo(bytes: Uint8Array, contentType: string): Promise<string | null> {
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const publicBase = (
    Deno.env.get('SUPABASE_PUBLIC_URL') ||
    Deno.env.get('SERVICE_URL_SUPABASEKONG') ||
    'https://supabase.n1g3.com'
  ).replace(/\/$/, '');
  if (!supabaseUrl || !serviceKey) return null;
  const path = `generated/clip-${crypto.randomUUID()}.mp4`;
  const upload = await fetch(`${supabaseUrl}/storage/v1/object/public-assets/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': contentType || 'video/mp4',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!upload.ok) {
    console.warn('[generate-video] storage upload failed', upload.status);
    return null;
  }
  return `${publicBase}/storage/v1/object/public/public-assets/${path}`;
}

async function downloadClip(url: string): Promise<{ bytes: Uint8Array; type: string; storedUrl: string }> {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`Video download failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get('content-type') || 'video/mp4';
  const stored = await persistVideo(bytes, type);
  return { bytes, type, storedUrl: stored || url };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, headers);
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'OPENROUTER_API_KEY is not set' }, 500, headers);

  let body: GenerateVideoRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
  }

  try {
    if (body.jobId || body.pollingUrl) {
      const pollingUrl = body.pollingUrl || `${OPENROUTER_VIDEOS}/${body.jobId}`;
      const status = await pollJob(pollingUrl, MAX_WAIT_MS);
      if (status.status === 'completed' && status.unsigned_urls?.[0]) {
        const clip = await downloadClip(status.unsigned_urls[0]);
        return jsonResponse({
          status: 'completed',
          videoUrl: clip.storedUrl,
          source: 'openrouter',
          model: status.model || Deno.env.get('OPENROUTER_VIDEO_MODEL') || DEFAULT_MODEL,
          cost_usd: status.usage?.cost ?? null,
          jobId: status.id || body.jobId,
        }, 200, headers);
      }
      if (status.status === 'failed') {
        return jsonResponse({ status: 'failed', error: status.error || 'Video generation failed' }, 502, headers);
      }
      return jsonResponse({
        status: status.status || 'processing',
        jobId: status.id || body.jobId,
        pollingUrl,
      }, 202, headers);
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (prompt.length < 8) {
      return jsonResponse({ error: 'Need a dream prompt for the clip.' }, 400, headers);
    }
    if (!isPublicUrl(body.firstFrameUrl)) {
      return jsonResponse({ error: 'firstFrameUrl must be a public https image.' }, 400, headers);
    }

    const duration = Math.min(10, Math.max(4, Number(body.duration) || 6));
    const requested = typeof body.model === 'string' ? body.model : '';
    const model = MODEL_ALLOWLIST.includes(requested)
      ? requested
      : (Deno.env.get('OPENROUTER_VIDEO_MODEL') || DEFAULT_MODEL);
    const frameImages: Array<Record<string, unknown>> = [
      {
        type: 'image_url',
        image_url: { url: body.firstFrameUrl },
        frame_type: 'first_frame',
      },
    ];
    if (isPublicUrl(body.lastFrameUrl) && body.lastFrameUrl !== body.firstFrameUrl) {
      frameImages.push({
        type: 'image_url',
        image_url: { url: body.lastFrameUrl },
        frame_type: 'last_frame',
      });
    }

    const payload = {
      model,
      prompt: clipPrompt(prompt),
      duration,
      resolution: body.resolution || '720p',
      aspect_ratio: body.aspectRatio || '1:1',
      generate_audio: false,
      frame_images: frameImages,
    };

    const submit = await fetch(OPENROUTER_VIDEOS, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const submitted = await submit.json().catch(() => ({})) as JobStatus & { error?: { message?: string } | string };
    if (!submit.ok || !submitted.id) {
      if (model !== FALLBACK_MODEL) {
        const retryPayload = { ...payload, model: FALLBACK_MODEL };
        const retry = await fetch(OPENROUTER_VIDEOS, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(retryPayload),
        });
        const retried = await retry.json().catch(() => ({})) as JobStatus;
        if (!retry.ok || !retried.id) {
          const detail = typeof submitted.error === 'string'
            ? submitted.error
            : submitted.error?.message || `OpenRouter video failed (${submit.status})`;
          return jsonResponse({ error: detail }, 502, headers);
        }
        Object.assign(submitted, retried);
      } else {
        const detail = typeof submitted.error === 'string'
          ? submitted.error
          : submitted.error?.message || `OpenRouter video failed (${submit.status})`;
        return jsonResponse({ error: detail }, 502, headers);
      }
    }

    const pollingUrl = submitted.polling_url || `${OPENROUTER_VIDEOS}/${submitted.id}`;
    const status = await pollJob(pollingUrl, MAX_WAIT_MS);
    if (status.status === 'completed' && status.unsigned_urls?.[0]) {
      const clip = await downloadClip(status.unsigned_urls[0]);
      return jsonResponse({
        status: 'completed',
        videoUrl: clip.storedUrl,
        source: 'openrouter',
        model: status.model || model,
        cost_usd: status.usage?.cost ?? null,
        jobId: status.id || submitted.id,
      }, 200, headers);
    }
    if (status.status === 'failed') {
      return jsonResponse({ status: 'failed', error: status.error || 'Video generation failed' }, 502, headers);
    }

    return jsonResponse({
      status: 'processing',
      jobId: submitted.id,
      pollingUrl,
    }, 202, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500, headers);
  }
});
