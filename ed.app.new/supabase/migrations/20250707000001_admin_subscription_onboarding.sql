-- ============================================================
-- EverDream — Admin accounts, subscription tiers, onboarding
-- Enables test accounts with full feature access without payment
-- ============================================================

-- Onboarding + account metadata on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('female', 'male', 'non-binary', 'prefer-not')),
  ADD COLUMN IF NOT EXISTS onboarding_goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS average_sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'plus', 'pro'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Copy signup metadata into profile (used by seed script + admin creation)
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
    is_admin,
    subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), 'dreamer'),
    meta_admin,
    meta_tier
  )
  RETURNING id INTO new_profile_id;

  INSERT INTO public.user_settings (user_id)
  VALUES (new_profile_id);

  -- Admin / paid tiers get all feature flags enabled for testing
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can read analytics tables (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ed_analytics_events') THEN
    DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.ed_analytics_events;
    CREATE POLICY "Admins can view all analytics events"
      ON public.ed_analytics_events FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE auth_user_id = auth.uid() AND is_admin = true
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ed_analytics_sessions') THEN
    DROP POLICY IF EXISTS "Admins can view all analytics sessions" ON public.ed_analytics_sessions;
    CREATE POLICY "Admins can view all analytics sessions"
      ON public.ed_analytics_sessions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE auth_user_id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;