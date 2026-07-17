require('dotenv').config();

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[오류] 환경변수 누락: ${key}`);
    console.error('.env 파일을 확인하세요 (.env.example 참고)');
    process.exit(1);
  }
}
