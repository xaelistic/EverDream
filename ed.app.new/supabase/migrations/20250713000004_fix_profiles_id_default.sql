-- profiles.id lost its default during legacy re-key migration; signup trigger INSERT failed.

ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

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

  new_profile_id := gen_random_uuid();

  INSERT INTO public.profiles (
    id,
    auth_user_id,
    display_name,
    avatar_url,
    email,
    tradition,
    circadian_goal,
    is_admin,
    subscription_tier
  )
  VALUES (
    new_profile_id,
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'dreamer'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'tradition', 'general'),
    COALESCE(NEW.raw_user_meta_data->>'circadian_goal', 'better_dreams'),
    meta_admin,
    meta_tier
  );

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