-- Username-first friend add. Search ranks exact @handle, then prefix, then name.
-- Adding a person from search connects immediately (same as the old friend-code path).

CREATE OR REPLACE FUNCTION public.normalize_handle(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(both from COALESCE(raw, '')), '^@+', ''));
$$;

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
  WITH me AS (
    SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid()
  ),
  needle AS (
    SELECT public.normalize_handle(q) AS q
  )
  SELECT
    p.id,
    p.handle,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.nickname, ''), 'Dreamer') AS display_name,
    p.avatar_url,
    p.friend_code
  FROM public.profiles p, needle n
  WHERE length(n.q) >= 2
    AND p.id NOT IN (SELECT id FROM me)
    AND (
      public.normalize_handle(p.handle) = n.q
      OR public.normalize_handle(p.handle) LIKE n.q || '%'
      OR public.normalize_handle(p.handle) LIKE '%' || n.q || '%'
      OR p.display_name ILIKE '%' || n.q || '%'
      OR p.nickname ILIKE '%' || n.q || '%'
    )
  ORDER BY
    CASE
      WHEN public.normalize_handle(p.handle) = n.q THEN 0
      WHEN public.normalize_handle(p.handle) LIKE n.q || '%' THEN 1
      WHEN public.normalize_handle(p.handle) LIKE '%' || n.q || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 12;
$$;

CREATE OR REPLACE FUNCTION public.add_friend(target uuid)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  existing uuid;
BEGIN
  SELECT p.id INTO me FROM public.profiles p WHERE p.auth_user_id = auth.uid();
  IF me IS NULL THEN
    RAISE EXCEPTION 'Profile not found. Sign in again.';
  END IF;
  IF target IS NULL THEN
    RAISE EXCEPTION 'No one to add.';
  END IF;
  IF target = me THEN
    RAISE EXCEPTION 'That is you.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target) THEN
    RAISE EXCEPTION 'No one has that username.';
  END IF;

  SELECT f.id INTO existing
  FROM public.friendships f
  WHERE (f.requester_id = me AND f.addressee_id = target)
     OR (f.requester_id = target AND f.addressee_id = me)
  LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (me, target, 'accepted')
    RETURNING public.friendships.id INTO existing;
  ELSE
    UPDATE public.friendships
    SET status = 'accepted', updated_at = now()
    WHERE public.friendships.id = existing;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.handle,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.nickname, ''), 'Dreamer'),
    p.avatar_url,
    'accepted'::text
  FROM public.profiles p
  WHERE p.id = target;
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_by_handle(username text)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned text := public.normalize_handle(username);
  them uuid;
  matches int;
BEGIN
  IF length(cleaned) < 2 THEN
    RAISE EXCEPTION 'Enter a username like @luna.';
  END IF;

  SELECT COUNT(*) INTO matches
  FROM public.profiles p
  WHERE public.normalize_handle(p.handle) = cleaned;

  IF matches = 1 THEN
    SELECT p.id INTO them
    FROM public.profiles p
    WHERE public.normalize_handle(p.handle) = cleaned
    LIMIT 1;
    RETURN QUERY SELECT * FROM public.add_friend(them);
    RETURN;
  END IF;

  SELECT COUNT(*) INTO matches
  FROM public.profiles p
  WHERE public.normalize_handle(p.handle) LIKE cleaned || '%';

  IF matches = 1 THEN
    SELECT p.id INTO them
    FROM public.profiles p
    WHERE public.normalize_handle(p.handle) LIKE cleaned || '%'
    LIMIT 1;
    RETURN QUERY SELECT * FROM public.add_friend(them);
    RETURN;
  END IF;

  IF matches > 1 THEN
    RAISE EXCEPTION 'Several people match that. Pick one from the search results.';
  END IF;

  RAISE EXCEPTION 'No one has the username @%.', cleaned;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_handle(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_dreamers(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_friend(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_by_handle(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_handle(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_dreamers(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_by_handle(text) TO authenticated;
