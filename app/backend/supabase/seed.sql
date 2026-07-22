-- 청년 정책상품 초기 데이터 (STEP 3)
-- Supabase SQL Editor에서 schema.sql 실행 후 이 파일을 실행하세요

INSERT INTO savings_product (name, bank, base_rate, product_type, min_age, max_age, income_limit, min_period, max_period, monthly_limit, contribution_type, payment_frequency, min_monthly_amount, source, available_for_signup)
VALUES
  (
    '청년도약계좌',
    '시중은행 공통',
    6.00,
    '정책',
    19, 34,
    7500,   -- 연소득 7500만원 이하
    60, 60, -- 60개월 고정
    70, 'flexible', 'monthly', 1, -- 월 1~70만원 자유 납입
    'manual', false
  ),
  (
    '청년희망적금',
    '시중은행 공통',
    5.00,
    '정책',
    19, 34,
    3600,   -- 연소득 3600만원 이하
    12, 24, -- 12~24개월
    50, 'fixed', 'monthly', 1, -- 가입 시 정한 금액을 매월 납입
    'manual', false
  ),
  (
    '청년 주택드림 청약통장',
    '우리은행',
    3.30,
    '정책',
    19, 34,
    5000,    -- 연소득 5000만원 이하
    24, 600, -- 2년~50년
    100, 'flexible', 'monthly', 2, -- 월 2~100만원 자유 납입
    'manual', true
  );
