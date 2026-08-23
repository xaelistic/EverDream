-- Free tier: one-time starter credits (~two weeks of nightly images), no monthly refill.

CREATE OR REPLACE FUNCTION public.monthly_allotment_for_tier(tier TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN tier = 'pro' THEN 120
    WHEN tier = 'plus' THEN 40
    ELSE 0
  END;
$$;

UPDATE public.profiles
SET
  monthly_credit_allotment = 0,
  credit_allotment_month = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM')
WHERE COALESCE(subscription_tier, 'free') = 'free';

-- Grant a 14-credit starter pack once if they have almost none banked.
UPDATE public.profiles
SET purchased_credits = purchased_credits + 14
WHERE COALESCE(subscription_tier, 'free') = 'free'
  AND purchased_credits < 8;

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
    subscription_tier,
    monthly_credit_allotment,
    purchased_credits,
    credit_allotment_month
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
    meta_tier,
    public.monthly_allotment_for_tier(meta_tier),
    CASE WHEN meta_tier = 'free' THEN 14 ELSE 0 END,
    to_char(now() AT TIME ZONE 'utc', 'YYYY-MM')
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (new_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
