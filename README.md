# ASO Copilot

> commit/push 전에 README를 자동 갱신하는 워크스페이스 문서입니다.

**Live**: [https://aso-copilot.pages.dev](https://aso-copilot.pages.dev)

---

## 서비스 개요

ASO Copilot은 앱 카피 생성 입력을 검증하고, 카피 품질을 점수화하며, 반복적인 App Store Optimization 워크플로우를 위한 API/웹 연동 지점을 제공하는 워크스페이스입니다.

---

## 주요 기능

### 1. 스키마 검증
- 공유 Zod 스키마로 요청/응답 계약을 검증해 API 동작을 안정적으로 유지합니다.

### 2. 카피 스코어링 엔진
- 키워드, 명확성, 수치 신호, 카테고리 정합성 점수로 실행 가능한 추천을 제공합니다.

### 3. 생성 API
- Cloudflare Worker + Hono 엔드포인트가 생성 입력을 처리하고 점수와 함께 변형 문구 결과를 반환합니다.

### 4. 웹 프론트엔드
- Next.js 프론트엔드가 향후 생성/스코어링 UI 플로우를 위한 연동 화면을 제공합니다.

---

## 프로젝트 구조

```text
.gitignore
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
README.md
README.meta.json
apps
   api
      .editorconfig
      .gitignore
      .prettierrc
      AGENTS.md
      package.json
      tsconfig.json
      vitest.config.mts
      worker-configuration.d.ts
      wrangler.jsonc
      .vscode
         settings.json
      public
         index.html
      src
         index.ts
      test
         env.d.ts
         index.spec.ts
         tsconfig.json
   web
      .env.local
      .gitignore
      eslint.config.mjs
      next-env.d.ts
      next.config.ts
      package.json
      README.md
      tsconfig.json
      tsconfig.tsbuildinfo
      public
         file.svg
         globe.svg
         next.svg
         vercel.svg
         window.svg
      src
         app
            favicon.ico
            globals.css
            layout.tsx
            page.module.css
            page.tsx
packages
   scoring
      package.json
      tsconfig.json
      src
         index.ts
         scoreCopy.ts
   shared
      package.json
      tsconfig.json
      src
         generate.ts
         index.ts
scripts
   update-readme.mjs
docs
   1.plan-shared-schema.md
   2.shared-schema-integration-result.md
   3.scoring-package-file-plan-and-claude-prompt.md
   4.scoring-v2.1-upgrade-result.md
   5.scoring-v2.2-upgrade-result.md
   6.web-scoring-integration-file-plan.md
   7.api-contract-breakdown-cors-file-plan.md
   8.web-export-pack-file-plan.md
docs_result
   3-1.scoring-package-implementation-result.md
.githooks
   pre-commit
   pre-push
.vscode
   settings.json
```

---

## 커밋/푸시 운영 규칙

- 커밋/푸시 전에 `scripts/update-readme.mjs`로 README를 최신 상태로 동기화합니다.
- `pre-commit` 훅에서 README를 갱신하고 자동으로 스테이징합니다.
- `pre-push` 훅에서 README 변경 여부를 점검하고, 변경 시 푸시를 중단합니다.
- 자동 동기화 블록(`README:AUTO-START/END`)은 스크립트가 직접 관리합니다.

---

## 업데이트 기록

<details>
<summary><strong>2026-02-28</strong> - README 자동화 양식 정비</summary>

**요약**
- README 자동화 출력 양식을 예시 기반 섹션형 템플릿으로 정리했습니다.
- 자동 동기화 블록(`README:AUTO-START/END`)을 스크립트가 직접 갱신하도록 구성했습니다.

<!-- README:AUTO-START -->
### 자동 동기화

#### 변경 파일(커밋 스테이징 기준)
```text
변경 파일 없음
```

<!-- README:AUTO-END -->

</details>
