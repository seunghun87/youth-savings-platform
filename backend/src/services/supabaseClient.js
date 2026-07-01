const { createClient } = require('@supabase/supabase-js');

// 백엔드 서버에서는 service_role key 사용 (RLS 우회, 전체 권한)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
