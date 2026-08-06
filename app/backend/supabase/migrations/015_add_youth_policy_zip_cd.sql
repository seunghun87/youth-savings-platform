-- 마이그레이션 015: 청년정책(youth_policy) 지역 코드 컬럼 추가
-- 온통청년 API의 zipCd(적용 지역 시군구 코드, 콤마 구분. 없으면 전국 대상)를
-- 지금까지 동기화 시 버리고 있었다 — 지역 기반 필터링이 아예 불가능했던 원인.
-- 이미 012_add_youth_policy.sql을 실행한 기존 DB에서 이 파일을 실행하세요.

ALTER TABLE youth_policy ADD COLUMN IF NOT EXISTS zip_cd text;
