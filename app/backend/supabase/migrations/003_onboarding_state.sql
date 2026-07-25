ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
