-- 마이그레이션 003: 청년정책(온통청년 API) 테이블 추가
-- 이미 schema.sql을 실행한 기존 DB에서 이 파일을 실행하세요.
-- (신규 DB는 schema.sql만 실행하면 되며, 이 파일은 필요 없습니다)

CREATE TABLE IF NOT EXISTS youth_policy (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  plcy_no         text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  description     text,
  support_content text,
  min_age         integer,
  max_age         integer,
  eligibility_text text,
  exclusion_text   text,
  category_large  text,
  category_medium text,
  keywords        text,
  supervising_org text,
  operating_org   text,
  apply_period    text,
  apply_url       text,
  ref_url         text,
  source          text        NOT NULL DEFAULT 'ontongyouth',
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE youth_policy ENABLE ROW LEVEL SECURITY;
