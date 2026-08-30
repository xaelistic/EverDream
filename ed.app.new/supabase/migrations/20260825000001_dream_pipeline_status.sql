-- Per-step dream pipeline status + listener + hourly catch-up.
-- audio captured / transcription / analysis / image can be queried independently.
-- A BEFORE trigger keeps the JSON in sync with artifacts.
-- pg_notify lets listeners react; pg_cron (when present) calls the catch-up function hourly.

ALTER TABLE public.dreams
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_status JSONB NOT NULL DEFAULT jsonb_build_object(
    'audio_captured', 'pending',
    'transcription', 'pending',
    'analysis', 'pending',
    'image', 'pending',
    'overall', 'pending',
    'last_checked_at', null,
    'last_error', null,
    'attempts', 0
  );

CREATE INDEX IF NOT EXISTS idx_dreams_pipeline_overall
  ON public.dreams ((pipeline_status->>'overall'));

CREATE INDEX IF NOT EXISTS idx_dreams_pipeline_incomplete
  ON public.dreams (created_at DESC)
  WHERE COALESCE(is_deleted, false) = false
    AND COALESCE(pipeline_status->>'overall', 'pending') <> 'complete';

CREATE OR REPLACE FUNCTION public.is_placeholder_dream_text(t TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    t IS NULL
    OR length(trim(t)) < 10
    OR t ~* 'processing your|processing in progress|transcribing your recording|building your xael|analysing your uploaded|analyzing your uploaded';
$$;

CREATE OR REPLACE FUNCTION public.derive_dream_pipeline_status(d public.dreams)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  mode TEXT;
  meta JSONB;
  audio_ref TEXT;
  audio_status TEXT;
  transcription_status TEXT;
  analysis_status TEXT;
  image_status TEXT;
  overall TEXT;
  meaning TEXT;
  narrative_text TEXT;
  transcript_text TEXT;
  content_text TEXT;
  image_url TEXT;
  image_source TEXT;
  prev JSONB;
  actionable TEXT[];
  has_media_ref BOOLEAN;
  analysis_pending BOOLEAN;
BEGIN
  prev := COALESCE(d.pipeline_status, '{}'::jsonb);
  meta := COALESCE(d.ai_metadata, '{}'::jsonb);
  mode := lower(COALESCE(d.capture_mode, 'text'));
  content_text := COALESCE(d.content, '');
  transcript_text := COALESCE(d.transcript, '');
  narrative_text := COALESCE(d.narrative, '');
  meaning := COALESCE(d.interpretation->>'meaning', '');
  image_url := COALESCE(d.generated_image_url, '');
  image_source := COALESCE(d.generated_image_source, meta #>> '{generated_image,source}', '');

  audio_ref := COALESCE(
    d.media_storage_path,
    meta #>> '{audio_capture,path}',
    meta #>> '{audio_capture,mediaId}',
    meta #>> '{video_capture,path}',
    meta #>> '{video_capture,mediaId}',
    meta #>> '{source_audio}'
  );
  has_media_ref :=
    COALESCE(audio_ref, '') <> ''
    OR COALESCE(meta #>> '{audio_capture,url}', '') ~ '^https?://'
    OR COALESCE(meta #>> '{video_capture,url}', '') ~ '^https?://';

  IF mode IN ('audio', 'video') THEN
    audio_status := CASE WHEN has_media_ref THEN 'done' ELSE 'pending' END;
  ELSE
    audio_status := 'skipped';
  END IF;

  IF mode NOT IN ('audio', 'video') THEN
    transcription_status := 'skipped';
  ELSIF NOT public.is_placeholder_dream_text(COALESCE(NULLIF(trim(transcript_text), ''), content_text)) THEN
    transcription_status := 'done';
  ELSE
    transcription_status := CASE WHEN prev->>'transcription' IN ('error', 'running') THEN prev->>'transcription' ELSE 'pending' END;
  END IF;

  analysis_pending :=
    public.is_placeholder_dream_text(meaning)
    OR meaning = ''
    OR COALESCE(d.category, '') IN ('processing', 'video-journal', 'audio-journal')
    OR (
      COALESCE(d.category, '') IN ('uncategorized', 'normal')
      AND COALESCE(array_length(d.themes, 1), 0) <= 1
      AND COALESCE(d.themes[1], '') ~* 'imported|processing|audio|video'
    );

  IF NOT analysis_pending AND (length(meaning) >= 8 OR length(trim(narrative_text)) >= 20) THEN
    analysis_status := 'done';
  ELSE
    analysis_status := CASE WHEN prev->>'analysis' IN ('error', 'running') THEN prev->>'analysis' ELSE 'pending' END;
  END IF;

  IF image_url <> '' AND image_source NOT IN ('video-capture', 'placeholder') THEN
    image_status := 'done';
  ELSE
    image_status := CASE WHEN prev->>'image' IN ('error', 'running') THEN prev->>'image' ELSE 'pending' END;
  END IF;

  actionable := ARRAY[]::TEXT[];
  IF audio_status <> 'skipped' THEN actionable := array_append(actionable, audio_status); END IF;
  IF transcription_status <> 'skipped' THEN actionable := array_append(actionable, transcription_status); END IF;
  IF analysis_status <> 'skipped' THEN actionable := array_append(actionable, analysis_status); END IF;
  IF image_status <> 'skipped' THEN actionable := array_append(actionable, image_status); END IF;

  IF actionable = ARRAY[]::TEXT[] OR (
    'pending' <> ALL (actionable)
    AND 'running' <> ALL (actionable)
    AND 'error' <> ALL (actionable)
  ) THEN
    overall := 'complete';
  ELSIF 'running' = ANY (actionable) THEN
    overall := 'processing';
  ELSIF 'error' = ANY (actionable) AND 'done' = ANY (actionable) THEN
    overall := 'partial';
  ELSIF 'error' = ANY (actionable) THEN
    overall := 'failed';
  ELSIF 'done' = ANY (actionable) THEN
    overall := 'partial';
  ELSE
    overall := 'pending';
  END IF;

  RETURN jsonb_build_object(
    'audio_captured', audio_status,
    'transcription', transcription_status,
    'analysis', analysis_status,
    'image', image_status,
    'overall', overall,
    'last_checked_at', prev->'last_checked_at',
    'last_error', CASE WHEN overall = 'complete' THEN 'null'::jsonb ELSE prev->'last_error' END,
    'attempts', COALESCE(prev->'attempts', '0'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dreams_pipeline_status_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.pipeline_status := public.derive_dream_pipeline_status(NEW);
  IF NEW.ai_metadata IS NULL THEN
    NEW.ai_metadata := '{}'::jsonb;
  END IF;
  NEW.ai_metadata := NEW.ai_metadata || jsonb_build_object(
    'pipeline_status', NEW.pipeline_status,
    'processing_status', CASE
      WHEN NEW.pipeline_status->>'overall' = 'complete' THEN 'complete'
      WHEN NEW.pipeline_status->>'overall' = 'failed' THEN 'failed'
      ELSE 'processing'
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dreams_pipeline_status_before ON public.dreams;
CREATE TRIGGER trg_dreams_pipeline_status_before
  BEFORE INSERT OR UPDATE OF
    content, transcript, narrative, interpretation, category, themes,
    generated_image_url, generated_image_source, media_storage_path,
    capture_mode, ai_metadata, is_deleted
  ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.dreams_pipeline_status_before();

CREATE OR REPLACE FUNCTION public.dreams_pipeline_status_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.pipeline_status IS DISTINCT FROM OLD.pipeline_status THEN
    PERFORM pg_notify(
      'dream_pipeline',
      json_build_object(
        'id', NEW.id,
        'user_id', NEW.user_id,
        'overall', NEW.pipeline_status->>'overall',
        'audio_captured', NEW.pipeline_status->>'audio_captured',
        'transcription', NEW.pipeline_status->>'transcription',
        'analysis', NEW.pipeline_status->>'analysis',
        'image', NEW.pipeline_status->>'image',
        'op', TG_OP
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dreams_pipeline_status_notify ON public.dreams;
CREATE TRIGGER trg_dreams_pipeline_status_notify
  AFTER INSERT OR UPDATE ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.dreams_pipeline_status_notify();

UPDATE public.dreams
SET pipeline_status = public.derive_dream_pipeline_status(dreams)
WHERE COALESCE(is_deleted, false) = false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'dreams'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dreams;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add dreams to supabase_realtime: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.invoke_complete_dream_pipeline()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url TEXT;
  fn_key TEXT;
BEGIN
  fn_url := NULLIF(current_setting('app.settings.supabase_functions_url', true), '');
  fn_key := NULLIF(current_setting('app.settings.pipeline_cron_secret', true), '');
  IF fn_url IS NULL THEN
    fn_url := NULLIF(current_setting('app.settings.supabase_url', true), '');
    IF fn_url IS NOT NULL THEN
      fn_url := regexp_replace(fn_url, '/$', '') || '/functions/v1/complete-dream-pipeline';
    END IF;
  END IF;
  IF fn_key IS NULL THEN
    fn_key := NULLIF(current_setting('app.settings.service_role_key', true), '');
  END IF;
  IF fn_url IS NULL OR fn_key IS NULL THEN
    RAISE NOTICE 'complete-dream-pipeline cron skipped: set app.settings.supabase_url and pipeline_cron_secret (or service_role_key)';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'complete-dream-pipeline cron skipped: pg_net not installed';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || fn_key,
      'x-cron-secret', fn_key
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_complete_dream_pipeline() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_complete_dream_pipeline() TO postgres, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('complete-dream-pipeline-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'complete-dream-pipeline-hourly',
      '0 * * * *',
      'SELECT public.invoke_complete_dream_pipeline()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule complete-dream-pipeline-hourly: %', SQLERRM;
END $$;
