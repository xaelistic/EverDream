-- ============================================================
-- EverDream — Supabase Database Schema
-- Run this in your Supabase SQL Editor to create all tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. DREAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  transcript TEXT,
  capture_mode TEXT NOT NULL DEFAULT 'text' CHECK (capture_mode IN ('text', 'audio', 'video')),
  category TEXT NOT NULL DEFAULT 'uncategorized',
  themes TEXT[] DEFAULT '{}',
  emotion TEXT NOT NULL DEFAULT 'neutral',
  symbols TEXT[] DEFAULT '{}',
  narrative TEXT,
  nugget TEXT,
  interpretation JSONB DEFAULT '{}'::jsonb,
  lucidity_level INTEGER CHECK (lucidity_level BETWEEN 0 AND 5),
  pre_sleep_intent TEXT,
  pre_sleep_note TEXT,
  mood_valence NUMERIC(3,2) CHECK (mood_valence BETWEEN -1 AND 1),
  context JSONB DEFAULT '{}'::jsonb,
  media_urls JSONB DEFAULT '[]'::jsonb,
  generated_image_url TEXT,
  generated_image_prompt TEXT,
  generated_image_style TEXT DEFAULT 'dreamlike',
  generated_image_source TEXT,
  sleep_session_id UUID,
  sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  sleep_duration_minutes INTEGER,
  rem_minutes INTEGER,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'trusted', 'public')),
  watermark JSONB DEFAULT '{}'::jsonb,
  asset_metadata JSONB DEFAULT '{}'::jsonb,
  license TEXT NOT NULL DEFAULT 'copyleft',
  allow_remix BOOLEAN NOT NULL DEFAULT true,
  device_id TEXT,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  local_created_at TIMESTAMPTZ,
  local_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- 3. SLEEP SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sleep_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_report_score INTEGER CHECK (user_report_score BETWEEN 1 AND 10),
  calibration_offset NUMERIC(5,2) NOT NULL DEFAULT 0,
  calibrated_score INTEGER,
  circadian_alignment_score INTEGER CHECK (circadian_alignment_score BETWEEN 0 AND 100),
  chronotype_estimate TEXT CHECK (chronotype_estimate IN ('early-bird', 'intermediate', 'night-owl')),
  source TEXT NOT NULL DEFAULT 'manual',
  wearable_provider TEXT,
  device_id TEXT,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  morning_check_in JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- 4. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT NOT NULL DEFAULT 'en',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NOT NULL DEFAULT false,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  bedtime_reminder_time TIME DEFAULT '22:00',
  wake_window_start TIME DEFAULT '06:30',
  wake_window_end TIME DEFAULT '07:30',
  target_sleep_duration_hours NUMERIC(3,1) DEFAULT 8.0,
  enable_smart_wake BOOLEAN NOT NULL DEFAULT true,
  enable_dream_capture BOOLEAN NOT NULL DEFAULT true,
  enable_circadian_coaching BOOLEAN NOT NULL DEFAULT true,
  enable_motion_sensor BOOLEAN NOT NULL DEFAULT false,
  enable_audio_recording BOOLEAN NOT NULL DEFAULT false,
  enable_wearable_sync BOOLEAN NOT NULL DEFAULT false,
  privacy_consent BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  analytics_allowed BOOLEAN NOT NULL DEFAULT false,
  display_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. NFTS TABLE (on-chain references)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  nft_id TEXT NOT NULL UNIQUE,
  owner_address TEXT NOT NULL,
  creator_address TEXT NOT NULL,
  contract_address TEXT,
  token_id TEXT,
  tx_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  license TEXT NOT NULL DEFAULT 'copyleft',
  allow_remix BOOLEAN NOT NULL DEFAULT true,
  parents TEXT[] DEFAULT '{}',
  royalty_splits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Dreams indexes
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON public.dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON public.dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_category ON public.dreams(category);
CREATE INDEX IF NOT EXISTS idx_dreams_is_deleted ON public.dreams(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_dreams_visibility ON public.dreams(visibility);

-- Sleep sessions indexes
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON public.sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_sleep_start ON public.sleep_sessions(sleep_start DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_is_active ON public.sleep_sessions(is_active) WHERE is_active = true;

-- NFTs indexes
CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON public.nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON public.nfts(owner_address);
CREATE INDEX IF NOT EXISTS idx_nfts_status ON public.nfts(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Dreams: users can only see/edit their own dreams
CREATE POLICY "Users can view own dreams" ON public.dreams
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dreams" ON public.dreams
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dreams" ON public.dreams
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dreams" ON public.dreams
  FOR DELETE USING (auth.uid() = user_id);

-- Public dreams: anyone can view public dreams
CREATE POLICY "Public dreams are viewable" ON public.dreams
  FOR SELECT USING (visibility = 'public');

-- Sleep sessions: users can only see/edit their own sessions
CREATE POLICY "Users can view own sleep sessions" ON public.sleep_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep sessions" ON public.sleep_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sleep sessions" ON public.sleep_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep sessions" ON public.sleep_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- User settings: users can only see/edit their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- NFTs: users can only see/edit their own NFTs
CREATE POLICY "Users can view own NFTs" ON public.nfts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own NFTs" ON public.nfts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own NFTs" ON public.nfts
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
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
-- AUTH HOOK: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Dreamer'));
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
