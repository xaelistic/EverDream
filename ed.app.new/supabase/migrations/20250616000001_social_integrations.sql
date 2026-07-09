-- ============================================================
-- EverDream — Social Integrations (2025-06-16)
-- OAuth-linked accounts, public share links, publish audit log
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. SOCIAL ACCOUNTS (tokens server-side only) ─────────────

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'facebook', 'meta', 'google', 'apple', 'instagram', 'tiktok',
    'twitter', 'spotify', 'line', 'whatsapp'
  )),
  provider_user_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON public.social_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON public.social_accounts(status);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Users may read their linked accounts (no token columns exposed via view below)
DROP POLICY IF EXISTS "Users read own social accounts" ON public.social_accounts;
CREATE POLICY "Users read own social accounts"
  ON public.social_accounts FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users delete own social accounts" ON public.social_accounts;
CREATE POLICY "Users delete own social accounts"
  ON public.social_accounts FOR DELETE
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- Inserts/updates only via service role (edge functions)
DROP POLICY IF EXISTS "Service role manages social accounts" ON public.social_accounts;
CREATE POLICY "Service role manages social accounts"
  ON public.social_accounts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE VIEW public.social_accounts_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  provider,
  provider_user_id,
  username,
  display_name,
  avatar_url,
  email,
  scopes,
  metadata,
  status,
  token_expires_at,
  linked_at,
  updated_at
FROM public.social_accounts;

GRANT SELECT ON public.social_accounts_public TO authenticated;

-- ── 2. PUBLIC SHARE LINKS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dream_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  caption TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dream_share_links_slug ON public.dream_share_links(slug);
CREATE INDEX IF NOT EXISTS idx_dream_share_links_user_id ON public.dream_share_links(user_id);

ALTER TABLE public.dream_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage share links" ON public.dream_share_links;
CREATE POLICY "Owners manage share links"
  ON public.dream_share_links FOR ALL
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Public can read active share links" ON public.dream_share_links;
CREATE POLICY "Public can read active share links"
  ON public.dream_share_links FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- ── 3. SHARE EVENTS (audit + analytics) ──────────────────────

CREATE TABLE IF NOT EXISTS public.dream_share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dream_id TEXT,
  share_link_id UUID REFERENCES public.dream_share_links(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('native', 'dialog', 'api', 'link', 'download')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
  external_post_id TEXT,
  external_post_url TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dream_share_events_user_id ON public.dream_share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_share_events_dream_id ON public.dream_share_events(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_share_events_provider ON public.dream_share_events(provider);

ALTER TABLE public.dream_share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own share events" ON public.dream_share_events;
CREATE POLICY "Users read own share events"
  ON public.dream_share_events FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own share events" ON public.dream_share_events;
CREATE POLICY "Users insert own share events"
  ON public.dream_share_events FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role manages share events" ON public.dream_share_events;
CREATE POLICY "Service role manages share events"
  ON public.dream_share_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 4. PROFILE EXTENSIONS FOR SOCIAL ─────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pseudonym TEXT,
  ADD COLUMN IF NOT EXISTS dream_type TEXT,
  ADD COLUMN IF NOT EXISTS social_bio TEXT,
  ADD COLUMN IF NOT EXISTS share_profile_public BOOLEAN NOT NULL DEFAULT false;

-- ── 5. HELPERS ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_share_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
BEGIN
  candidate := encode(gen_random_bytes(6), 'hex');
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_social_account_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_accounts_updated_at ON public.social_accounts;
CREATE TRIGGER trg_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_social_account_updated_at();

-- ── 6. OAUTH STATE (TikTok + custom providers) ───────────────

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'link',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages oauth states" ON public.oauth_states;
CREATE POLICY "Service role manages oauth states"
  ON public.oauth_states FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');