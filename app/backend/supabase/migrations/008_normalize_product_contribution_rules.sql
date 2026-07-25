-- 기존 상품은 안전한 최소값을 채우고, 규칙을 확실히 아는 정책 상품만 구체화한다.
UPDATE savings_product
SET min_monthly_amount = 1
WHERE min_monthly_amount IS NULL;

UPDATE savings_product
SET contribution_type = 'flexible', payment_frequency = 'monthly',
    min_monthly_amount = 1, monthly_limit = 70
WHERE name = '청년도약계좌';

UPDATE savings_product
SET contribution_type = 'fixed', payment_frequency = 'monthly',
    min_monthly_amount = 1, monthly_limit = 50
WHERE name = '청년희망적금';

UPDATE savings_product
SET contribution_type = 'flexible', payment_frequency = 'monthly',
    min_monthly_amount = 2, monthly_limit = 50
WHERE name IN ('청년 우대형 주택청약종합저축', '청년주택드림청약');
