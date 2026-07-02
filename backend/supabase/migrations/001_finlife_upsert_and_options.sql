-- 마이그레이션 001: finlife 상품 upsert 전환 + 기간별 금리 옵션
-- 이미 schema.sql을 실행한 기존 DB에서 이 파일을 실행하세요.
-- (신규 DB는 schema.sql만 실행하면 되며, 이 파일은 필요 없습니다)

-- finlife 상품 식별용 자연 키 (금융사 코드 + 상품 코드). manual 상품은 NULL
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS fin_co_no   text;
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS fin_prdt_cd text;

-- 기간별 금리 옵션 [{ "term": 개월수, "rate": 기본금리 }, ...]. manual 상품은 NULL(base_rate 사용)
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS options jsonb;

-- 기존 finlife 행에는 자연 키가 없어 upsert 대상이 될 수 없으므로 정리한다.
-- (다음 /api/products/sync 실행 시 자연 키와 함께 다시 채워짐)
DELETE FROM savings_product WHERE source = 'finlife' AND fin_co_no IS NULL;

-- upsert 충돌 기준. NULL끼리는 중복으로 치지 않으므로 manual 상품에는 영향 없음
ALTER TABLE savings_product
  ADD CONSTRAINT uq_savings_product_finlife UNIQUE (fin_co_no, fin_prdt_cd);

-- RLS 활성화 (백엔드는 service_role key 사용이라 영향 없음, anon 직접 접근 차단)
ALTER TABLE user_input      ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation  ENABLE ROW LEVEL SECURITY;
