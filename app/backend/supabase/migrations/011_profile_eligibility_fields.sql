ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS is_homeowner boolean NOT NULL DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS income_reported boolean NOT NULL DEFAULT true;
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS available_for_signup boolean NOT NULL DEFAULT true;

UPDATE savings_product
SET available_for_signup = false
WHERE name IN ('청년도약계좌', '청년희망적금');

UPDATE savings_product
SET name = '청년 주택드림 청약통장',
    income_limit = 5000,
    monthly_limit = 100,
    base_rate = 4.50
WHERE name IN ('청년 우대형 주택청약종합저축', '청년 주택드림 청약통장');
