-- ============================================================
-- EverDream — Align legacy Coolify production schema with app
-- Migrates profiles.id (= auth uid) → profiles.auth_user_id + new id
-- Safe when dreams/sleep_sessions are empty (re-keys profile PKs)
-- ============================================================

BEGIN;

-- 1) Profiles: add app-expected columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS tradition TEXT,
  ADD COLUMN IF NOT EXISTS circadian_goal TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS average_sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_source TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS user_profile JSONB DEFAULT '{
    "recurring_themes": [],
    "sleep_patterns": {},
    "image_style_prefs": [],
    "emotional_tendencies": [],
    "key_insights": [],
    "last_updated": null,
    "version": 0
  }'::jsonb;

-- Backfill from legacy columns
UPDATE public.profiles
SET
  auth_user_id = COALESCE(auth_user_id, id),
  display_name = COALESCE(display_name, nickname, split_part(email, '@', 1), 'dreamer'),
  tradition = COALESCE(tradition, 'general'),
  circadian_goal = COALESCE(circadian_goal, 'better_dreams'),
  subscription_tier = COALESCE(subscription_tier, 'free')
WHERE auth_user_id IS NULL OR display_name IS NULL;

-- Re-key profiles: id was auth uid; app expects separate profile id
ALTER TABLE public.dreams DROP CONSTRAINT IF EXISTS dreams_user_id_fkey;
ALTER TABLE public.sleep_sessions DROP CONSTRAINT IF EXISTS sleep_sessions_user_id_fkey;
ALTER TABLE public.remix_registry DROP CONSTRAINT IF EXISTS remix_registry_creator_id_fkey;
ALTER TABLE public.sync_queue DROP CONSTRAINT IF EXISTS sync_queue_user_id_fkey;
ALTER TABLE public.function_rate_limits DROP CONSTRAINT IF EXISTS function_rate_limits_user_id_fkey;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_auth_id UUID;

UPDATE public.profiles
SET legacy_auth_id = COALESCE(legacy_auth_id, id)
WHERE legacy_auth_id IS NULL;

UPDATE public.profiles
SET id = gen_random_uuid()
WHERE legacy_auth_id = auth_user_id;

ALTER TABLE public.profiles
  ALTER COLUMN auth_user_id SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN tradition SET NOT NULL,
  ALTER COLUMN circadian_goal SET NOT NULL,
  ALTER COLUMN subscription_tier SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

ALTER TABLE public.dreams
  ADD CONSTRAINT dreams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sleep_sessions
  ADD CONSTRAINT sleep_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.remix_registry
  ADD CONSTRAINT remix_registry_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sync_queue
  ADD CONSTRAINT sync_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.function_rate_limits
  ADD CONSTRAINT function_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_user_profile ON public.profiles USING GIN (user_profile);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_subscription_tier_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_subscription_tier_check
      CHECK (subscription_tier IN ('free', 'plus', 'pro'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_gender_check
      CHECK (gender IS NULL OR gender IN ('female', 'male', 'non-binary', 'prefer-not'));
  END IF;
END $$;

-- 2) Dreams: add app-expected columns (legacy columns retained)
ALTER TABLE public.dreams
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS capture_mode TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS emotion TEXT DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS symbols TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nugget TEXT,
  ADD COLUMN IF NOT EXISTS interpretation JSONB,
  ADD COLUMN IF NOT EXISTS mood_valence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS generated_image_url TEXT,
  ADD COLUMN IF NOT EXISTS generated_image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generated_image_style TEXT DEFAULT 'dreamlike',
  ADD COLUMN IF NOT EXISTS generated_image_source TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS local_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3) user_settings (required by handle_new_user)
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.user_settings (user_id)
SELECT p.id
FROM public.profiles p
LEFT JOIN public.user_settings us ON us.user_id = p.id
WHERE us.id IS NULL;

-- 4) dream_assets (used by dream persistence)
CREATE TABLE IF NOT EXISTS public.dream_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  prompt TEXT,
  url TEXT,
  source TEXT,
  style TEXT DEFAULT 'dreamlike',
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.dream_assets ENABLE ROW LEVEL SECURITY;

-- 5) wearable_connections
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;

-- 6) handle_new_user — match app/repo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
  meta_tier TEXT;
  meta_admin BOOLEAN;
BEGIN
  meta_tier := COALESCE(NEW.raw_user_meta_data->>'subscription_tier', 'free');
  IF meta_tier NOT IN ('free', 'plus', 'pro') THEN
    meta_tier := 'free';
  END IF;

  meta_admin := COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false);

  INSERT INTO public.profiles (
    auth_user_id,
    display_name,
    avatar_url,
    email,
    is_admin,
    subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'dreamer'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email, ''),
    meta_admin,
    meta_tier
  )
  RETURNING id INTO new_profile_id;

  INSERT INTO public.user_settings (user_id)
  VALUES (new_profile_id)
  ON CONFLICT DO NOTHING;

  IF meta_admin OR meta_tier IN ('plus', 'pro') THEN
    UPDATE public.user_settings
    SET
      image_generation_enabled = true,
      ai_analysis_consent = true,
      data_processing_consent = true,
      wearable_sync = true,
      sleep_tracking_enabled = true,
      motion_sensor_enabled = true,
      audio_recording_enabled = true,
      smart_wake_enabled = true,
      circadian_coaching_enabled = true,
      notifications_enabled = true
    WHERE user_id = new_profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) RLS policies — profiles
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    AND (is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE auth_user_id = auth.uid()))
    AND (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()))
  );

-- 8) RLS — dreams (app uses profile id, not auth uid)
DROP POLICY IF EXISTS dreams_visible_by_privacy ON public.dreams;
DROP POLICY IF EXISTS dreams_self_insert ON public.dreams;
DROP POLICY IF EXISTS dreams_self_update ON public.dreams;
DROP POLICY IF EXISTS dreams_self_delete ON public.dreams;
DROP POLICY IF EXISTS "Users can view own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users can insert own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users can update own dreams" ON public.dreams;
DROP POLICY IF EXISTS "Users can delete own dreams" ON public.dreams;

CREATE POLICY "Users can view own dreams"
  ON public.dreams FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own dreams"
  ON public.dreams FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own dreams"
  ON public.dreams FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own dreams"
  ON public.dreams FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- 9) RLS — user_settings, dream_assets, wearable_connections
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own dream assets" ON public.dream_assets;
DROP POLICY IF EXISTS "Users can insert own dream assets" ON public.dream_assets;
CREATE POLICY "Users can view own dream assets" ON public.dream_assets FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own dream assets" ON public.dream_assets FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own wearable connections" ON public.wearable_connections;
DROP POLICY IF EXISTS "Users can insert own wearable connections" ON public.wearable_connections;
DROP POLICY IF EXISTS "Users can update own wearable connections" ON public.wearable_connections;
DROP POLICY IF EXISTS "Users can delete own wearable connections" ON public.wearable_connections;
CREATE POLICY "Users can view own wearable connections" ON public.wearable_connections FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert own wearable connections" ON public.wearable_connections FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update own wearable connections" ON public.wearable_connections FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can delete own wearable connections" ON public.wearable_connections FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- 10) C-1 trigger (idempotent)
CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR
       (NEW.role IS DISTINCT FROM OLD.role) THEN
      IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Permission denied: cannot modify is_admin or role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_escalation();

COMMIT;