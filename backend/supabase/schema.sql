-- user_input: 사용자 입력
CREATE TABLE user_input (
  id               SERIAL PRIMARY KEY,
  monthly_amount   INTEGER NOT NULL,
  period_months    INTEGER NOT NULL,
  age              INTEGER NOT NULL,
  personal_income  INTEGER NOT NULL,
  income_bracket   INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- savings_product: 금융상품 (finlife API + 수동 입력 정책상품)
CREATE TABLE savings_product (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  bank           VARCHAR(100) NOT NULL,
  base_rate      DECIMAL(5, 2) NOT NULL,
  period_months  INTEGER,
  max_amount     INTEGER,
  product_type   VARCHAR(20) NOT NULL,  -- '예금' or '적금'
  min_age        INTEGER,
  max_age        INTEGER,
  income_limit   INTEGER,
  source         VARCHAR(20) NOT NULL,  -- 'api' or 'manual'
  updated_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE (name, bank)
);

-- recommendation: 추천 결과
CREATE TABLE recommendation (
  id              SERIAL PRIMARY KEY,
  input_id        INTEGER NOT NULL REFERENCES user_input(id),
  product_id      INTEGER NOT NULL REFERENCES savings_product(id),
  expected_amount INTEGER NOT NULL,
  rank            INTEGER NOT NULL
);
