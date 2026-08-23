-- Credits + billing lockdown
-- 1. Users cannot self-assign subscription_tier
-- 2. credit_accounts + credit_ledger (source of truth for image credits)
-- 3. RPCs to consume / grant / refund credits

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_credit_allotment INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS monthly_credits_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_allotment_month TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM'),
  ADD COLUMN IF NOT EXISTS purchased_credits INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_monthly_after INTEGER NOT NULL DEFAULT 0,
  balance_purchased_after INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_profile_created
  ON public.credit_ledger (profile_id, created_at DESC);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
  FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Lock subscription fields from client updates (service_role still bypasses RLS)
CREATE OR REPLACE FUNCTION public.prevent_billing_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(current_setting('request.jwt.claims', true), '')::text LIKE '%service_role%'
       OR current_setting('everdream.billing_ok', true) = '1'
       OR current_user IN ('postgres', 'supabase_admin') THEN
      RETURN NEW;
    END IF;
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
       OR NEW.subscription_source IS DISTINCT FROM OLD.subscription_source
       OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.purchased_credits IS DISTINCT FROM OLD.purchased_credits
       OR NEW.monthly_credits_used IS DISTINCT FROM OLD.monthly_credits_used
       OR NEW.monthly_credit_allotment IS DISTINCT FROM OLD.monthly_credit_allotment THEN
      RAISE EXCEPTION 'Permission denied: billing fields are server-managed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_billing_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_billing_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_escalation();

CREATE OR REPLACE FUNCTION public.monthly_allotment_for_tier(tier TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN tier = 'pro' THEN 120
    WHEN tier = 'plus' THEN 40
    ELSE 8
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_credit_month(p public.profiles)
RETURNS public.profiles
LANGUAGE plpgsql
AS $$
DECLARE
  month_key TEXT := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM');
  allotment INTEGER;
BEGIN
  allotment := public.monthly_allotment_for_tier(COALESCE(p.subscription_tier, 'free'));
  IF p.credit_allotment_month IS DISTINCT FROM month_key THEN
    p.credit_allotment_month := month_key;
    p.monthly_credits_used := 0;
    p.monthly_credit_allotment := allotment;
  ELSIF p.monthly_credit_allotment IS DISTINCT FROM allotment THEN
    p.monthly_credit_allotment := allotment;
  END IF;
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_credit_balance()
RETURNS TABLE (
  monthly_allotment INTEGER,
  monthly_used INTEGER,
  monthly_remaining INTEGER,
  purchased_credits INTEGER,
  total_remaining INTEGER,
  allotment_month TEXT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.profiles;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE auth_user_id = auth.uid();
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  UPDATE public.profiles SET
    credit_allotment_month = p.credit_allotment_month,
    monthly_credits_used = p.monthly_credits_used,
    monthly_credit_allotment = p.monthly_credit_allotment
  WHERE id = p.id;

  monthly_allotment := p.monthly_credit_allotment;
  monthly_used := p.monthly_credits_used;
  monthly_remaining := GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0);
  purchased_credits := p.purchased_credits;
  total_remaining := monthly_remaining + p.purchased_credits;
  allotment_month := p.credit_allotment_month;
  tier := p.subscription_tier;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_image_credits(amount INTEGER, reason TEXT DEFAULT 'image_generation')
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
  IF amount IS NULL OR amount < 1 THEN
    RAISE EXCEPTION 'amount must be >= 1';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE auth_user_id = auth.uid();
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
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
    need := 0;
  ELSE
    p.monthly_credits_used := p.monthly_credits_used + monthly_left;
    need := need - monthly_left;
    p.purchased_credits := p.purchased_credits - need;
    need := 0;
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

CREATE OR REPLACE FUNCTION public.refund_image_credits(amount INTEGER, reason TEXT DEFAULT 'refund')
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
  IF p.id IS NULL THEN RETURN; END IF;
  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  -- Refund into purchased so monthly caps stay honest
  p.purchased_credits := p.purchased_credits + amount;
  UPDATE public.profiles SET purchased_credits = p.purchased_credits WHERE id = p.id;
  INSERT INTO public.credit_ledger (
    profile_id, delta, balance_monthly_after, balance_purchased_after, reason
  ) VALUES (
    p.id,
    amount,
    GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0),
    p.purchased_credits,
    reason
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
  target_profile UUID,
  amount INTEGER,
  reason TEXT DEFAULT 'purchase'
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
  SELECT * INTO p FROM public.profiles WHERE id = target_profile;
  IF p.id IS NULL THEN RETURN; END IF;
  PERFORM set_config('everdream.billing_ok', '1', true);
  p := public.ensure_credit_month(p);
  p.purchased_credits := p.purchased_credits + amount;
  UPDATE public.profiles SET
    purchased_credits = p.purchased_credits,
    monthly_credit_allotment = p.monthly_credit_allotment,
    credit_allotment_month = p.credit_allotment_month
  WHERE id = p.id;
  INSERT INTO public.credit_ledger (
    profile_id, delta, balance_monthly_after, balance_purchased_after, reason
  ) VALUES (
    p.id,
    amount,
    GREATEST(p.monthly_credit_allotment - p.monthly_credits_used, 0),
    p.purchased_credits,
    reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_image_credits(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_image_credits(INTEGER, TEXT) TO authenticated;

-- Drop dangerous demo-wide-open policies if they still exist
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ed_analytics_events','ed_analytics_sessions','ed_performance_metrics']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "demo anon insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "demo anon update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "demo anon select" ON public.%I', t);
    END IF;
  END LOOP;
END $$;
