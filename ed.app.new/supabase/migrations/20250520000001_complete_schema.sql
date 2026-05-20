-- ============================================================
-- EverDream — Complete Database Schema (Migration 20250520)
-- Full idempotent schema: profiles, dreams, sleep_sessions,
--   user_settings, nfts, dream_assets, sync_log, webhook_events
-- Enables RLS with user-specific policies
-- Auto-creates profile on signup, auto-expires at 35 days
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'dreamer',
  avatar_url TEXT,
  tradition TEXT NOT NULL DEFAULT 'general' CHECK (tradition IN ('buddhist', 'celtic', 'scientific', 'general')),
  circadian_goal TEXT NOT NULL DEFAULT 'better_dreams',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ============================================================
-- 2. DREAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  transcript TEXT,
  capture_mode TEXT NOT NULL DEFAULT 'text' CHECK (capture_mode IN ('text', 'audio', 'video')),
  category TEXT NOT NULL DEFAULT 'normal',
  themes TEXT[] NOT NULL DEFAULT '{}',
  emotion TEXT NOT NULL DEFAULT 'neutral',
  symbols TEXT[] NOT NULL DEFAULT '{}',
  narrative TEXT,
  nugget TEXT,
  valence NUMERIC(3,2) CHECK (valence BETWEEN -1 AND 1),
  interpretation JSONB,
  lucidity_level INTEGER CHECK (lucidity_level BETWEEN 0 AND 5),
  pre_sleep_intent TEXT,
  pre_sleep_note TEXT,
  mood_valence NUMERIC(3,2) CHECK (mood_valence BETWEEN -1 AND 1),
  context JSONB,
  media_urls JSONB,
  generated_image_url TEXT,
  generated_image_prompt TEXT,
  generated_image_style TEXT DEFAULT 'dreamlike',
  generated_image_source TEXT,
  sleep_session_id UUID REFERENCES public.sleep_sessions(id) ON DELETE SET NULL,
  sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  sleep_duration_minutes INTEGER,
  rem_minutes INTEGER,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'trusted', 'public')),
  watermark JSONB,
  asset_metadata JSONB,
  license TEXT NOT NULL DEFAULT 'copyleft',
  allow_remix BOOLEAN NOT NULL DEFAULT true,
  device_id TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  local_created_at TIMESTAMPTZ,
  local_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON public.dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_category ON public.dreams(category);
CREATE INDEX IF NOT EXISTS idx_dreams_is_deleted ON public.dreams(is_deleted);
CREATE INDEX IF NOT EXISTS idx_dreams_user_deleted ON public.dreams(user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_dreams_expires_at ON public.dreams(expires_at);
CREATE INDEX IF NOT EXISTS idx_dreams_themes ON public.dreams USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_dreams_visibility ON public.dreams(visibility) WHERE visibility != 'private';

ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dreams" ON public.dreams;
CREATE POLICY "Users can view own dreams"
  ON public.dreams FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dreams" ON public.dreams;
CREATE POLICY "Users can insert own dreams"
  ON public.dreams FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own dreams" ON public.dreams;
CREATE POLICY "Users can update own dreams"
  ON public.dreams FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dreams" ON public.dreams;
CREATE POLICY "Users can delete own dreams"
  ON public.dreams FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Public dreams are viewable" ON public.dreams;
CREATE POLICY "Public dreams are viewable"
  ON public.dreams FOR SELECT
  USING (visibility = 'public');

-- ============================================================
-- 3. SLEEP SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sleep_start TIMESTAMPTZ NOT NULL,
  sleep_end TIMESTAMPTZ,
  time_in_bed_minutes INTEGER,
  awake_minutes INTEGER NOT NULL DEFAULT 0,
  light_minutes INTEGER NOT NULL DEFAULT 0,
  deep_minutes INTEGER NOT NULL DEFAULT 0,
  rem_minutes INTEGER NOT NULL DEFAULT 0,
  total_sleep_minutes INTEGER NOT NULL DEFAULT 0,
  sleep_efficiency NUMERIC(5,2),
  awakenings INTEGER NOT NULL DEFAULT 0,
  waso_minutes INTEGER NOT NULL DEFAULT 0,
  movement_index NUMERIC(5,2),
  heart_rate_avg NUMERIC(5,2),
  heart_rate_variability NUMERIC(5,2),
  algorithmic_score INTEGER CHECK (algorithmic_score BETWEEN 0 AND 100),
  user_report_score INTEGER CHECK (user_report_score BETWEEN 0 AND 100),
  calibration_offset NUMERIC(3,2) NOT NULL DEFAULT 0,
  calibrated_score INTEGER CHECK (calibrated_score BETWEEN 0 AND 100),
  circadian_alignment_score INTEGER CHECK (circadian_alignment_score BETWEEN 0 AND 100),
  chronotype_estimate TEXT CHECK (chronotype_estimate IN ('early-bird', 'intermediate', 'night-owl')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'browser-estimate', 'wearable', 'native-device')),
  wearable_provider TEXT,
  device_id TEXT,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  morning_check_in JSONB,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON public.sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_sleep_start ON public.sleep_sessions(sleep_start DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_is_deleted ON public.sleep_sessions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_expires_at ON public.sleep_sessions(expires_at);

ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sleep sessions" ON public.sleep_sessions;
CREATE POLICY "Users can view own sleep sessions"
  ON public.sleep_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own sleep sessions" ON public.sleep_sessions;
CREATE POLICY "Users can insert own sleep sessions"
  ON public.sleep_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own sleep sessions" ON public.sleep_sessions;
CREATE POLICY "Users can update own sleep sessions"
  ON public.sleep_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own sleep sessions" ON public.sleep_sessions;
CREATE POLICY "Users can delete own sleep sessions"
  ON public.sleep_sessions FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 4. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alarm_time TEXT DEFAULT '07:00',
  alarm_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_bedtime TEXT DEFAULT '22:00',
  preferred_wake_time TEXT DEFAULT '06:30',
  music_preference TEXT NOT NULL DEFAULT 'peaceful',
  circadian_goal TEXT NOT NULL DEFAULT 'better_dreams',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  wearable_sync BOOLEAN NOT NULL DEFAULT false,
  image_generation_enabled BOOLEAN NOT NULL DEFAULT true,
  data_processing_consent BOOLEAN NOT NULL DEFAULT false,
  ai_analysis_consent BOOLEAN NOT NULL DEFAULT true,
  anonymous_analytics BOOLEAN NOT NULL DEFAULT false,
  third_party_sharing BOOLEAN NOT NULL DEFAULT false,
  sleep_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  motion_sensor_enabled BOOLEAN NOT NULL DEFAULT true,
  audio_recording_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_wake_enabled BOOLEAN NOT NULL DEFAULT false,
  circadian_coaching_enabled BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'pearl',
  skin TEXT NOT NULL DEFAULT 'pearl-light',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 5. NFTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_address TEXT NOT NULL,
  creator_address TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Dream',
  description TEXT,
  image_url TEXT,
  animation_url TEXT,
  external_url TEXT,
  metadata JSONB,
  attributes JSONB[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  tx_hash TEXT,
  contract_address TEXT,
  token_id TEXT,
  parent_nft_ids TEXT[],
  royalty_splits JSONB,
  license TEXT DEFAULT 'copyleft',
  allow_remix BOOLEAN DEFAULT true,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON public.nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_dream_id ON public.nfts(dream_id);
CREATE INDEX IF NOT EXISTS idx_nfts_status ON public.nfts(status);

ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own nfts" ON public.nfts;
CREATE POLICY "Users can view own nfts"
  ON public.nfts FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own nfts" ON public.nfts;
CREATE POLICY "Users can insert own nfts"
  ON public.nfts FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own nfts" ON public.nfts;
CREATE POLICY "Users can update own nfts"
  ON public.nfts FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 6. DREAM ASSETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dream_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'depth_map', 'parallax_video', 'skybox_360', 'mesh_3d', 'multi_view', 'gaussian_splat')),
  prompt TEXT,
  url TEXT,
  source TEXT,
  style TEXT DEFAULT 'dreamlike',
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dream_assets_dream_id ON public.dream_assets(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_user_id ON public.dream_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_type ON public.dream_assets(asset_type);

ALTER TABLE public.dream_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dream assets" ON public.dream_assets;
CREATE POLICY "Users can view own dream assets"
  ON public.dream_assets FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dream assets" ON public.dream_assets;
CREATE POLICY "Users can insert own dream assets"
  ON public.dream_assets FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own dream assets" ON public.dream_assets;
CREATE POLICY "Users can update own dream assets"
  ON public.dream_assets FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 7. SYNC LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  device_id TEXT,
  local_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_synced ON public.sync_log(user_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_record ON public.sync_log(table_name, record_id);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync log" ON public.sync_log;
CREATE POLICY "Users can view own sync log"
  ON public.sync_log FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert sync log" ON public.sync_log;
CREATE POLICY "Users can insert sync log"
  ON public.sync_log FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- 8. WEBHOOK EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON public.webhook_events(user_id, created_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own webhooks" ON public.webhook_events;
CREATE POLICY "Users can view own webhooks"
  ON public.webhook_events FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert webhooks" ON public.webhook_events;
CREATE POLICY "Users can insert webhooks"
  ON public.webhook_events FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()) OR user_id IS NULL);

-- ============================================================
-- 9. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.dreams;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.sleep_sessions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.nfts;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.nfts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 10. EXPIRES_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '35 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dreams_expires_at ON public.dreams;
CREATE TRIGGER set_dreams_expires_at
  BEFORE INSERT ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.set_expires_at();

DROP TRIGGER IF EXISTS set_sleep_sessions_expires_at ON public.sleep_sessions;
CREATE TRIGGER set_sleep_sessions_expires_at
  BEFORE INSERT ON public.sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_expires_at();

-- ============================================================
-- 11. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'dreamer')
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (
    (SELECT id FROM public.profiles WHERE auth_user_id = NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 12. CLEANUP FUNCTIONS
-- ============================================================

-- Soft-delete expired records
CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS void AS $$
BEGIN
  UPDATE public.dreams SET is_deleted = true, updated_at = NOW()
  WHERE expires_at < NOW() AND is_deleted = false;

  UPDATE public.sleep_sessions SET is_deleted = true, updated_at = NOW()
  WHERE expires_at < NOW() AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Hard-delete records soft-deleted for 7+ days
CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted()
RETURNS void AS $$
BEGIN
  DELETE FROM public.dreams WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';
  DELETE FROM public.sleep_sessions WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';
  DELETE FROM public.sync_log WHERE synced_at < NOW() - INTERVAL '30 days';
  DELETE FROM public.webhook_events WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
