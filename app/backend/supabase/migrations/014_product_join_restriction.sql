-- 마이그레이션 014: 상품 가입 제한 정보 추가
-- 이미 schema.sql을 실행한 기존 DB에서 이 파일을 실행하세요.
--
-- 반려동물 등록·자녀 보유처럼 특정 조건을 요구하는 적금은 청년 일반 사용자가
-- 가입할 수 없는데도 금리가 높아 추천 상위에 올라오는 문제가 있었다.
-- 상품명 문자열 매칭(002_add_category.sql) 대신 금감원 API가 제공하는
-- 구조화 필드(join_deny)로 판정한다.
--
-- 데이터는 지우지 않는다. 조회 시 제한 없는 상품만 노출하고,
-- 나중에 프로필에 자녀·반려동물 여부가 생기면 자동 판정으로 승격할 수 있게 남겨둔다.

-- 가입제한 구분: 1=제한없음, 2=서민전용, 3=일부제한. 정책 상품(manual)은 NULL
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS join_deny smallint;
-- 가입대상 원문 (예: "실명의 개인", "반려동물을 등록한 개인")
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS join_member text;
-- 우대조건(spcl_cnd) + 기타 유의사항(etc_note)
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS special_note text;

COMMENT ON COLUMN savings_product.join_deny IS '가입제한 1=제한없음 2=서민전용 3=일부제한 (금감원 join_deny). NULL은 정책 상품';
COMMENT ON COLUMN savings_product.join_member IS '가입대상 원문 (금감원 join_member)';
COMMENT ON COLUMN savings_product.special_note IS '우대조건·기타 유의사항 (금감원 spcl_cnd + etc_note)';

-- 목록·추천 조회가 "join_deny IS NULL OR join_deny = 1" 조건을 항상 사용한다
CREATE INDEX IF NOT EXISTS idx_savings_product_join_deny
  ON savings_product (join_deny)
  WHERE available_for_signup;

-- 주의: 기존 finlife 행은 이 값이 비어 있다(NULL → 제한없음으로 취급).
-- 마이그레이션 후 POST /api/products/sync 를 한 번 실행해야 실제 값이 채워진다.
