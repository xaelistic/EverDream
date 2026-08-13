-- Ensure social account + OAuth state tables exist for Spotify linking.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
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
  status TEXT NOT NULL DEFAULT 'active',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON public.social_accounts(provider);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

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
