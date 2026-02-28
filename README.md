# ASO Copilot

> 이 README는 Git hook으로 commit/push 전에 자동 갱신됩니다.

## 서비스 설명
ASO Copilot은 앱 카피 생성 입력을 검증하고, 카피 품질을 점수화하며, 반복적인 App Store Optimization 워크플로우를 위한 API/웹 연동 지점을 제공하는 워크스페이스입니다.

## 기능별 설명
1. **스키마 검증**: 공유 Zod 스키마로 요청/응답 계약을 검증해 API 동작을 안정적으로 유지합니다.
2. **카피 스코어링 엔진**: 키워드, 명확성, 수치 신호, 카테고리 정합성 점수로 실행 가능한 추천을 제공합니다.
3. **생성 API**: Cloudflare Worker + Hono 엔드포인트가 생성 입력을 처리하고 점수와 함께 변형 문구 결과를 반환합니다.
4. **웹 프론트엔드**: Next.js 프론트엔드가 향후 생성/스코어링 UI 플로우를 위한 연동 화면을 제공합니다.

## 프로젝트 파일 구조
| 경로 | 설명 |
| --- | --- |
| `.githooks/pre-commit` | 커밋 전에 README를 갱신하고 스테이징합니다. |
| `.githooks/pre-push` | 푸시 전에 README 최신 여부를 확인합니다. |
| `.gitignore` | Git 무시 패턴입니다. |
| `apps/api/.editorconfig` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/.gitignore` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/.prettierrc` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/AGENTS.md` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/package.json` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/public/index.html` | API 앱 도구에서 제공하는 정적 자산입니다. |
| `apps/api/src/index.ts` | Cloudflare Worker + Hono용 API 런타임 소스입니다. |
| `apps/api/test/env.d.ts` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `apps/api/test/index.spec.ts` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `apps/api/test/tsconfig.json` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `apps/api/tsconfig.json` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/vitest.config.mts` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/worker-configuration.d.ts` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/api/wrangler.jsonc` | API 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/.gitignore` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/eslint.config.mjs` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/next-env.d.ts` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/next.config.ts` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/package.json` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/pnpm-lock.yaml` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/pnpm-workspace.yaml` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/public/file.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `apps/web/public/globe.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `apps/web/public/next.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `apps/web/public/vercel.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `apps/web/public/window.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `apps/web/README.md` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `apps/web/src/app/favicon.ico` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `apps/web/src/app/globals.css` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `apps/web/src/app/layout.tsx` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `apps/web/src/app/page.module.css` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `apps/web/src/app/page.tsx` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `apps/web/tsconfig.json` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `docs_result/3-1.scoring-package-implementation-result.md` | 구현 작업 결과 문서입니다. |
| `docs/1.plan-shared-schema.md` | 기획 및 구현 문서입니다. |
| `docs/2.shared-schema-integration-result.md` | 기획 및 구현 문서입니다. |
| `docs/3.scoring-package-file-plan-and-claude-prompt.md` | 기획 및 구현 문서입니다. |
| `docs/4.scoring-v2.1-upgrade-result.md` | 기획 및 구현 문서입니다. |
| `docs/5.scoring-v2.2-upgrade-result.md` | 기획 및 구현 문서입니다. |
| `docs/6.web-scoring-integration-file-plan.md` | 기획 및 구현 문서입니다. |
| `docs/7.api-contract-breakdown-cors-file-plan.md` | 기획 및 구현 문서입니다. |
| `package.json` | 워크스페이스 루트 패키지 메타데이터 및 스크립트입니다. |
| `packages/scoring/package.json` | 스코어링 패키지 설정입니다. |
| `packages/scoring/src/index.ts` | 카피 스코어링 구현 및 공개 export입니다. |
| `packages/scoring/src/scoreCopy.ts` | 카피 스코어링 구현 및 공개 export입니다. |
| `packages/scoring/tsconfig.json` | 스코어링 패키지 설정입니다. |
| `packages/shared/package.json` | 앱 간 계약을 위한 공유 패키지 설정입니다. |
| `packages/shared/src/generate.ts` | 워크스페이스 패키지에서 재사용하는 공유 스키마/타입 정의입니다. |
| `packages/shared/src/index.ts` | 워크스페이스 패키지에서 재사용하는 공유 스키마/타입 정의입니다. |
| `packages/shared/tsconfig.json` | 앱 간 계약을 위한 공유 패키지 설정입니다. |
| `pnpm-lock.yaml` | 워크스페이스 의존성 잠금 파일입니다. |
| `pnpm-workspace.yaml` | pnpm 워크스페이스 범위 설정입니다. |
| `README.md` | 자동 생성되는 프로젝트 문서입니다. |
| `README.meta.json` | 서비스/기능 설명 원본 메타데이터입니다. |
| `scripts/update-readme.mjs` | Git hook에서 사용하는 README 자동 갱신 스크립트입니다. |

## 업데이트 노트
<!-- UPDATE_NOTES_START -->
<details>
<summary>2026-02-28</summary>

- 표시할 파일 변경 사항이 없습니다.
- 추가: `.githooks/pre-commit`
- 추가: `.githooks/pre-push`
- 추가: `README.meta.json`
- 수정: `package.json`
- 추가: `scripts/update-readme.mjs`
</details>
<!-- UPDATE_NOTES_END -->
