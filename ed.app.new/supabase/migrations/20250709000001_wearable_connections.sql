-- Migration: Add wearable_connections table for secure storage of wearable auth tokens
-- Date: 2026-07-09
-- Enables real wearable integration for sleep data sync

CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'oura', 'fitbit', 'google_fit', 'apple_health', 'samsung_health',
    'huawei_health', 'xiaomi_mi_fitness', 'garmin_connect', 'withings',
    'amazfit', 'polar', 'sony'
  )),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_id ON public.wearable_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_provider ON public.wearable_connections(provider);

-- Enable RLS
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;

-- Policies: users can only manage their own connections
DROP POLICY IF EXISTS "Users can view own wearable connections" ON public.wearable_connections;
CREATE POLICY "Users can view own wearable connections"
  ON public.wearable_connections FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own wearable connections" ON public.wearable_connections;
CREATE POLICY "Users can insert own wearable connections"
  ON public.wearable_connections FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own wearable connections" ON public.wearable_connections;
CREATE POLICY "Users can update own wearable connections"
  ON public.wearable_connections FOR UPDATE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own wearable connections" ON public.wearable_connections;
CREATE POLICY "Users can delete own wearable connections"
  ON public.wearable_connections FOR DELETE
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

-- Optional: add column to user_settings for legacy/simple storage (JSONB fallback)
-- ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS wearable_connections JSONB DEFAULT '{}';

-- Update trigger for updated_at (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_wearable_connections_updated_at ON public.wearable_connections;
CREATE TRIGGER update_wearable_connections_updated_at
    BEFORE UPDATE ON public.wearable_connections
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

COMMENT ON TABLE public.wearable_connections IS 'Stores OAuth tokens for wearable device integrations (Oura, Fitbit, etc.). Tokens should be encrypted at rest in production via Supabase Vault or similar.';