ALTER TABLE user_enrolled_product
  ADD COLUMN IF NOT EXISTS opening_balance integer NOT NULL DEFAULT 0
  CHECK (opening_balance >= 0);

COMMENT ON COLUMN user_enrolled_product.opening_balance IS '앱 등록 시점까지 이미 쌓인 상품 원금(원). 이후 납입 기록과 분리';
