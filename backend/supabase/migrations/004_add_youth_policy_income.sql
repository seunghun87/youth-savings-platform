-- 마이그레이션 004: 청년정책(youth_policy) 소득 조건 컬럼 추가
-- 이미 003_add_youth_policy.sql을 실행한 기존 DB에서 이 파일을 실행하세요.

ALTER TABLE youth_policy ADD COLUMN IF NOT EXISTS income_min integer;
ALTER TABLE youth_policy ADD COLUMN IF NOT EXISTS income_max integer;
ALTER TABLE youth_policy ADD COLUMN IF NOT EXISTS income_etc text;
