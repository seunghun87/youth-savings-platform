# 청년저축플랫폼

청년의 조건에 맞는 적금 상품과 청년정책을 찾아주고, 저축 플랜을 관리하는 모바일 앱입니다.

금융감독원 금융상품통합비교공시(finlife) API로 시중 적금 상품을, 온통청년 API로 청년정책을 수집해
사용자의 나이·소득 조건으로 자격을 판정하고 만기 예상 수령액을 계산합니다.

## 주요 기능

- **맞춤 적금 추천** — 나이·연소득·목표 기간·월 납입액 기준으로 가입 가능한 상품을 골라 예상 수령액과 함께 제시
- **청년정책 맞춤 추천** — 나이·연소득으로 지원 자격을 자동 판정하고 충족 / 확인 필요 / 미충족을 사유와 함께 표시
- **저축 플랜 관리** — 목표 금액, 가입 상품, 월별 납입 기록, 중도해지 반영
- **저축액 배분** — 여러 상품에 월 납입액을 금리 순으로 나눠 담는 배분 계산 (API 구현, 화면 미연결)

## 저장소 구조

```
app/
  src/           React + Vite 프론트엔드 (Capacitor로 Android 빌드)
  backend/
    src/         Node.js + Express API
    supabase/    스키마 및 마이그레이션
    test/        백엔드 테스트
  android/       Capacitor Android 프로젝트
docs/            설계서, 주간 학습보고서, 비교보고서
render.yaml      Render 배포 Blueprint
```

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | React 18, Vite 6, TypeScript, Tailwind CSS |
| 모바일 | Capacitor 8 (Android) |
| 백엔드 | Node.js 18+ (CI·배포는 20), Express 4 |
| 데이터베이스 · 인증 | Supabase (PostgreSQL, Google OAuth) |
| 배포 | Render (백엔드) |

## 시작하기

### 1. 데이터베이스 준비

Supabase 프로젝트를 만든 뒤 SQL Editor에서 순서대로 실행합니다.

```
app/backend/supabase/schema.sql          # 신규 DB는 이 파일만 실행
app/backend/supabase/migrations/*.sql    # 기존 DB는 번호순으로 실행
app/backend/supabase/seed.sql            # 정책 상품 초기 데이터
```

모든 테이블에 RLS가 켜져 있고 정책은 두지 않습니다. 데이터 접근은 백엔드(service_role)를 통해서만 이뤄집니다.

### 2. 백엔드

```bash
cd app/backend
cp .env.example .env      # 값 채우기
npm install
npm run dev               # http://localhost:3000
```

### 3. 프론트엔드

```bash
cd app
cp .env.example .env      # 값 채우기
npm install
npm run dev
```

## 환경 변수

### 백엔드 (`app/backend/.env`)

| 변수 | 필수 | 설명 |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | RLS를 우회하는 전체 권한 키. **프론트엔드에 절대 노출 금지** |
| `CORS_ORIGIN` | 운영 필수 | 허용할 프론트엔드 출처. 미설정 시 모든 출처 허용 |
| `SYNC_SECRET` | 동기화 시 | `/api/*/sync` 호출에 필요한 비밀키. 미설정 시 동기화 API가 503 |
| `TRUST_PROXY` | 배포 시 | 리버스 프록시 뒤에서 `1`로 설정. 미설정 시 요청 제한이 프록시 IP로 묶임 |
| `FINLIFE_API_KEY` | 상품 동기화 시 | 금융감독원 API 인증키 |
| `YOUTH_POLICY_API_KEY` | 정책 동기화 시 | 온통청년 API 인증키 |

### 프론트엔드 (`app/.env`)

| 변수 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 공개 키. RLS로 보호되므로 노출되어도 무방 |
| `VITE_API_BASE_URL` | 백엔드 주소 (끝에 슬래시 없이) |

## API

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| `GET` | `/health` | — | 상태 확인 |
| `GET` | `/api/products` | — | 가입 가능 적금 상품 목록 |
| `POST` | `/api/recommend` | — | 조건별 맞춤 상품 추천 |
| `POST` | `/api/allocate` | — | 여러 상품에 월 납입액 배분 |
| `GET` | `/api/youth-policy` | — | 청년정책 목록 (나이·소득 전달 시 자격 판정 포함) |
| `GET·PUT·POST·DELETE` | `/api/user-state/:id/*` | JWT | 사용자 프로필·플랜·납입·가입상품 |
| `POST` | `/api/products/sync` | 비밀키 | finlife 상품 동기화 |
| `POST` | `/api/youth-policy/sync` | 비밀키 | 온통청년 정책 동기화 |

사용자 상태 API는 Supabase JWT를 검증하고, 토큰의 사용자 ID와 경로의 `:id`가 다르면 403을 반환합니다.

## 테스트

```bash
cd app/backend && npm test      # 백엔드 테스트 34개
cd app && npm run typecheck     # 프론트엔드 타입 검사
cd app && npm run build         # 프로덕션 빌드
```

푸시·PR 시 GitHub Actions에서 위 세 가지가 자동 실행됩니다.

## 배포

### 백엔드 (Render)

저장소 루트의 `render.yaml`을 Blueprint로 사용합니다. 배포 시 다음 값을 입력해야 합니다.

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGIN` — 배포된 프론트엔드 주소
- `FINLIFE_API_KEY`, `YOUTH_POLICY_API_KEY`

`SYNC_SECRET`은 Render가 자동 생성하며, `TRUST_PROXY`는 `1`로 고정됩니다.

배포 직후 데이터를 채우려면 동기화를 한 번 실행합니다.

```bash
curl -X POST https://<배포주소>/api/products/sync     -H "x-sync-secret: <SYNC_SECRET>"
curl -X POST https://<배포주소>/api/youth-policy/sync -H "x-sync-secret: <SYNC_SECRET>"
```

### Supabase 인증 설정

Google 로그인을 쓰려면 대시보드에서 다음을 설정합니다.

- Authentication → Providers → Google 활성화
- Authentication → URL Configuration → Site URL을 배포 주소로 지정
- Redirect URLs에 배포된 프론트엔드 주소와 `com.sidepj.savingapp://auth/callback` 추가

## 문서

| 문서 | 내용 |
|---|---|
| [`docs/dev-branch-comparison.md`](docs/dev-branch-comparison.md) | dev 브랜치 대비 변경 비교보고서 |
| `docs/청년금융지원플랫폼 GitHub 통합설계서 v2.0.docx` | 통합 설계서 |
| `docs/weekly-report/` | 주간 학습보고서 |

## 참고

만기 수령액은 매월 납입 단리 기준으로 계산하며, 이자소득세 15.4%를 반영합니다.
실제 금융기관의 우대금리·복리 조건은 반영되지 않으므로 참고용 수치입니다.
