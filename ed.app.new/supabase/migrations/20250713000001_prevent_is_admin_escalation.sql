-- Prevent privilege escalation: normal users cannot change is_admin or role
-- Run after 20250710000001_add_user_profile.sql

CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role or explicit admin can change these columns
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR
       (NEW.role IS DISTINCT FROM OLD.role) THEN
      -- Allow only if the change is coming through service_role context
      -- (Supabase Edge Functions / server-side use service_role)
      IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Permission denied: cannot modify is_admin or role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_escalation();

-- Also strengthen the RLS policy (defense in depth)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    AND (is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE auth_user_id = auth.uid()))
    AND (role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()))
  );

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 
  'Users can update their own profile except is_admin/role (prevent escalation - C-1 fix)';