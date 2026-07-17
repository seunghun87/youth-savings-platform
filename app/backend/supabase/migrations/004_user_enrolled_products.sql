CREATE TABLE IF NOT EXISTS user_enrolled_product (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL REFERENCES user_profile(client_id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  bank text NOT NULL,
  status text NOT NULL DEFAULT '신청완료'
    CHECK (status IN ('신청중', '신청완료', '가입완료')),
  applied_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (client_id, product_id)
);

ALTER TABLE user_enrolled_product ENABLE ROW LEVEL SECURITY;
