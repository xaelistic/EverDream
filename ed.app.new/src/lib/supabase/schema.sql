-- EverDream Supabase Database Schema
-- Supports: dream journaling, sleep tracking, 35-day retention, multi-device sync

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT 'dreamer',
  avatar_url TEXT,
  tradition TEXT DEFAULT 'general' CHECK (tradition IN ('buddhist', 'celtic', 'scientific', 'general')),
  circadian_goal TEXT DEFAULT 'better_dreams',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DREAMS (35-day retention enforced via RLS + cron)
-- ============================================================
CREATE TABLE IF NOT EXISTS dreams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core content
  content TEXT NOT NULL DEFAULT '',
  transcript TEXT,
  capture_mode TEXT NOT NULL DEFAULT 'text' CHECK (capture_mode IN ('text', 'audio', 'video')),

  -- AI analysis results
  category TEXT DEFAULT 'uncategorized',
  themes TEXT[] DEFAULT '{}',
  emotion TEXT DEFAULT 'neutral',
  symbols TEXT[] DEFAULT '{}',
  narrative TEXT,
  nugget TEXT,
  interpretation JSONB DEFAULT '{}',
  ai_confidence NUMERIC(3,2) DEFAULT 0,

  -- Lucidity & context
  lucidity_level NUMERIC(3,2) DEFAULT 0 CHECK (lucidity_level >= 0 AND lucidity_level <= 1),
  pre_sleep_intent TEXT,
  pre_sleep_note TEXT,
  mood_valence INTEGER,
  context JSONB DEFAULT '{}',

  -- Media
  media_urls JSONB DEFAULT '[]',
  generated_image_url TEXT,
  generated_image_prompt TEXT,
  generated_image_style TEXT,
  generated_image_source TEXT,

  -- Sleep linkage
  sleep_session_id UUID,
  sleep_score INTEGER,
  sleep_duration_minutes INTEGER,
  rem_minutes INTEGER,

  -- Provenance & sharing
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'trusted', 'public')),
  watermark JSONB DEFAULT '{}',
  asset_metadata JSONB DEFAULT '{}',
  license TEXT DEFAULT 'copyleft',
  allow_remix BOOLEAN DEFAULT true,

  -- Sync & lifecycle
  device_id TEXT,
  is_sample BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  local_created_at TIMESTAMPTZ,
  local_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '35 days')
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_expires_at ON dreams(expires_at);
CREATE INDEX IF NOT EXISTS idx_dreams_user_created ON dreams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_themes ON dreams USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_dreams_category ON dreams(category);
CREATE INDEX IF NOT EXISTS idx_dreams_visibility ON dreams(visibility) WHERE visibility != 'private';

-- ============================================================
-- SLEEP SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timing
  sleep_start TIMESTAMPTZ NOT NULL,
  sleep_end TIMESTAMPTZ,
  time_in_bed_minutes INTEGER,

  -- Stage breakdown
  awake_minutes INTEGER DEFAULT 0,
  light_minutes INTEGER DEFAULT 0,
  deep_minutes INTEGER DEFAULT 0,
  rem_minutes INTEGER DEFAULT 0,
  total_sleep_minutes INTEGER DEFAULT 0,

  -- Quality metrics
  sleep_efficiency NUMERIC(5,2),
  awakenings INTEGER DEFAULT 0,
  waso_minutes INTEGER DEFAULT 0,
  movement_index NUMERIC(5,2),
  heart_rate_avg INTEGER,
  heart_rate_variability NUMERIC(5,2),

  -- Scoring
  algorithmic_score INTEGER CHECK (algorithmic_score >= 0 AND algorithmic_score <= 100),
  user_report_score INTEGER CHECK (user_report_score >= 1 AND user_report_score <= 10),
  calibration_offset NUMERIC(5,2) DEFAULT 0,
  calibrated_score INTEGER,

  -- Circadian
  circadian_alignment_score NUMERIC(5,2),
  chronotype_estimate TEXT CHECK (chronotype_estimate IN ('early-bird', 'intermediate', 'night-owl')),

  -- Source
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'browser-estimate', 'wearable', 'native-device')),
  wearable_provider TEXT,
  device_id TEXT,

  -- Linkage
  dream_id UUID REFERENCES dreams(id) ON DELETE SET NULL,
  morning_check_in JSONB DEFAULT '{}',

  -- Lifecycle
  is_active BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '35 days')
);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_sleep_start ON sleep_sessions(sleep_start DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_expires_at ON sleep_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_date ON sleep_sessions(user_id, sleep_start DESC);

-- ============================================================
-- SYNC LOG (for conflict resolution)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  device_id TEXT,
  local_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_synced ON sync_log(user_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_record ON sync_log(table_name, record_id);

-- ============================================================
-- USER SETTINGS (synced across devices)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Alarm & schedule
  alarm_time TEXT DEFAULT '07:00',
  alarm_enabled BOOLEAN DEFAULT true,
  preferred_bedtime TEXT DEFAULT '22:00',
  preferred_wake_time TEXT DEFAULT '06:30',

  -- Preferences
  music_preference TEXT DEFAULT 'peaceful',
  notifications_enabled BOOLEAN DEFAULT true,
  image_generation_enabled BOOLEAN DEFAULT true,

  -- Privacy
  data_processing_consent BOOLEAN DEFAULT false,
  ai_analysis_enabled BOOLEAN DEFAULT true,
  wearable_sync_enabled BOOLEAN DEFAULT false,
  anonymous_analytics BOOLEAN DEFAULT false,

  -- Sleep module
  sleep_tracking_enabled BOOLEAN DEFAULT false,
  motion_sensor_enabled BOOLEAN DEFAULT true,
  audio_recording_enabled BOOLEAN DEFAULT true,
  smart_wake_enabled BOOLEAN DEFAULT false,
  circadian_coaching_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- N8N WEBHOOK EVENTS (outbound event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  response_code INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON webhook_events(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Dreams: users can only CRUD their own
CREATE POLICY "Users can view own dreams" ON dreams FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own dreams" ON dreams FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own dreams" ON dreams FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own dreams" ON dreams FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Public dreams: anyone can view
CREATE POLICY "Public dreams are viewable" ON dreams FOR SELECT USING (visibility = 'public');

-- Sleep sessions: users can only CRUD their own
CREATE POLICY "Users can view own sleep" ON sleep_sessions FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own sleep" ON sleep_sessions FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own sleep" ON sleep_sessions FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own sleep" ON sleep_sessions FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Settings: users can only CRUD their own
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Sync log: users can only see their own
CREATE POLICY "Users can view own sync log" ON sync_log FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert sync log" ON sync_log FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Webhook events: users can only see their own
CREATE POLICY "Users can view own webhooks" ON webhook_events FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert webhooks" ON webhook_events FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR user_id IS NULL);

-- ============================================================
-- 35-DAY RETENTION: Auto-cleanup function
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
  -- Soft-delete expired dreams (keep for 7 more days as "archived")
  UPDATE dreams SET is_deleted = true, updated_at = NOW()
  WHERE expires_at < NOW() AND is_deleted = false;

  -- Soft-delete expired sleep sessions
  UPDATE sleep_sessions SET is_deleted = true, updated_at = NOW()
  WHERE expires_at < NOW() AND is_deleted = false;

  -- Hard-delete records that have been soft-deleted for 7+ days
  DELETE FROM dreams WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';
  DELETE FROM sleep_sessions WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '7 days';

  -- Clean up old sync logs (keep 30 days)
  DELETE FROM sync_log WHERE synced_at < NOW() - INTERVAL '30 days';

  -- Clean up sent webhook events (keep 7 days)
  DELETE FROM webhook_events WHERE status = 'sent' AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dreams_updated_at BEFORE UPDATE ON dreams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sleep_sessions_updated_at BEFORE UPDATE ON sleep_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGERS: Auto-set expires_at on insert
-- ============================================================
CREATE OR REPLACE FUNCTION set_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '35 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dreams_expires_at BEFORE INSERT ON dreams FOR EACH ROW EXECUTE FUNCTION set_expires_at();
CREATE TRIGGER set_sleep_sessions_expires_at BEFORE INSERT ON sleep_sessions FOR EACH ROW EXECUTE FUNCTION set_expires_at();

-- ============================================================
-- NFTs
-- ============================================================
CREATE TABLE IF NOT EXISTS nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id UUID REFERENCES dreams(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  parent_nft_ids TEXT[] DEFAULT '{}',
  royalty_splits JSONB,
  license TEXT DEFAULT 'copyleft',
  allow_remix BOOLEAN DEFAULT true,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_dream_id ON nfts(dream_id);
CREATE INDEX IF NOT EXISTS idx_nfts_status ON nfts(status);

-- ============================================================
-- DREAM ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS dream_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dream_id UUID REFERENCES dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_dream_assets_dream_id ON dream_assets(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_user_id ON dream_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_status ON dream_assets(status);

-- ============================================================
-- ROW LEVEL SECURITY: NFTs & Dream Assets
-- ============================================================
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nfts" ON nfts FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own nfts" ON nfts FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own nfts" ON nfts FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own nfts" ON nfts FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can view own dream_assets" ON dream_assets FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own dream_assets" ON dream_assets FOR INSERT WITH CHECK (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own dream_assets" ON dream_assets FOR UPDATE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own dream_assets" ON dream_assets FOR DELETE USING (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- ============================================================
-- TRIGGER: Auto-update updated_at for nfts
-- ============================================================
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
