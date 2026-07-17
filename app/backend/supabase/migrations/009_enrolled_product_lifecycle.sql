-- 가입 상품의 만기/중도해지 생명주기를 기록한다.
ALTER TABLE user_enrolled_product
  DROP CONSTRAINT IF EXISTS user_enrolled_product_status_check;

ALTER TABLE user_enrolled_product
  ADD CONSTRAINT user_enrolled_product_status_check
  CHECK (status IN ('신청중', '신청완료', '가입완료', '만기완료', '중도해지'));

ALTER TABLE user_enrolled_product
  ADD COLUMN IF NOT EXISTS ended_at date,
  ADD COLUMN IF NOT EXISTS termination_reason text,
  ADD COLUMN IF NOT EXISTS termination_payout integer;

COMMENT ON COLUMN user_enrolled_product.termination_payout IS '중도해지 시 실제 수령액(원). 미입력 시 누적 납입 원금을 사용';
