-- Website email signups live next to app profiles.
-- A later app signup with the same email attaches the row.
-- Discord links use social_accounts (provider = discord). One Discord user, one profile.

CREATE TABLE IF NOT EXISTS public.website_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  page TEXT,
  referral_code TEXT,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT website_signups_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_website_signups_profile_id
  ON public.website_signups (profile_id);

ALTER TABLE public.website_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own website signup" ON public.website_signups;
CREATE POLICY "Users read own website signup"
  ON public.website_signups FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role manages website signups" ON public.website_signups;
CREATE POLICY "Service role manages website signups"
  ON public.website_signups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.website_signups FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.website_signups TO authenticated;
GRANT ALL ON TABLE public.website_signups TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_provider_user_unique
  ON public.social_accounts (provider, provider_user_id);

CREATE OR REPLACE FUNCTION public.link_website_signup_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR length(trim(NEW.email)) = 0 THEN
    RETURN NEW;
  END IF;
  UPDATE public.website_signups
  SET profile_id = NEW.id,
      updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND (profile_id IS NULL OR profile_id = NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_website_signup ON public.profiles;
CREATE TRIGGER trg_link_website_signup
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_website_signup_to_profile();

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

  INSERT INTO public.website_signups (email, source, page, referral_code, profile_id)
  VALUES (clean_email, clean_source, clean_page, clean_referral, matched_profile)
  ON CONFLICT (email) DO UPDATE SET
    updated_at = now(),
    profile_id = COALESCE(public.website_signups.profile_id, EXCLUDED.profile_id),
    page = COALESCE(EXCLUDED.page, public.website_signups.page),
    referral_code = COALESCE(public.website_signups.referral_code, EXCLUDED.referral_code)
  RETURNING id INTO signup_id;

  RETURN signup_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_website_signup(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_website_signup(TEXT, TEXT, TEXT, TEXT) TO service_role;
