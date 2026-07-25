-- 상품 자체의 납입 규칙과 사용자가 가입 시 선택한 약정액을 분리한다.
ALTER TABLE savings_product
  ADD COLUMN IF NOT EXISTS contribution_type text NOT NULL DEFAULT 'flexible'
    CHECK (contribution_type IN ('fixed', 'flexible', 'step_up')),
  ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (payment_frequency IN ('monthly', 'weekly', 'daily')),
  ADD COLUMN IF NOT EXISTS min_monthly_amount integer,
  ADD COLUMN IF NOT EXISTS installment_step_amount integer;

COMMENT ON COLUMN savings_product.monthly_limit IS '상품의 월 최대 납입 한도(만원)';
COMMENT ON COLUMN savings_product.min_monthly_amount IS '상품의 월 최소 납입액(만원)';
COMMENT ON COLUMN savings_product.installment_step_amount IS '증액식 상품의 회차별 증액 단위(만원)';
COMMENT ON COLUMN user_enrolled_product.monthly_amount IS '사용자가 가입 시 선택한 월 약정/예정 납입액(원)';

ALTER TABLE user_enrolled_product
  ADD COLUMN IF NOT EXISTS contribution_type text NOT NULL DEFAULT 'flexible'
    CHECK (contribution_type IN ('fixed', 'flexible', 'step_up')),
  ADD COLUMN IF NOT EXISTS payment_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (payment_frequency IN ('monthly', 'weekly', 'daily')),
  ADD COLUMN IF NOT EXISTS min_amount integer,
  ADD COLUMN IF NOT EXISTS max_amount integer,
  ADD COLUMN IF NOT EXISTS installment_step_amount integer;
