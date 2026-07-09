-- Manual admin setup (run in Supabase SQL Editor AFTER creating the user in Auth dashboard)
-- 1. Authentication → Users → Add user: admin@everdream.test / EverDream!Test2026
-- 2. Run this SQL (replace email if different)

UPDATE public.profiles p
SET
  display_name = 'EverDream Admin',
  is_admin = true,
  subscription_tier = 'pro',
  updated_at = now()
FROM auth.users u
WHERE p.auth_user_id = u.id
  AND u.email = 'admin@everdream.test';

UPDATE public.user_settings us
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
  notifications_enabled = true,
  updated_at = now()
FROM public.profiles p
JOIN auth.users u ON u.id = p.auth_user_id
WHERE us.user_id = p.id
  AND u.email = 'admin@everdream.test';