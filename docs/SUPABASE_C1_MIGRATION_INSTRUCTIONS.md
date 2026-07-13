# Supabase C-1 Migration — Apply via Coolify SSH (for Grok / xAI)

**Purpose**  
Apply the critical privilege-escalation fix (`is_admin` / `role` self-update prevention) to the production Supabase instance running on Coolify.

**Migration Files**  
1. `ed.app.new/supabase/migrations/20250713000002_align_production_schema.sql` — **run first** if production still uses legacy `profiles.id = auth.uid()` layout  
2. `ed.app.new/supabase/migrations/20250713000001_prevent_is_admin_escalation.sql` — C-1 privilege-escalation fix (included in align migration)

**Canonical local repo:** `C:\Users\xaeli\work\EverDream` (not a fresh clone)

---

## Prerequisites (Grok)

- SSH access to the Coolify host
- Docker + `docker exec` permissions
- The Supabase stack is running (Kong, PostgREST, Postgres, etc.)
- You have the `SUPABASE_SERVICE_ROLE_KEY` (or can reach the Postgres container directly)

---

## Step-by-step Instructions

### 1. Locate the running Postgres container

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E 'postgres|supabase-db'
```

Typical name: `supabase-db`, `postgres`, or something containing `db`.

### 2. Copy the migration file into the container

```bash
# From the EverDream repo root on the Coolify host
docker cp ed.app.new/supabase/migrations/20250713000001_prevent_is_admin_escalation.sql \
  <postgres-container-name>:/tmp/migration.sql
```

### 3. Execute the migration inside the Postgres container

```bash
docker exec -it <postgres-container-name> \
  psql -U postgres -d postgres -f /tmp/migration.sql
```

Or if using the Supabase `psql` helper:

```bash
docker exec -it <postgres-container-name> \
  bash -c "psql 'postgresql://postgres:***@localhost:5432/postgres' -f /tmp/migration.sql"
```

### 4. Verify the trigger and policy were created

```bash
docker exec -it <postgres-container-name> psql -U postgres -d postgres -c "
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname LIKE '%update%';
"
```

You should see:
- Trigger: `trg_prevent_admin_escalation`
- Policy: `Users can update own profile` with a `WITH CHECK` clause

### 5. Test that normal users cannot escalate (optional but recommended)

```sql
-- As a normal authenticated user (via Supabase client or psql with limited role)
UPDATE profiles SET is_admin = true WHERE auth_user_id = '<your-user-uuid>';
-- Expected: ERROR: Permission denied: cannot modify is_admin or role
```

---

## Rollback (if needed)

```bash
docker exec -it <postgres-container-name> psql -U postgres -d postgres -c "
DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_admin_escalation();
DROP POLICY IF EXISTS \"Users can update own profile\" ON public.profiles;

-- Restore the original permissive policy if required
CREATE POLICY \"Users can update own profile\"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
"
```

---

## Notes for Grok

- The migration uses `SECURITY DEFINER` on the trigger function — this is intentional and safe.
- After applying, **C-1** (privilege escalation) should be mitigated.
- Also run `supabase db push` or equivalent from the EverDream repo if you prefer the Supabase CLI route instead of raw `psql`.

**File created:** `docs/SUPABASE_C1_MIGRATION_INSTRUCTIONS.md`