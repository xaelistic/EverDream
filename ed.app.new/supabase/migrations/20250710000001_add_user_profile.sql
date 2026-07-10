-- Add user_profile JSONB to profiles for iterative intelligence layer (SPEC-15)
-- Stores recurring themes, sleep correlations, image prefs, etc. without AI calls yet.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_profile JSONB DEFAULT '{
  "recurring_themes": [],
  "sleep_patterns": {},
  "image_style_prefs": [],
  "emotional_tendencies": [],
  "key_insights": [],
  "last_updated": null,
  "version": 0
}'::jsonb;

-- Index for potential queries (optional for now)
CREATE INDEX IF NOT EXISTS idx_profiles_user_profile ON public.profiles USING GIN (user_profile);

COMMENT ON COLUMN public.profiles.user_profile IS 'Iterative user profile for cross-referencing dreams, sleep, styles (updated client-side or via future edge). JSONB for flexibility.';

-- Update RLS if needed - existing policies should cover since it's on profiles
-- No change needed as it's part of the row.