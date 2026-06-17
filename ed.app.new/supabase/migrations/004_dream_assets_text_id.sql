-- Allow text dream IDs in dream_assets (app uses dream-{timestamp} ids, not only UUID)

ALTER TABLE public.dream_assets DROP CONSTRAINT IF EXISTS dream_assets_dream_id_fkey;

ALTER TABLE public.dream_assets
  ALTER COLUMN dream_id TYPE TEXT USING dream_id::text;

-- Re-add optional FK only when dreams.id is also TEXT (skip if dreams still UUID)
-- Dreams upsert from app already uses text ids in some deployments.