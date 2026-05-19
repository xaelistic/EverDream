-- ============================================================
-- EverDream — Database Migration
-- Run this in your Supabase SQL Editor to create all tables
-- ============================================================

-- ── Profiles Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Dreams Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  transcript TEXT,
  capture_mode TEXT NOT NULL DEFAULT 'text' CHECK (capture_mode IN ('text', 'audio', 'video')),
  category TEXT NOT NULL DEFAULT 'normal',
  themes TEXT[] DEFAULT '{}',
  emotion TEXT DEFAULT 'neutral',
  symbols TEXT[] DEFAULT '{}',
  narrative TEXT,
  nugget TEXT,
  interpretation JSONB,
  lucidity_level INTEGER,
  pre_sleep_intent TEXT,
  pre_sleep_note TEXT,
  mood_valence NUMERIC(3,2),
  context JSONB,
  media_urls JSONB,
  generated_image_url TEXT,
  generated_image_prompt TEXT,
  generated_image_style TEXT DEFAULT 'dreamlike',
  generated_image_source TEXT,
  sleep_session_id UUID,
  sleep_score INTEGER,
  sleep_duration_minutes INTEGER,
  rem_minutes INTEGER,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'trusted', 'public')),
  watermark JSONB,
  asset_metadata JSONB,
  license TEXT DEFAULT 'all-rights-reserved',
  allow_remix BOOLEAN DEFAULT false,
  device_id TEXT,
  is_sample BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  local_created_at TIMESTAMPTZ,
  local_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ── Sleep Sessions Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sleep_start TIMESTAMPTZ NOT NULL,
  sleep_end TIMESTAMPTZ,
  time_in_bed_minutes INTEGER,
  awake_minutes INTEGER DEFAULT 0,
  light_minutes INTEGER DEFAULT 0,
  deep_minutes INTEGER DEFAULT 0,
  rem_minutes INTEGER DEFAULT 0,
  total_sleep_minutes INTEGER DEFAULT 0,
  sleep_efficiency NUMERIC(5,2),
  awakenings INTEGER DEFAULT 0,
  waso_minutes INTEGER DEFAULT 0,
  movement_index NUMERIC(5,2),
  heart_rate_avg INTEGER,
  heart_rate_variability INTEGER,
  algorithmic_score INTEGER,
  user_report_score INTEGER,
  calibration_offset INTEGER DEFAULT 0,
  calibrated_score INTEGER,
  circadian_alignment_score INTEGER,
  chronotype_estimate TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  wearable_provider TEXT,
  device_id TEXT,
  dream_id UUID REFERENCES public.dreams(id),
  morning_check_in JSONB,
  is_active BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ── User Settings Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alarm_time TEXT DEFAULT '07:00',
  alarm_enabled BOOLEAN DEFAULT true,
  music_preference TEXT DEFAULT 'peaceful',
  circadian_goal TEXT DEFAULT 'better_dreams',
  notifications_enabled BOOLEAN DEFAULT true,
  wearable_sync BOOLEAN DEFAULT false,
  image_generation BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON public.dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_category ON public.dreams(category);
CREATE INDEX IF NOT EXISTS idx_dreams_is_deleted ON public.dreams(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON public.sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_sleep_start ON public.sleep_sessions(sleep_start DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- ── Row Level Security ────────────────────────────────────────

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Dreams
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dreams" ON public.dreams FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can insert own dreams" ON public.dreams FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own dreams" ON public.dreams FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can delete own dreams" ON public.dreams FOR DELETE USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- Sleep Sessions
ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sleep sessions" ON public.sleep_sessions FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can insert own sleep sessions" ON public.sleep_sessions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own sleep sessions" ON public.sleep_sessions FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can upsert own settings" ON public.user_settings FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

-- ── Updated At Trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_dreams_updated_at
  BEFORE UPDATE ON public.dreams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_sleep_sessions_updated_at
  BEFORE UPDATE ON public.sleep_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Soft-Delete Cleanup (runs via pg_cron or manually) ────────
-- Permanently delete soft-deleted dreams older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_soft_deleted()
RETURNS void AS $$
BEGIN
  DELETE FROM public.dreams WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';
  DELETE FROM public.sleep_sessions WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
