-- EverDream Database Schema — NFT Tracking
-- Run this in your Supabase SQL Editor after migration 001

-- ============================================================
-- NFTs TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nfts (
  id text PRIMARY KEY,
  dream_id text REFERENCES public.dreams(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_address text NOT NULL,
  creator_address text NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Dream',
  description text,
  image_url text,
  animation_url text,
  external_url text,
  metadata jsonb,
  attributes jsonb[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  tx_hash text,
  contract_address text,
  token_id text,
  parent_nft_ids text[],
  royalty_splits jsonb,
  license text DEFAULT 'copyleft',
  allow_remix boolean DEFAULT true,
  minted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nfts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nfts"
  ON public.nfts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own nfts"
  ON public.nfts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own nfts"
  ON public.nfts FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON public.nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_dream_id ON public.nfts(dream_id);
CREATE INDEX IF NOT EXISTS idx_nfts_status ON public.nfts(status);

-- ============================================================
-- DREAM ASSETS TABLE (for generated images, videos, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dream_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id text REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (asset_type IN ('image', 'depth_map', 'parallax_video', 'skybox_360', 'mesh_3d', 'multi_view', 'gaussian_splat')),
  prompt text,
  url text,
  source text,
  style text DEFAULT 'dreamlike',
  metadata jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error text,
  attempts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.dream_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dream assets"
  ON public.dream_assets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dream assets"
  ON public.dream_assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dream assets"
  ON public.dream_assets FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dream_assets_dream_id ON public.dream_assets(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_user_id ON public.dream_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_assets_type ON public.dream_assets(asset_type);

-- ============================================================
-- HELPER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DROP TRIGGER IF EXISTS update_nfts_updated_at ON public.nfts;
CREATE TRIGGER update_nfts_updated_at
  BEFORE UPDATE ON public.nfts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_dream_assets_updated_at ON public.dream_assets;
CREATE TRIGGER update_dream_assets_updated_at
  BEFORE UPDATE ON public.dream_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
