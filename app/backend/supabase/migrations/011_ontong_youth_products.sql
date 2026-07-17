-- 마이그레이션 011: 온통청년(youthcenter.go.kr) 청년정책 상품 연동
-- 이미 schema.sql / 이전 마이그레이션을 실행한 DB에서 이 파일을 실행하세요.
--
-- 온통청년 API는 적금이 아닌 "청년정책"을 제공한다. 금리·납입 규칙이 없고
-- 소득기준이 자연어(earnEtcCn)로 내려오므로, 정형화된 소득 필터 대신
-- 원문을 그대로 보존하고(income_condition) 소득으로는 거르지 않는다.

-- 온통청년 정책 자연 키(정책번호). finlife/manual 상품은 NULL
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS plcy_no text;

-- 정책 대분류 카테고리 (job/housing/education/welfare/participation, 저축은 savings)
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS category text;

-- 정책 설명(plcyExplnCn)
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS description text;

-- 소득기준 원문(earnEtcCn 등). 자연어라 파싱하지 않고 안내 표시용으로만 보존
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS income_condition text;

-- 신청 URL(aplyUrlAddr)
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS apply_url text;

-- 정책 상품은 금리가 없으므로 base_rate 기본값을 0으로 둔다(컬럼은 NOT NULL 유지)
ALTER TABLE savings_product ALTER COLUMN base_rate SET DEFAULT 0;

-- source 에 'ontong' 허용. 기존 CHECK 제약을 교체한다.
ALTER TABLE savings_product DROP CONSTRAINT IF EXISTS savings_product_source_check;
ALTER TABLE savings_product
  ADD CONSTRAINT savings_product_source_check
  CHECK (source IN ('manual', 'finlife', 'ontong'));

-- 정책번호 기준 upsert 충돌 키. NULL끼리는 중복으로 치지 않으므로
-- finlife/manual 상품에는 영향이 없다.
ALTER TABLE savings_product DROP CONSTRAINT IF EXISTS uq_savings_product_ontong;
ALTER TABLE savings_product
  ADD CONSTRAINT uq_savings_product_ontong UNIQUE (plcy_no);

COMMENT ON COLUMN savings_product.plcy_no          IS '온통청년 정책번호(자연 키)';
COMMENT ON COLUMN savings_product.category         IS '정책 대분류: job/housing/education/welfare/participation, 저축은 savings';
COMMENT ON COLUMN savings_product.description      IS '정책 설명(온통청년 plcyExplnCn)';
COMMENT ON COLUMN savings_product.income_condition IS '소득기준 원문(자연어). 파싱하지 않고 표시용으로 보존';
COMMENT ON COLUMN savings_product.apply_url        IS '신청 URL(온통청년 aplyUrlAddr)';
