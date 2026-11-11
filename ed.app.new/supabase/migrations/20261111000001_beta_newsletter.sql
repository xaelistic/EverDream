-- Beta newsletter waitlist.
-- The marketing site joins this list through record_website_signup.
-- source beta-newsletter, newsletter, or beta sets the flag.
-- A later signup with the same email keeps the flag on.

ALTER TABLE public.website_signups
  ADD COLUMN IF NOT EXISTS beta_newsletter BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_website_signups_beta_newsletter
  ON public.website_signups (created_at DESC)
  WHERE beta_newsletter;

CREATE OR REPLACE FUNCTION public.record_website_signup(
  signup_email TEXT,
  signup_source TEXT DEFAULT 'website',
  signup_page TEXT DEFAULT NULL,
  signup_referral TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_email TEXT := lower(trim(coalesce(signup_email, '')));
  clean_source TEXT := left(coalesce(nullif(trim(signup_source), ''), 'website'), 40);
  clean_page TEXT := nullif(left(trim(coalesce(signup_page, '')), 200), '');
  clean_referral TEXT := nullif(left(upper(trim(coalesce(signup_referral, ''))), 32), '');
  join_beta BOOLEAN := clean_source IN ('beta-newsletter', 'newsletter', 'beta');
  matched_profile UUID;
  signup_id UUID;
BEGIN
  PERFORM public.assert_service_role();
  IF clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(clean_email) > 254 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  SELECT id INTO matched_profile
  FROM public.profiles
  WHERE lower(email) = clean_email
  LIMIT 1;

  INSERT INTO public.website_signups (
    email, source, page, referral_code, profile_id, beta_newsletter
  )
  VALUES (
    clean_email, clean_source, clean_page, clean_referral, matched_profile, join_beta
  )
  ON CONFLICT (email) DO UPDATE SET
    updated_at = now(),
    beta_newsletter = public.website_signups.beta_newsletter OR EXCLUDED.beta_newsletter,
    profile_id = COALESCE(public.website_signups.profile_id, EXCLUDED.profile_id),
    page = COALESCE(EXCLUDED.page, public.website_signups.page),
    referral_code = COALESCE(public.website_signups.referral_code, EXCLUDED.referral_code)
  RETURNING id INTO signup_id;

  RETURN signup_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_website_signup(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_website_signup(TEXT, TEXT, TEXT, TEXT) TO service_role;
