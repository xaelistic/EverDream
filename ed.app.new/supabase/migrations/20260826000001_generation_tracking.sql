-- Track image/video quality, model routing, generation jobs, and user feedback.

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'storyboard', 'video')),
  model TEXT,
  fallback_model TEXT,
  routed_reason TEXT,
  quality_score INTEGER,
  quality_verdict TEXT,
  quality_report JSONB,
  prompt TEXT,
  source_urls JSONB,
  result_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'blocked')),
  cost_usd NUMERIC(10, 6),
  error TEXT,
  provider TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user ON public.generation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_dream ON public.generation_jobs(dream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_kind_status ON public.generation_jobs(kind, status);

CREATE TABLE IF NOT EXISTS public.asset_quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('still', 'storyboard', 'video')),
  asset_url TEXT,
  score INTEGER NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'warn', 'fail')),
  metrics JSONB DEFAULT '{}'::jsonb,
  reasons TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_quality_dream ON public.asset_quality_checks(dream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_quality_verdict ON public.asset_quality_checks(verdict);

CREATE TABLE IF NOT EXISTS public.asset_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('still', 'storyboard', 'video')),
  asset_url TEXT,
  model TEXT,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_feedback_user ON public.asset_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_feedback_dream ON public.asset_feedback(dream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_feedback_kind_rating ON public.asset_feedback(asset_kind, rating);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users read own generation jobs"
  ON public.generation_jobs FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users insert own generation jobs"
  ON public.generation_jobs FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users update own generation jobs" ON public.generation_jobs;
CREATE POLICY "Users update own generation jobs"
  ON public.generation_jobs FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own quality checks" ON public.asset_quality_checks;
CREATE POLICY "Users read own quality checks"
  ON public.asset_quality_checks FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own quality checks" ON public.asset_quality_checks;
CREATE POLICY "Users insert own quality checks"
  ON public.asset_quality_checks FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users read own asset feedback" ON public.asset_feedback;
CREATE POLICY "Users read own asset feedback"
  ON public.asset_feedback FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users insert own asset feedback" ON public.asset_feedback;
CREATE POLICY "Users insert own asset feedback"
  ON public.asset_feedback FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
