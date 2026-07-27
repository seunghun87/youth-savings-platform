ALTER TABLE user_enrolled_product
  ADD COLUMN IF NOT EXISTS matures_at date,
  ADD COLUMN IF NOT EXISTS interest_rate numeric(6, 3),
  ADD COLUMN IF NOT EXISTS monthly_amount integer;
