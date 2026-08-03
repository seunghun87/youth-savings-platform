-- 온통청년 정책의 적용지역 시군구 코드. 값이 없으면 전국 대상 정책이다.
ALTER TABLE youth_policy ADD COLUMN IF NOT EXISTS zip_cd text;
