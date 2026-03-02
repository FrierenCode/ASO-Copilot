# ASO Copilot

> 이 문서는 `scripts/update-readme.mjs`가 저장소를 스캔해 자동 생성합니다.
> 수동 수정 내용은 다음 자동 실행에서 덮어써질 수 있습니다.

## 프로젝트 개요
- `apps/web`(Next.js)와 `apps/api`(Cloudflare Worker)를 함께 운영하는 pnpm 모노레포입니다.
- `packages/shared`에서 요청/응답 스키마를 공유해 API와 웹의 타입 계약을 맞춥니다.
- `packages/scoring`에서 카피 점수 계산과 추천 로직을 담당합니다.
- `POST /generate`는 생성된 카피 변형과 점수/추천 결과를 반환합니다.
- `GET /v1/entitlements`는 현재 플랜과 월간 사용량 상태를 반환합니다.
- `POST /webhooks/polar`는 결제 이벤트를 받아 entitlement를 동기화합니다.
- D1 마이그레이션 파일 2개로 데이터 모델 변경을 관리합니다.
- 문서 자산: `docs/` 15개, `docs_result/` 5개의 Markdown 파일

## 기술 스택
- pnpm 워크스페이스 (`pnpm@10.30.2`)
- TypeScript
- Next.js + React
- Hono (API 라우터)
- Cloudflare Workers + Wrangler
- Cloudflare D1 (SQL 마이그레이션)
- Zod (공유 스키마 검증)
- Vitest
- Polar 웹훅 연동

## 워크스페이스 패키지
| 경로 | 패키지 | 역할 | 주요 스크립트 |
| --- | --- | --- | --- |
| `apps/api` | `api` | API Worker | `deploy`, `dev`, `start`, `test`, `cf-typegen` |
| `apps/web` | `web` | 웹 애플리케이션 | `dev`, `build`, `start`, `lint` |
| `packages/scoring` | `@aso-copilot/scoring` | 스코어링 로직 | - |
| `packages/shared` | `@aso-copilot/shared` | 공유 스키마/타입 | - |

## API 엔드포인트 (apps/api)
| Method | Path | Source |
| --- | --- | --- |
| `GET` | `/api/me` | `apps/api/src/routes/me.ts` |
| `POST` | `/auth/logout` | `apps/api/src/routes/auth.ts` |
| `POST` | `/auth/request-magic-link` | `apps/api/src/routes/auth.ts` |
| `GET` | `/auth/verify` | `apps/api/src/routes/auth.ts` |
| `POST` | `/generate` | `apps/api/src/routes/generate.ts` |
| `GET` | `/health` | `apps/api/src/index.ts` |
| `GET` | `/v1/entitlements` | `apps/api/src/routes/entitlements.ts` |
| `POST` | `/webhooks/polar` | `apps/api/src/routes/webhooks.polar.ts` |

## 공유 스키마 요약 (packages/shared)
### GenerateRequestSchema
- `appName`
- `category`
- `screenshots`

### GenerateResponseSchema
- `variants`
- `score`
- `breakdown`
- `recommendation`

### BreakdownSchema
- `cta`
- `benefit`
- `clarity`
- `numeric`
- `emotion`

## 디렉터리 스냅샷
```text
.
  apps/
    api/
      .vscode/
        settings.json
      public/
        index.html
      src/
        db/
        middleware/
        repositories/
        routes/
        services/
        env.ts
        index.ts
      test/
        env.d.ts
        index.spec.ts
        setup.ts
        tsconfig.json
      .editorconfig
      .gitignore
      .prettierrc
      AGENTS.md
      package.json
      tsconfig.json
      ... (추가 3개)
    web/
      public/
        file.svg
        globe.svg
        next.svg
        vercel.svg
        window.svg
      src/
        app/
        components/
        hooks/
      .gitignore
      eslint.config.mjs
      next-env.d.ts
      next.config.ts
      package.json
      README.md
      tsconfig.json
  packages/
    scoring/
      src/
        index.ts
        scoreCopy.ts
      package.json
      tsconfig.json
    shared/
      src/
        generate.ts
        index.ts
      package.json
      tsconfig.json
  scripts/
    update-readme.mjs
  .githooks/
    pre-commit
    pre-push
  docs/
    1.plan-shared-schema.md
    10.product-frontend-architecture-polar-checkout.md
    11.webhook-uid-not-resolved-search-result.md
    12.webhook-uid-resolution-update.md
    13.free-default-search-and-write-conditions.md
    14.revenue-optimized-usage-and-magic-link-architecture.md
    15.revenue-v2-production-safe-architecture.md
    2.shared-schema-integration-result.md
    3.scoring-package-file-plan-and-claude-prompt.md
    4.scoring-v2.1-upgrade-result.md
    ... (추가 5개)
  docs_result/
    10-1.polar-checkout-frontend-result.md
    15-1.revenue-v2-production-safe-result.md
    3-1.scoring-package-implementation-result.md
    9-1.ASO-Copilot Production Architecture.md
    9-2.billing-entitlements-implementation-result.md
  README.md
  package.json
  pnpm-workspace.yaml
  .gitignore
  ... (추가 1개)
```

## 자주 쓰는 명령어
### 루트
- `pnpm build` - pnpm build:web
- `pnpm test` - echo "Error: no test specified" && exit 1
- `pnpm readme:update` - node scripts/update-readme.mjs --mode manual
- `pnpm readme:check` - node scripts/update-readme.mjs --mode manual --check
- `pnpm prepare` - git -c safe.directory=* config --local core.hooksPath .githooks
- `pnpm build:api` - pnpm -C apps/api build
- `pnpm build:web` - pnpm -C apps/web build
- `pnpm dev:api` - pnpm -C apps/api dev
- `pnpm dev:web` - pnpm -C apps/web dev

### 앱 / 패키지
#### apps/api
- `pnpm -C apps/api dev` - wrangler dev --local
- `pnpm -C apps/api start` - wrangler dev
- `pnpm -C apps/api test` - vitest
- `pnpm -C apps/api deploy` - wrangler deploy
- `pnpm -C apps/api cf-typegen` - wrangler types

#### apps/web
- `pnpm -C apps/web dev` - next dev
- `pnpm -C apps/web start` - next start
- `pnpm -C apps/web build` - next build
- `pnpm -C apps/web lint` - eslint

#### packages/scoring
- 스크립트 없음

#### packages/shared
- 스크립트 없음

## README 자동화 (커밋/푸시)
1. `.githooks/pre-commit`이 README를 재생성하고 `README.md`를 스테이징합니다.
2. `.githooks/pre-push`가 README를 재확인하고 변경이 있으면 푸시를 중단합니다.
3. 수동 업데이트: `pnpm readme:update`
4. 점검 모드: `pnpm readme:check`
5. 임시 우회: `ASO_SKIP_README_HOOK=1` (PowerShell: `$env:ASO_SKIP_README_HOOK='1'`)
