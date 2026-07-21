-- Post-registration onboarding: interests, dream goals, experience, recall
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dream_goals TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS dream_recall TEXT;

COMMENT ON COLUMN profiles.interests IS 'User-selected interest labels from onboarding or profile edit';
COMMENT ON COLUMN profiles.dream_goals IS 'Human-readable dream goals from onboarding';
COMMENT ON COLUMN profiles.experience_level IS 'beginner | some_experience | regular';
COMMENT ON COLUMN profiles.dream_recall IS 'rarely | sometimes | often';
