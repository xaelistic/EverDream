-- Usernames + friend graph + outbound invites

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS friend_code TEXT;

UPDATE public.profiles
SET handle = lower(regexp_replace(COALESCE(display_name, nickname, split_part(COALESCE(email, ''), '@', 1), 'dreamer'), '[^a-zA-Z0-9_]+', '_', 'g'))
WHERE handle IS NULL OR handle = '';

UPDATE public.profiles
SET handle = handle || '_' || substr(replace(id::text, '-', ''), 1, 6)
WHERE id IN (
  SELECT id FROM (
    SELECT id, handle, row_number() OVER (PARTITION BY handle ORDER BY created_at) AS rn
    FROM public.profiles
    WHERE handle IS NOT NULL
  ) dups
  WHERE rn > 1
);

UPDATE public.profiles
SET friend_code = 'DREAM-' || upper(substr(replace(id::text, '-', ''), 1, 6))
WHERE friend_code IS NULL OR friend_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_unique
  ON public.profiles (lower(handle))
  WHERE handle IS NOT NULL AND handle <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_friend_code_unique
  ON public.profiles (upper(friend_code))
  WHERE friend_code IS NOT NULL AND friend_code <> '';

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships (requester_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own friendships" ON public.friendships;
CREATE POLICY "Users read own friendships"
  ON public.friendships FOR SELECT
  USING (
    requester_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users create friend requests" ON public.friendships;
CREATE POLICY "Users create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (
    requester_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users update own friendships" ON public.friendships;
CREATE POLICY "Users update own friendships"
  ON public.friendships FOR UPDATE
  USING (
    requester_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  channel TEXT NOT NULL DEFAULT 'link',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON public.friend_invites (inviter_id);

ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own invites" ON public.friend_invites;
CREATE POLICY "Users manage own invites"
  ON public.friend_invites FOR ALL
  USING (
    inviter_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    inviter_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.search_dreamers(q text)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  friend_code TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.handle,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.nickname, ''), 'Dreamer') AS display_name,
    p.avatar_url,
    p.friend_code
  FROM public.profiles p
  WHERE length(trim(q)) >= 2
    AND (
      p.handle ILIKE '%' || trim(both from q) || '%'
      OR p.display_name ILIKE '%' || trim(both from q) || '%'
      OR p.nickname ILIKE '%' || trim(both from q) || '%'
      OR upper(COALESCE(p.friend_code, '')) = upper(trim(both from q))
    )
  ORDER BY
    CASE WHEN lower(p.handle) = lower(trim(both from q)) THEN 0 ELSE 1 END,
    p.display_name
  LIMIT 12;
$$;

CREATE OR REPLACE FUNCTION public.get_dreamers(ids uuid[])
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.handle,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.nickname, ''), 'Dreamer') AS display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY (ids);
$$;

REVOKE ALL ON FUNCTION public.search_dreamers(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dreamers(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_dreamers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dreamers(uuid[]) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.friendships TO authenticated;
GRANT SELECT, INSERT ON public.friend_invites TO authenticated;
