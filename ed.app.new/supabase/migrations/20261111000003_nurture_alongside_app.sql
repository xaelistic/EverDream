-- Keep the beta letters on the same path as the app.
-- Opening a letter does not complete a step. A dream in the journal skips the
-- day-7 capture note. An image on a dream skips the day-14 picture note.
-- notifications_enabled = false skips both. Welcome and the day-21 note still send.
-- No user_settings row means notifications stay on.

CREATE OR REPLACE FUNCTION public.skip_nurture_covered_by_app(for_profile UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.newsletter_sends ns
  SET status = 'skipped',
      last_error = 'already_captured',
      updated_at = now()
  FROM public.website_signups w
  WHERE ns.signup_id = w.id
    AND ns.status = 'scheduled'
    AND ns.step_key = 'capture'
    AND w.profile_id IS NOT NULL
    AND (for_profile IS NULL OR w.profile_id = for_profile)
    AND EXISTS (
      SELECT 1
      FROM public.dreams d
      WHERE d.user_id = w.profile_id
        AND d.is_deleted = false
    );

  UPDATE public.newsletter_sends ns
  SET status = 'skipped',
      last_error = 'already_pictured',
      updated_at = now()
  FROM public.website_signups w
  WHERE ns.signup_id = w.id
    AND ns.status = 'scheduled'
    AND ns.step_key = 'picture'
    AND w.profile_id IS NOT NULL
    AND (for_profile IS NULL OR w.profile_id = for_profile)
    AND EXISTS (
      SELECT 1
      FROM public.dreams d
      WHERE d.user_id = w.profile_id
        AND d.is_deleted = false
        AND nullif(d.generated_image_url, '') IS NOT NULL
    );

  UPDATE public.newsletter_sends ns
  SET status = 'skipped',
      last_error = 'app_notifications_off',
      updated_at = now()
  FROM public.website_signups w
  JOIN public.user_settings us ON us.user_id = w.profile_id
  WHERE ns.signup_id = w.id
    AND ns.status = 'scheduled'
    AND ns.step_key IN ('capture', 'picture')
    AND w.profile_id IS NOT NULL
    AND (for_profile IS NULL OR w.profile_id = for_profile)
    AND us.notifications_enabled = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_nurture_for_dream()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.is_deleted THEN
    RETURN NEW;
  END IF;
  PERFORM public.skip_nurture_covered_by_app(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.skip_nurture_when_notifications_off()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.notifications_enabled = false AND TG_OP = 'INSERT' THEN
    PERFORM public.skip_nurture_covered_by_app(NEW.user_id);
  ELSIF TG_OP = 'UPDATE'
    AND NEW.notifications_enabled = false
    AND OLD.notifications_enabled IS DISTINCT FROM false THEN
    PERFORM public.skip_nurture_covered_by_app(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skip_nurture_on_dream ON public.dreams;
CREATE TRIGGER trg_skip_nurture_on_dream
  AFTER INSERT OR UPDATE OF generated_image_url ON public.dreams
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_nurture_for_dream();

DROP TRIGGER IF EXISTS trg_skip_nurture_when_notifications_off ON public.user_settings;
CREATE TRIGGER trg_skip_nurture_when_notifications_off
  AFTER INSERT OR UPDATE OF notifications_enabled ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.skip_nurture_when_notifications_off();

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

  PERFORM public.skip_nurture_covered_by_app(NULL);

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

REVOKE ALL ON FUNCTION public.skip_nurture_covered_by_app(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.skip_nurture_covered_by_app(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.skip_nurture_for_dream() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.skip_nurture_for_dream() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.skip_nurture_when_notifications_off() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.skip_nurture_when_notifications_off() TO authenticated, service_role;

SELECT public.skip_nurture_covered_by_app(NULL);

NOTIFY pgrst, 'reload schema';
