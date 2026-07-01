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
  name         text           NOT NULL,
  bank         text           NOT NULL,
  base_rate    numeric(5,2)   NOT NULL,
  product_type text           NOT NULL CHECK (product_type IN ('정책', '시중')),
  min_age      integer        NOT NULL DEFAULT 0,
  max_age      integer        NOT NULL DEFAULT 99,
  income_limit integer,
  min_period   integer        NOT NULL DEFAULT 1,
  max_period   integer        NOT NULL DEFAULT 120,
  monthly_limit integer,
  source       text           NOT NULL CHECK (source IN ('manual', 'finlife')),
  created_at   timestamptz    DEFAULT now()
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
