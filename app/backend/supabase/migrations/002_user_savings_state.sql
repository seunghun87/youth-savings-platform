CREATE TABLE IF NOT EXISTS user_profile (client_id text PRIMARY KEY,name text NOT NULL DEFAULT '김민준',age integer NOT NULL DEFAULT 26,city text NOT NULL DEFAULT '서울특별시',annual_income integer NOT NULL DEFAULT 0,updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS savings_plan (client_id text PRIMARY KEY REFERENCES user_profile(client_id) ON DELETE CASCADE,target_amount bigint NOT NULL DEFAULT 50000000,monthly_target integer NOT NULL DEFAULT 700000,current_amount bigint NOT NULL DEFAULT 0,updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS savings_contribution (id uuid DEFAULT gen_random_uuid() PRIMARY KEY,client_id text NOT NULL REFERENCES user_profile(client_id) ON DELETE CASCADE,product_name text NOT NULL,amount integer NOT NULL CHECK (amount > 0),contributed_at date NOT NULL DEFAULT current_date,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS saved_product (client_id text NOT NULL REFERENCES user_profile(client_id) ON DELETE CASCADE,product_id uuid NOT NULL REFERENCES savings_product(id) ON DELETE CASCADE,created_at timestamptz DEFAULT now(),PRIMARY KEY (client_id, product_id));
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_contribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_product ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION increment_plan_amount(p_client_id text, p_amount integer) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ UPDATE savings_plan SET current_amount=current_amount+p_amount,updated_at=now() WHERE client_id=p_client_id; $$;
