/**
 * complete-dream-pipeline
 *
 * Hourly catch-up (and on-demand) for incomplete dreams:
 *   transcription → analysis → image
 *
 * Auth (verify_jwt is off; this function checks credentials itself):
 *   - x-cron-secret / Authorization Bearer matching PIPELINE_CRON_SECRET
 *   - service role key
 *   - user JWT (only that user's dreams)
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.106.0';

const ALLOWED_ORIGINS = [
  'https://everdream.n1g3.com',
  'https://everdream.app',
  'https://www.everdream.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
];

const PLACEHOLDER =
  /processing your|processing in progress|transcribing your recording|building your xael|analysing your uploaded|analyzing your uploaded/i;

const MEDIA_BUCKET = 'dream-media';
const MAX_DREAMS = 12;
const STALE_MS = 50 * 60 * 1000;

interface PipelineStatus {
  audio_captured?: string;
  transcription?: string;
  analysis?: string;
  image?: string;
  overall?: string;
  last_checked_at?: string | null;
  last_error?: string | null;
  attempts?: number;
}

interface DreamRow {
  id: string;
  user_id: string;
  content: string | null;
  transcript: string | null;
  narrative: string | null;
  nugget: string | null;
  category: string | null;
  themes: string[] | null;
  emotion: string | null;
  symbols: string[] | null;
  interpretation: Record<string, unknown> | null;
  mood_valence: number | null;
  capture_mode: string | null;
  generated_image_url: string | null;
  generated_image_prompt: string | null;
  generated_image_style: string | null;
  generated_image_source: string | null;
  media_storage_path: string | null;
  ai_metadata: Record<string, unknown> | null;
  pipeline_status: PipelineStatus | null;
  is_sample: boolean | null;
}

type WorkItem = {
  dream: DreamRow;
  actions: Array<'transcription' | 'analysis' | 'image'>;
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin)
      ? origin
      : 'https://everdream.n1g3.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-cron-secret',
    Vary: 'Origin',
  };
}

function jsonResponse(data: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function isPlaceholder(text?: string | null): boolean {
  const value = (text || '').trim();
  return value.length < 10 || PLACEHOLDER.test(value);
}

function meaningOf(interpretation: Record<string, unknown> | null): string {
  const meaning = interpretation?.meaning;
  return typeof meaning === 'string' ? meaning.trim() : '';
}

function hasMedia(dream: DreamRow): boolean {
  const meta = dream.ai_metadata || {};
  const audio = (meta.audio_capture || {}) as Record<string, unknown>;
  const video = (meta.video_capture || {}) as Record<string, unknown>;
  return Boolean(
    dream.media_storage_path ||
      audio.path ||
      audio.mediaId ||
      video.path ||
      video.mediaId ||
      (typeof audio.url === 'string' && audio.url.startsWith('http')) ||
      (typeof video.url === 'string' && video.url.startsWith('http')),
  );
}

function missingActions(dream: DreamRow): Array<'transcription' | 'analysis' | 'image'> {
  const mode = (dream.capture_mode || 'text').toLowerCase();
  const isMedia = mode === 'audio' || mode === 'video';
  const missing: Array<'transcription' | 'analysis' | 'image'> = [];
  const transcript = dream.transcript || dream.content;
  if (isMedia && isPlaceholder(transcript)) missing.push('transcription');
  const meaning = meaningOf(dream.interpretation);
  const analysisPending =
    isPlaceholder(meaning) ||
    ['processing', 'video-journal', 'audio-journal'].includes(dream.category || '') ||
    ((dream.category === 'uncategorized' || dream.category === 'normal') &&
      (dream.themes?.length || 0) <= 1 &&
      /imported|processing|audio|video/i.test(dream.themes?.[0] || ''));
  if (analysisPending) missing.push('analysis');
  const imageOk =
    Boolean(dream.generated_image_url) &&
    dream.generated_image_source !== 'video-capture' &&
    dream.generated_image_source !== 'placeholder';
  if (!imageOk) missing.push('image');
  return missing;
}

function isStale(status: PipelineStatus | null): boolean {
  if (!status?.last_checked_at) return true;
  const ts = Date.parse(status.last_checked_at);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts >= STALE_MS;
}

function functionsBase(): string {
  return (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '') + '/functions/v1';
}

function serviceHeaders(): Record<string, string> {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

async function transcribeDream(dream: DreamRow, admin: SupabaseClient): Promise<string | null> {
  const meta = dream.ai_metadata || {};
  const audio = (meta.audio_capture || {}) as Record<string, unknown>;
  const video = (meta.video_capture || {}) as Record<string, unknown>;
  const path =
    dream.media_storage_path ||
    (typeof audio.path === 'string' && audio.path) ||
    (typeof video.path === 'string' && video.path) ||
    '';
  if (!path) return null;

  const downloaded = await admin.storage.from(MEDIA_BUCKET).download(path);
  if (downloaded.error || !downloaded.data) {
    throw new Error(downloaded.error?.message || 'Could not download dream media');
  }
  const bytes = await downloaded.data.arrayBuffer();
  const fileName = path.split('/').pop() || 'dream.webm';
  const contentType = downloaded.data.type || 'application/octet-stream';

  const response = await fetch(`${functionsBase()}/transcribe-audio`, {
    method: 'POST',
    headers: {
      ...serviceHeaders(),
      'Content-Type': contentType,
      'X-Language': 'en',
      'X-Filename': fileName,
    },
    body: bytes,
  });
  const payload = await response.json().catch(() => ({})) as { text?: string; error?: string };
  if (!response.ok) throw new Error(payload.error || `transcribe-audio ${response.status}`);
  const text = (payload.text || '').trim();
  if (isPlaceholder(text)) throw new Error('Transcription returned empty text');
  return text;
}

async function analyzeDream(text: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${functionsBase()}/analyze-dream`, {
    method: 'POST',
    headers: { ...serviceHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const payload = await response.json().catch(() => ({})) as {
    analysis?: Record<string, unknown>;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || `analyze-dream ${response.status}`);
  if (!payload.analysis) throw new Error('analyze-dream returned no analysis');
  return payload.analysis;
}

async function generateImage(prompt: string): Promise<{ url: string; prompt?: string; source?: string; style?: string }> {
  const response = await fetch(`${functionsBase()}/generate-image`, {
    method: 'POST',
    headers: { ...serviceHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      style: 'dreamlike',
      width: 1024,
      height: 1024,
      format: 'json',
    }),
  });
  const payload = await response.json().catch(() => ({})) as {
    imageUrl?: string;
    prompt?: string;
    source?: string;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || `generate-image ${response.status}`);
  if (!payload.imageUrl) throw new Error('generate-image returned no image');
  return { url: payload.imageUrl, prompt: payload.prompt, source: payload.source, style: 'dreamlike' };
}

function analysisPatch(analysis: Record<string, unknown>, fallbackText: string): Record<string, unknown> {
  const interpretation = (analysis.interpretation && typeof analysis.interpretation === 'object'
    ? analysis.interpretation
    : { symbols: {}, meaning: fallbackText, commonPattern: '' }) as Record<string, unknown>;
  return {
    category: analysis.category || 'adventure',
    themes: Array.isArray(analysis.themes) ? analysis.themes : [],
    emotion: analysis.emotion || 'wonder',
    symbols: Array.isArray(analysis.symbols) ? analysis.symbols : [],
    narrative: analysis.narrative || fallbackText,
    nugget: analysis.nugget || String(fallbackText).slice(0, 100),
    interpretation,
    mood_valence: typeof analysis.valence === 'number' ? analysis.valence : null,
  };
}

async function processDream(dream: DreamRow, actions: WorkItem['actions'], admin: SupabaseClient): Promise<{
  id: string;
  completed: string[];
  error?: string;
}> {
  const completed: string[] = [];
  const patch: Record<string, unknown> = {};
  const prev = dream.pipeline_status || {};
  let working: DreamRow = { ...dream };
  let lastError: string | null = null;

  const stamp = (step: string, state: string) => {
    const status: PipelineStatus = {
      ...prev,
      ...(working.pipeline_status || {}),
      [step]: state,
      last_checked_at: new Date().toISOString(),
      last_error: lastError,
      attempts: (prev.attempts || 0) + 1,
    };
    patch.pipeline_status = status;
    working.pipeline_status = status;
  };

  try {
    if (actions.includes('transcription') && hasMedia(working)) {
      stamp('transcription', 'running');
      const text = await transcribeDream(working, admin);
      if (text) {
        patch.content = text;
        patch.transcript = text;
        working.content = text;
        working.transcript = text;
        completed.push('transcription');
        stamp('transcription', 'done');
      }
    }

    const sourceText = (working.transcript || working.content || '').trim();
    if (actions.includes('analysis') && !isPlaceholder(sourceText)) {
      stamp('analysis', 'running');
      const analysis = await analyzeDream(sourceText);
      Object.assign(patch, analysisPatch(analysis, sourceText));
      Object.assign(working, analysisPatch(analysis, sourceText));
      completed.push('analysis');
      stamp('analysis', 'done');
    }

    const imagePrompt =
      String(working.narrative || working.nugget || working.content || '').trim();
    if (actions.includes('image') && imagePrompt.length >= 10) {
      stamp('image', 'running');
      const image = await generateImage(imagePrompt);
      patch.generated_image_url = image.url;
      patch.generated_image_prompt = image.prompt || imagePrompt;
      patch.generated_image_style = image.style || 'dreamlike';
      patch.generated_image_source = image.source || 'openrouter';
      completed.push('image');
      stamp('image', 'done');
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    const status: PipelineStatus = {
      ...(working.pipeline_status || {}),
      last_checked_at: new Date().toISOString(),
      last_error: lastError,
      attempts: (prev.attempts || 0) + 1,
    };
    patch.pipeline_status = status;
  }

  const meta = { ...(working.ai_metadata || {}) };
  if (patch.content || patch.generated_image_url || patch.interpretation) {
    patch.ai_metadata = {
      ...meta,
      pipeline_status: patch.pipeline_status || working.pipeline_status,
    };
    patch.local_updated_at = new Date().toISOString();
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from('dreams').update(patch).eq('id', dream.id);
    if (error) lastError = lastError || error.message;
  }

  return { id: dream.id, completed, error: lastError || undefined };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, headers);
  }

  const cronSecret =
    Deno.env.get('PIPELINE_CRON_SECRET') ||
    Deno.env.get('SYNC_CRON_SECRET') ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    '';
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = req.headers.get('x-cron-secret') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const isCron =
    Boolean(cronSecret) &&
    (timingSafeEqual(headerSecret, cronSecret) || (bearer && timingSafeEqual(bearer, cronSecret)));
  const isService = Boolean(serviceKey) && bearer && timingSafeEqual(bearer, serviceKey);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceKey;
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Supabase service credentials missing' }, 500, headers);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  let userId: string | null = null;

  if (!isCron && !isService) {
    if (!bearer) return jsonResponse({ error: 'Unauthorized' }, 401, headers);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) return jsonResponse({ error: 'Unauthorized' }, 401, headers);
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    userId = profile?.id || data.user.id;
  }

  let body: { dream_id?: string; source?: string; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let query = admin
    .from('dreams')
    .select(
      'id,user_id,content,transcript,narrative,nugget,category,themes,emotion,symbols,interpretation,mood_valence,capture_mode,generated_image_url,generated_image_prompt,generated_image_style,generated_image_source,media_storage_path,ai_metadata,pipeline_status,is_sample',
    )
    .eq('is_deleted', false)
    .eq('is_sample', false)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(body.limit) || MAX_DREAMS, 25));

  if (body.dream_id) query = query.eq('id', body.dream_id);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return jsonResponse({ error: error.message }, 500, headers);

  const work: WorkItem[] = [];
  for (const row of (data || []) as DreamRow[]) {
    const actions = missingActions(row);
    if (actions.length === 0) continue;
    if (!body.dream_id && !isStale(row.pipeline_status)) continue;
    if (actions.includes('transcription') && !hasMedia(row) && (row.capture_mode === 'audio' || row.capture_mode === 'video')) {
      continue;
    }
    work.push({ dream: row, actions });
  }

  const results = [];
  for (const item of work) {
    results.push(await processDream(item.dream, item.actions, admin));
  }

  return jsonResponse(
    {
      ok: true,
      source: body.source || 'manual',
      scanned: (data || []).length,
      processed: results.length,
      results,
    },
    200,
    headers,
  );
});
