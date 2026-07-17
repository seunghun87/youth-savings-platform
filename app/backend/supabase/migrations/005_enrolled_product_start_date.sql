ALTER TABLE user_enrolled_product
  ADD COLUMN IF NOT EXISTS started_at date;

UPDATE user_enrolled_product
SET started_at = applied_at
WHERE started_at IS NULL;
