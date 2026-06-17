-- XAEL economy balances, exchange orders/trades, NFT marketplace listings

CREATE TABLE IF NOT EXISTS public.economy_balances (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commodity TEXT NOT NULL CHECK (commodity IN ('XAEL', 'ENERGY', 'DATA', 'COMPUTE')),
  amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, commodity)
);

CREATE INDEX IF NOT EXISTS idx_economy_balances_user ON public.economy_balances(user_id);

ALTER TABLE public.economy_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own economy balances" ON public.economy_balances;
CREATE POLICY "Users manage own economy balances" ON public.economy_balances FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.exchange_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  commodity TEXT NOT NULL CHECK (commodity IN ('XAEL', 'ENERGY', 'DATA', 'COMPUTE')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  amount NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  seller_id TEXT NOT NULL,
  dream_id TEXT,
  nft_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_orders_user ON public.exchange_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_orders_status ON public.exchange_orders(status);

ALTER TABLE public.exchange_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exchange orders" ON public.exchange_orders;
CREATE POLICY "Users manage own exchange orders" ON public.exchange_orders FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.exchange_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  commodity TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  traded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_trades_user ON public.exchange_trades(user_id);

ALTER TABLE public.exchange_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exchange trades" ON public.exchange_trades;
CREATE POLICY "Users manage own exchange trades" ON public.exchange_trades FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.nft_market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  dream_id TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  price_xael NUMERIC NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  animation_url TEXT,
  commodities JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ,
  buyer_wallet TEXT,
  UNIQUE (user_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_nft_market_listings_user ON public.nft_market_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_market_listings_status ON public.nft_market_listings(status);

ALTER TABLE public.nft_market_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own nft listings" ON public.nft_market_listings;
CREATE POLICY "Users manage own nft listings" ON public.nft_market_listings FOR ALL
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));