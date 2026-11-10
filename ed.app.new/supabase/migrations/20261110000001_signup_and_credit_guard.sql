-- Signup must not honor client metadata for admin or paid tier.
-- Image and video debits for internal jobs go through service-role RPCs.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
BEGIN
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
    false,
    'free',
    0,
    14,
    to_char(now() AT TIME ZONE 'utc', 'YYYY-MM')
  );

  INSERT INTO public.user_settings (user_id)
  VALUES (new_profile_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.force_signup_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') IS DISTINCT FROM 'service_role' THEN
    NEW.is_admin := false;
    NEW.subscription_tier := 'free';
    NEW.monthly_credit_allotment := 0;
    NEW.monthly_credits_used := 0;
    NEW.purchased_credits := 14;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_signup_privileges ON public.profiles;
CREATE TRIGGER trg_force_signup_privileges
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.force_signup_privileges();

CREATE OR REPLACE FUNCTION public.assert_service_role()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_image_credits_for_profile(
  target_profile UUID,
  amount INTEGER,
  reason TEXT DEFAULT 'image_generation'
)
RETURNS TABLE (ok BOOLEAN, total_remaining INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
  monthly_left INTEGER;
  need INTEGER;
BEGIN
  PERFORM public.assert_service_role();
  IF amount IS NULL OR amount < 1 THEN
    RAISE EXCEPTION 'amount must be >= 1';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id = target_profile;
  IF p.id IS NULL THEN
    ok := false;
    total_remaining := 0;
    message := 'Profile not found';
    RETURN NEXT;
    RETURN;
  END IF;
  IF p.is_admin IS TRUE THEN
    ok := true;
    total_remaining := 999999;
    message := 'admin';
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  monthly_left := GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0);
  IF monthly_left + p.purchased_credits < amount THEN
    ok := false;
    total_remaining := monthly_left + p.purchased_credits;
    message := 'Not enough credits';
    RETURN NEXT;
    RETURN;
  END IF;

  need := amount;
  IF monthly_left >= need THEN
    p.monthly_credits_used := p.monthly_credits_used + need;
  ELSE
    p.monthly_credits_used := p.monthly_credits_used + monthly_left;
    need := need - monthly_left;
    p.purchased_credits := p.purchased_credits - need;
  END IF;

  UPDATE public.profiles SET
    monthly_credits_used = p.monthly_credits_used,
    purchased_credits = p.purchased_credits,
    monthly_credit_allotment = p.monthly_credit_allotment,
    credit_allotment_month = p.credit_allotment_month
  WHERE id = p.id;

  INSERT INTO public.credit_ledger (
    profile_id, delta, balance_monthly_after, balance_purchased_after, reason
  ) VALUES (
    p.id,
    -amount,
    GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0),
    p.purchased_credits,
    reason
  );

  ok := true;
  total_remaining := GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0) + p.purchased_credits;
  message := 'ok';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_image_credits_for_profile(
  target_profile UUID,
  amount INTEGER,
  reason TEXT DEFAULT 'refund',
  job_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
BEGIN
  PERFORM public.assert_service_role();
  IF amount IS NULL OR amount < 1 THEN RETURN; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = target_profile;
  IF p.id IS NULL OR p.is_admin IS TRUE THEN RETURN; END IF;
  IF job_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE profile_id = p.id
      AND delta < 0
      AND metadata->>'job_key' = job_key
  ) THEN
    RETURN;
  END IF;
  IF job_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE profile_id = p.id
      AND reason = reason
      AND metadata->>'job_key' = job_key
  ) THEN
    RETURN;
  END IF;
  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  p.purchased_credits := p.purchased_credits + amount;
  UPDATE public.profiles SET purchased_credits = p.purchased_credits WHERE id = p.id;
  INSERT INTO public.credit_ledger (
    profile_id, delta, balance_monthly_after, balance_purchased_after, reason, metadata
  ) VALUES (
    p.id,
    amount,
    GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0),
    p.purchased_credits,
    reason,
    CASE WHEN job_key IS NULL THEN NULL ELSE jsonb_build_object('job_key', job_key) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_image_credits_once(
  amount INTEGER,
  reason TEXT DEFAULT 'refund',
  job_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
BEGIN
  IF amount IS NULL OR amount < 1 THEN RETURN; END IF;
  SELECT * INTO p FROM public.profiles WHERE auth_user_id = auth.uid();
  IF p.id IS NULL OR p.is_admin IS TRUE THEN RETURN; END IF;
  IF job_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE profile_id = p.id
      AND reason = reason
      AND metadata->>'job_key' = job_key
  ) THEN
    RETURN;
  END IF;
  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  p.purchased_credits := p.purchased_credits + amount;
  UPDATE public.profiles SET purchased_credits = p.purchased_credits WHERE id = p.id;
  INSERT INTO public.credit_ledger (
    profile_id, delta, balance_monthly_after, balance_purchased_after, reason, metadata
  ) VALUES (
    p.id,
    amount,
    GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0),
    p.purchased_credits,
    reason,
    CASE WHEN job_key IS NULL THEN NULL ELSE jsonb_build_object('job_key', job_key) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_credit_job_key(
  target_profile UUID,
  reason TEXT,
  job_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ledger_id UUID;
BEGIN
  PERFORM public.assert_service_role();
  IF job_key IS NULL OR length(trim(job_key)) = 0 THEN RETURN; END IF;
  SELECT id INTO ledger_id
  FROM public.credit_ledger
  WHERE profile_id = target_profile
    AND reason = reason
    AND delta < 0
    AND (metadata IS NULL OR metadata->>'job_key' IS NULL)
  ORDER BY created_at DESC
  LIMIT 1;
  IF ledger_id IS NULL THEN RETURN; END IF;
  UPDATE public.credit_ledger
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('job_key', job_key)
  WHERE id = ledger_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_image_credits_for_profile(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_credit_job_key(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_image_credits_for_profile(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_image_credits_once(INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_image_credits_for_profile(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_credit_job_key(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_image_credits_for_profile(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_image_credits_once(INTEGER, TEXT, TEXT) TO service_role;
