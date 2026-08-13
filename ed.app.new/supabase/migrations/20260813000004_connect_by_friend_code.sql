-- Instant connect when the other person shared their friend code.

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
      OR p.friend_code ILIKE '%' || trim(both from q) || '%'
    )
  ORDER BY
    CASE
      WHEN upper(COALESCE(p.friend_code, '')) = upper(trim(both from q)) THEN 0
      WHEN lower(COALESCE(p.handle, '')) = lower(trim(both from q)) THEN 1
      ELSE 2
    END,
    p.display_name
  LIMIT 12;
$$;

CREATE OR REPLACE FUNCTION public.connect_by_friend_code(code text)
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
  them uuid;
  existing uuid;
  cleaned text := upper(regexp_replace(trim(code), '\s+', '', 'g'));
BEGIN
  SELECT p.id INTO me FROM public.profiles p WHERE p.auth_user_id = auth.uid();
  IF me IS NULL THEN
    RAISE EXCEPTION 'Profile not found. Sign in again.';
  END IF;

  SELECT p.id INTO them
  FROM public.profiles p
  WHERE upper(regexp_replace(COALESCE(p.friend_code, ''), '\s+', '', 'g')) = cleaned
  LIMIT 1;

  IF them IS NULL THEN
    RAISE EXCEPTION 'No one has that friend code.';
  END IF;
  IF them = me THEN
    RAISE EXCEPTION 'That is your own friend code.';
  END IF;

  SELECT f.id INTO existing
  FROM public.friendships f
  WHERE (f.requester_id = me AND f.addressee_id = them)
     OR (f.requester_id = them AND f.addressee_id = me)
  LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (me, them, 'accepted')
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
  WHERE p.id = them;
END;
$$;

REVOKE ALL ON FUNCTION public.connect_by_friend_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connect_by_friend_code(text) TO authenticated;
