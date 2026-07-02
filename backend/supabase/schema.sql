-- 청년저축플랫폼 DB 스키마
-- Supabase SQL Editor에서 전체 실행

-- 1. 사용자 입력 테이블
CREATE TABLE IF NOT EXISTS user_input (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  monthly_amount  integer     NOT NULL,
  period_months   integer     NOT NULL,
  age             integer     NOT NULL,
  personal_income integer     NOT NULL,
  income_bracket  integer,
  created_at      timestamptz DEFAULT now()
);

-- 2. 저축 상품 테이블
CREATE TABLE IF NOT EXISTS savings_product (
  id           uuid           DEFAULT gen_random_uuid() PRIMARY KEY,
  -- finlife 상품 식별용 자연 키 (금융사 코드 + 상품 코드). manual 상품은 NULL
  fin_co_no    text,
  fin_prdt_cd  text,
  name         text           NOT NULL,
  bank         text           NOT NULL,
  base_rate    numeric(5,2)   NOT NULL,
  -- 기간별 금리 옵션 [{ "term": 개월수, "rate": 기본금리 }, ...]. manual 상품은 NULL(base_rate 사용)
  options      jsonb,
  product_type text           NOT NULL CHECK (product_type IN ('정책', '시중')),
  min_age      integer        NOT NULL DEFAULT 0,
  max_age      integer        NOT NULL DEFAULT 99,
  income_limit integer,
  min_period   integer        NOT NULL DEFAULT 1,
  max_period   integer        NOT NULL DEFAULT 120,
  monthly_limit integer,
  source       text           NOT NULL CHECK (source IN ('manual', 'finlife')),
  created_at   timestamptz    DEFAULT now(),
  -- upsert 충돌 기준. NULL끼리는 중복으로 치지 않으므로 manual 상품에는 영향 없음
  CONSTRAINT uq_savings_product_finlife UNIQUE (fin_co_no, fin_prdt_cd)
);

-- 3. 추천 결과 테이블
CREATE TABLE IF NOT EXISTS recommendation (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_input_id   uuid        REFERENCES user_input(id) ON DELETE CASCADE,
  product_id      uuid        REFERENCES savings_product(id) ON DELETE CASCADE,
  rank            integer     NOT NULL,
  expected_amount bigint      NOT NULL,
  notice          text,
  created_at      timestamptz DEFAULT now()
);

-- 4. RLS 활성화
-- 백엔드는 service_role key를 사용하므로 RLS의 영향을 받지 않는다.
-- anon key로의 직접 접근을 차단하기 위한 설정 (정책을 만들지 않으면 전부 거부됨)
ALTER TABLE user_input      ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation  ENABLE ROW LEVEL SECURITY;
