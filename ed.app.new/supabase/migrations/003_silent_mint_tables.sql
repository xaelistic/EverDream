-- Silent mint queue tables for custodial NFT minting edge function

CREATE TABLE IF NOT EXISTS public.custodial_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'custodial_vault',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_custodial_wallets_user ON public.custodial_wallets(user_id);

ALTER TABLE public.custodial_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own custodial wallet" ON public.custodial_wallets;
CREATE POLICY "Users can view own custodial wallet" ON public.custodial_wallets FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.dream_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  token_id TEXT,
  tx_hash TEXT,
  metadata_url TEXT,
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minted', 'failed')),
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dream_nfts_dream ON public.dream_nfts(dream_id);
CREATE INDEX IF NOT EXISTS idx_dream_nfts_user ON public.dream_nfts(user_id);

ALTER TABLE public.dream_nfts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dream nfts" ON public.dream_nfts;
CREATE POLICY "Users can view own dream nfts" ON public.dream_nfts FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own dream nfts" ON public.dream_nfts;
CREATE POLICY "Users can insert own dream nfts" ON public.dream_nfts FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));