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
| `CORS_ORIGIN` | 운영 필수 | 허용할 웹 프론트엔드 출처. 미설정 시 모든 출처 허용. 앱(Capacitor) 출처는 코드에서 항상 허용하므로 적지 않아도 됨 |
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

플랫폼별 제공 방식은 다음과 같습니다.

| 플랫폼 | 방식 | 비고 |
|---|---|---|
| Android | APK 직접 설치 | 스토어 등록 없이 사이드로딩 |
| iOS | 웹 (Safari) | 앱 설치는 Mac + 개발자 계정 필요. "홈 화면에 추가" 시 앱처럼 동작 |
| 웹 | Render 정적 사이트 | 위 iOS 경로와 동일한 주소 |

### Render (웹 + 백엔드)

저장소 루트의 `render.yaml`을 Blueprint로 사용합니다. 웹과 백엔드가 함께 배포됩니다.

두 서비스의 주소는 첫 배포가 끝나야 정해지므로, 서로를 가리키는 값은 배포 후에 채웁니다.

**1차 — Blueprint 생성 시 입력**

| 서비스 | 변수 |
|---|---|
| 백엔드 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FINLIFE_API_KEY`, `YOUTH_POLICY_API_KEY` |
| 웹 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

`CORS_ORIGIN`과 `VITE_API_BASE_URL`은 아직 모르므로 비워둡니다.

**2차 — 배포 후 주소가 나오면 입력**

| 서비스 | 변수 | 값 |
|---|---|---|
| 백엔드 | `CORS_ORIGIN` | 웹 서비스 주소 |
| 웹 | `VITE_API_BASE_URL` | 백엔드 서비스 주소 |

웹은 이 값을 빌드 시점에 사용하므로, 입력 후 **수동 재배포(Manual Deploy)** 를 해야 반영됩니다.

자동으로 채워지는 값: `SYNC_SECRET`(Render 생성), `TRUST_PROXY`(`1`), `PORT`(`3000`)

배포 직후, 그리고 마이그레이션을 새로 적용한 뒤에는 동기화를 한 번 실행합니다.
(가입 제한 정보 등 상품 필드는 동기화 시점에 채워집니다)

```bash
curl -X POST https://<배포주소>/api/products/sync     -H "x-sync-secret: <SYNC_SECRET>"
curl -X POST https://<배포주소>/api/youth-policy/sync -H "x-sync-secret: <SYNC_SECRET>"
```

### Android APK

APK에는 백엔드 주소가 빌드 시점에 박힙니다. Vite가 `VITE_API_BASE_URL`을 코드에 넣기 때문에,
비워두면 에뮬레이터 전용 주소(`10.0.2.2`)로 빌드되어 실기기에서는 통신이 안 됩니다.

#### 방법 1. GitHub Actions (PC에 Android SDK가 없을 때)

저장소 **Actions → Android APK → Run workflow** 를 누르면 러너가 빌드해서
APK를 아티팩트로 올려줍니다. 완료 후 실행 화면 하단 **Artifacts**에서 내려받습니다.

- 백엔드 주소는 실행 시 입력란에 넣거나, **Settings → Secrets and variables → Actions → Variables**
  에 `VITE_API_BASE_URL`을 등록해두면 매번 입력하지 않아도 됩니다.
- Google 로그인을 쓰려면 같은 곳에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`도 등록합니다.

#### 방법 2. 로컬 빌드 (Android Studio 또는 Android SDK + JDK 17 이상)

`app/.env`에 `VITE_API_BASE_URL`을 지정한 뒤 실행합니다.

```bash
cd app
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

결과물: `app/android/app/build/outputs/apk/debug/app-debug.apk`

#### 설치

폰으로 파일을 옮겨 실행하거나 `adb install app-debug.apk`를 씁니다.
스토어를 거치지 않으므로 폰에서 **출처를 알 수 없는 앱 설치**를 허용해야 합니다.
디버그 서명 APK라 사이드로딩 전용이며, 스토어 배포용 서명 APK는 별도 키스토어가 필요합니다.

### iOS

iOS 플랫폼은 설정되어 있지 않습니다. 웹 주소를 Safari로 열고 **공유 → 홈 화면에 추가**를 하면
주소창 없이 전체화면으로 실행되어 앱과 유사하게 사용할 수 있습니다.

네이티브 앱이 필요하면 macOS와 Xcode, Apple Developer Program이 필요하며
`@capacitor/ios` 추가와 함께 URL 스킴을 `Info.plist`에 등록해야 합니다.

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
