-- 청년 정책상품 초기 데이터 (STEP 3)
-- Supabase SQL Editor에서 schema.sql 실행 후 이 파일을 실행하세요

INSERT INTO savings_product (name, bank, base_rate, product_type, min_age, max_age, income_limit, min_period, max_period, monthly_limit, source)
VALUES
  (
    '청년도약계좌',
    '시중은행 공통',
    6.00,
    '정책',
    19, 34,
    7500,   -- 연소득 7500만원 이하
    60, 60, -- 60개월 고정
    70,     -- 월 최대 70만원
    'manual'
  ),
  (
    '청년희망적금',
    '시중은행 공통',
    5.00,
    '정책',
    19, 34,
    3600,   -- 연소득 3600만원 이하
    12, 24, -- 12~24개월
    50,     -- 월 최대 50만원
    'manual'
  ),
  (
    '청년 우대형 주택청약종합저축',
    '우리은행',
    3.30,
    '정책',
    19, 34,
    3600,    -- 연소득 3600만원 이하
    24, 600, -- 2년~50년
    50,      -- 월 최대 50만원
    'manual'
  );
