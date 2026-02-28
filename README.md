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
### 구조 개요
- 루트 파일: 6개
- `apps/`: 총 34개 파일 (web 19개, api 15개)
- `packages/`: 총 8개 파일 (scoring 4개, shared 4개)
- `scripts/`: 1개 파일
- `docs/`: 7개 파일
- `docs_result/`: 1개 파일
- `.githooks/`: 2개 파일
- `.vscode/`: 1개 파일

### 파일 상세
<details>
<summary>루트 (6개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `.gitignore` | Git 무시 패턴입니다. |
| `package.json` | 워크스페이스 루트 패키지 메타데이터 및 스크립트입니다. |
| `pnpm-lock.yaml` | 워크스페이스 의존성 잠금 파일입니다. |
| `pnpm-workspace.yaml` | pnpm 워크스페이스 범위 설정입니다. |
| `README.md` | 자동 생성되는 프로젝트 문서입니다. |
| `README.meta.json` | 서비스/기능 설명 원본 메타데이터입니다. |
</details>

<details>
<summary>Git Hooks (2개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `pre-commit` | 커밋 전에 README를 갱신하고 스테이징합니다. |
| `pre-push` | 푸시 전에 README 최신 여부를 점검합니다. |
</details>

<details>
<summary>VSCode 설정 (1개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `settings.json` | VSCode 워크스페이스 설정입니다. |
</details>

<details>
<summary>apps/api (15개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `.editorconfig` | API 앱 설정 및 패키지 메타데이터입니다. |
| `.gitignore` | API 앱 설정 및 패키지 메타데이터입니다. |
| `.prettierrc` | API 앱 설정 및 패키지 메타데이터입니다. |
| `.vscode/settings.json` | API 앱 설정 및 패키지 메타데이터입니다. |
| `AGENTS.md` | API 앱 설정 및 패키지 메타데이터입니다. |
| `package.json` | API 앱 설정 및 패키지 메타데이터입니다. |
| `public/index.html` | API 앱 도구에서 제공하는 정적 자산입니다. |
| `src/index.ts` | Cloudflare Worker + Hono용 API 런타임 소스입니다. |
| `test/env.d.ts` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `test/index.spec.ts` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `test/tsconfig.json` | API 테스트 소스 및 테스트 환경 타입 정의입니다. |
| `tsconfig.json` | API 앱 설정 및 패키지 메타데이터입니다. |
| `vitest.config.mts` | API 앱 설정 및 패키지 메타데이터입니다. |
| `worker-configuration.d.ts` | API 앱 설정 및 패키지 메타데이터입니다. |
| `wrangler.jsonc` | API 앱 설정 및 패키지 메타데이터입니다. |
</details>

<details>
<summary>apps/web (19개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `.gitignore` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `eslint.config.mjs` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `next-env.d.ts` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `next.config.ts` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `package.json` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `pnpm-lock.yaml` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `pnpm-workspace.yaml` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `public/file.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `public/globe.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `public/next.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `public/vercel.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `public/window.svg` | 웹 앱 렌더링용 정적 자산입니다. |
| `README.md` | 웹 앱 설정 및 패키지 메타데이터입니다. |
| `src/app/favicon.ico` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `src/app/globals.css` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `src/app/layout.tsx` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `src/app/page.module.css` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `src/app/page.tsx` | Next.js App Router 페이지/레이아웃/스타일 소스입니다. |
| `tsconfig.json` | 웹 앱 설정 및 패키지 메타데이터입니다. |
</details>

<details>
<summary>packages/shared (4개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `package.json` | 앱 간 계약을 위한 공유 패키지 설정입니다. |
| `src/generate.ts` | 워크스페이스에서 재사용하는 공유 스키마/타입 정의입니다. |
| `src/index.ts` | 워크스페이스에서 재사용하는 공유 스키마/타입 정의입니다. |
| `tsconfig.json` | 앱 간 계약을 위한 공유 패키지 설정입니다. |
</details>

<details>
<summary>packages/scoring (4개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `package.json` | 스코어링 패키지 설정입니다. |
| `src/index.ts` | 카피 스코어링 구현 및 공개 export입니다. |
| `src/scoreCopy.ts` | 카피 스코어링 구현 및 공개 export입니다. |
| `tsconfig.json` | 스코어링 패키지 설정입니다. |
</details>

<details>
<summary>scripts (1개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `update-readme.mjs` | README 자동 갱신 및 변경 요약 생성 스크립트입니다. |
</details>

<details>
<summary>docs (7개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `1.plan-shared-schema.md` | 기획 및 구현 문서입니다. |
| `2.shared-schema-integration-result.md` | 기획 및 구현 문서입니다. |
| `3.scoring-package-file-plan-and-claude-prompt.md` | 기획 및 구현 문서입니다. |
| `4.scoring-v2.1-upgrade-result.md` | 기획 및 구현 문서입니다. |
| `5.scoring-v2.2-upgrade-result.md` | 기획 및 구현 문서입니다. |
| `6.web-scoring-integration-file-plan.md` | 기획 및 구현 문서입니다. |
| `7.api-contract-breakdown-cors-file-plan.md` | 기획 및 구현 문서입니다. |
</details>

<details>
<summary>docs_result (1개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
| `3-1.scoring-package-implementation-result.md` | 구현 작업 결과 문서입니다. |
</details>

## 업데이트 노트
<!-- UPDATE_NOTES_START -->
<details>
<summary>2026-02-28</summary>

- 변경 요약: 총 5개 파일 (추가 4개, 수정 1개).
- 구조 분석: `Git 훅` 2개, `루트 설정` 1개, `자동화 스크립트` 1개, `프로젝트 문서` 1개.
- 상세: `.githooks/pre-commit` (추가) - 훅 실행 단계: `node scripts/update-readme.mjs --mode pre-commit` -> `git -c safe.directory=* add README.md`.
- 상세: `.githooks/pre-push` (추가) - 훅 실행 단계: `node scripts/update-readme.mjs --mode pre-push` -> `git -c safe.directory=* add README.md` -> `echo "README.md was updated before push."` -> `echo "Please commit README.md, then run git push again."`.
- 상세: `README.meta.json` (추가) - ASO Copilot README 메타데이터입니다. 기능 4개(예: 스키마 검증, 카피 스코어링 엔진, 생성 API)를 정의합니다.
- 상세: `package.json` (수정) - 워크스페이스 루트 설정과 실행 스크립트를 관리합니다. 주요 스크립트: `readme:update`, `readme:check`, `dev:web`, `dev:api`, `build:web`, `build:api`.
- 상세: `scripts/update-readme.mjs` (추가) - README 자동 생성/요약 로직입니다. 핵심 함수: `buildUpdateLines`, `renderProjectStructure`, `buildFileInsight`, `renderDetailedChangeLine`, `collectDiffStats`.
- 한줄 요약: Git 훅, 프로젝트 문서 영역 중심으로 5개 파일을 추가했습니다.
</details>
<!-- UPDATE_NOTES_END -->
