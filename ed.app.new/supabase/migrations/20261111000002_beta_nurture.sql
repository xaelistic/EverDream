-- Beta nurture: welcome on join, then day 7, day 14, and day 21.
-- One due letter per person per send run, so a late start does not dump the whole sequence.

ALTER TABLE public.website_signups
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();

UPDATE public.website_signups
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

ALTER TABLE public.website_signups
  ALTER COLUMN unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS website_signups_unsubscribe_token_key
  ON public.website_signups (unsubscribe_token);

CREATE TABLE IF NOT EXISTS public.newsletter_steps (
  step_key TEXT PRIMARY KEY,
  funnel_step TEXT NOT NULL,
  day_offset INTEGER NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id UUID NOT NULL REFERENCES public.website_signups(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL REFERENCES public.newsletter_steps(step_key),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_sends_signup_step_key UNIQUE (signup_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_due
  ON public.newsletter_sends (scheduled_for)
  WHERE status = 'scheduled';

ALTER TABLE public.newsletter_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages newsletter steps" ON public.newsletter_steps;
CREATE POLICY "Service role manages newsletter steps"
  ON public.newsletter_steps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages newsletter sends" ON public.newsletter_sends;
CREATE POLICY "Service role manages newsletter sends"
  ON public.newsletter_sends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.newsletter_steps FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.newsletter_sends FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.newsletter_steps TO service_role;
GRANT ALL ON TABLE public.newsletter_sends TO service_role;

INSERT INTO public.newsletter_steps (step_key, funnel_step, day_offset, subject, preheader, sort_order)
VALUES
  ('welcome', 'Subscribe', 0, 'You’re on the EverDream beta list', 'A welcome now, then one note a week for three weeks.', 0),
  ('capture', 'Activate', 7, 'Write one dream before it fades', 'Tomorrow morning, a few sentences are enough.', 1),
  ('picture', 'Engage', 14, 'Turn one dream into a picture', 'Writing stays free. One image is enough this week.', 2),
  ('circle', 'Stay', 21, 'Tell us what to keep', 'The last note in this sequence. One reply is enough.', 3)
ON CONFLICT (step_key) DO UPDATE SET
  funnel_step = EXCLUDED.funnel_step,
  day_offset = EXCLUDED.day_offset,
  subject = EXCLUDED.subject,
  preheader = EXCLUDED.preheader,
  sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION public.enqueue_beta_nurture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.beta_newsletter IS NOT TRUE OR NEW.unsubscribed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.beta_newsletter, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.newsletter_sends (signup_id, step_key, scheduled_for)
  SELECT NEW.id, step_key, now() + make_interval(days => day_offset)
  FROM public.newsletter_steps
  ON CONFLICT (signup_id, step_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_beta_nurture ON public.website_signups;
CREATE TRIGGER trg_enqueue_beta_nurture
  AFTER INSERT OR UPDATE OF beta_newsletter ON public.website_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_beta_nurture();

INSERT INTO public.newsletter_sends (signup_id, step_key, scheduled_for)
SELECT s.id, n.step_key, s.created_at + make_interval(days => n.day_offset)
FROM public.website_signups s
CROSS JOIN public.newsletter_steps n
WHERE s.beta_newsletter
  AND s.unsubscribed_at IS NULL
ON CONFLICT (signup_id, step_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_due_newsletters(batch INTEGER, only_email TEXT DEFAULT NULL)
RETURNS TABLE (
  send_id UUID,
  step_key TEXT,
  attempts INTEGER,
  email TEXT,
  unsubscribe_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim INTEGER := LEAST(GREATEST(coalesce(batch, 25), 1), 50);
BEGIN
  PERFORM public.assert_service_role();

  UPDATE public.newsletter_sends
  SET status = 'scheduled', updated_at = now()
  WHERE status = 'sending'
    AND updated_at < now() - interval '30 minutes';

  RETURN QUERY
  WITH due AS (
    SELECT ns.id
    FROM public.newsletter_sends ns
    JOIN public.website_signups w ON w.id = ns.signup_id
    WHERE ns.status = 'scheduled'
      AND ns.scheduled_for <= now()
      AND ns.attempts < 5
      AND w.beta_newsletter
      AND w.unsubscribed_at IS NULL
      AND (only_email IS NULL OR w.email = lower(trim(only_email)))
      AND ns.id = (
        SELECT ns2.id
        FROM public.newsletter_sends ns2
        WHERE ns2.signup_id = ns.signup_id
          AND ns2.status = 'scheduled'
          AND ns2.scheduled_for <= now()
          AND ns2.attempts < 5
        ORDER BY ns2.scheduled_for, ns2.step_key
        LIMIT 1
      )
    ORDER BY ns.scheduled_for
    LIMIT lim
    FOR UPDATE OF ns SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.newsletter_sends s
    SET status = 'sending', updated_at = now()
    FROM due
    WHERE s.id = due.id
    RETURNING s.id, s.step_key, s.attempts, s.signup_id
  )
  SELECT c.id, c.step_key, c.attempts, w.email, w.unsubscribe_token
  FROM claimed c
  JOIN public.website_signups w ON w.id = c.signup_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_newsletter_send(
  target UUID,
  ok BOOLEAN,
  error_text TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_service_role();
  IF ok THEN
    UPDATE public.newsletter_sends
    SET status = 'sent', sent_at = now(), last_error = NULL, updated_at = now()
    WHERE id = target AND status = 'sending';
    RETURN;
  END IF;

  UPDATE public.newsletter_sends
  SET
    attempts = attempts + 1,
    status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'scheduled' END,
    last_error = nullif(left(coalesce(error_text, ''), 300), ''),
    updated_at = now()
  WHERE id = target AND status = 'sending';
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_beta_newsletter(token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id UUID;
BEGIN
  PERFORM public.assert_service_role();
  UPDATE public.website_signups
  SET unsubscribed_at = coalesce(unsubscribed_at, now()),
      updated_at = now()
  WHERE unsubscribe_token = token
  RETURNING id INTO found_id;

  IF found_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.newsletter_sends
  SET status = 'cancelled', updated_at = now()
  WHERE signup_id = found_id
    AND status IN ('scheduled', 'sending');

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_newsletters(INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_newsletter_send(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_beta_newsletter(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_newsletters(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_newsletter_send(UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_beta_newsletter(UUID) TO service_role;
