-- 마이그레이션 002: 상품 테마 분류(category) 컬럼 추가
-- 이미 schema.sql을 실행한 기존 DB에서 이 파일을 실행하세요.
-- (신규 DB는 schema.sql만 실행하면 되며, 이 파일은 필요 없습니다)

-- 반려동물/자녀 등 테마별 분류 태그. 기존 상품은 삭제하지 않고 태그만 채운다.
ALTER TABLE savings_product ADD COLUMN IF NOT EXISTS category text;

-- 반려동물 테마 상품 태깅
UPDATE savings_product SET category = '반려동물'
WHERE category IS NULL AND (name ILIKE '%애완%' OR name ILIKE '%펫%');

-- 자녀 테마 상품 태깅
UPDATE savings_product SET category = '자녀'
WHERE category IS NULL AND (
  name ILIKE '%우리아이%' OR name ILIKE '%아이%' OR name ILIKE '%자녀%' OR name ILIKE '%키즈%'
) AND name NOT ILIKE '%아이돌%';
