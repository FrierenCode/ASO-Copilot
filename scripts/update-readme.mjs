#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readmePath = path.join(repoRoot, 'README.md')

const args = process.argv.slice(2)
const mode = getArgValue(args, '--mode') || 'manual'
const checkOnly = args.includes('--check')

const context = buildContext()
const nextReadme = renderReadme(context)
const currentReadme = readText(readmePath)
const changed = nextReadme !== currentReadme

if (checkOnly) {
  if (changed) {
    process.stderr.write('README.md가 최신 상태가 아닙니다. 실행: pnpm readme:update\n')
    process.exit(1)
  }
  process.stdout.write('README.md가 최신 상태입니다.\n')
  process.exit(0)
}

if (changed) {
  fs.writeFileSync(readmePath, nextReadme, 'utf8')
  process.stdout.write(`README.md를 업데이트했습니다. (${mode})\n`)
} else {
  process.stdout.write(`README.md가 이미 최신 상태입니다. (${mode})\n`)
}

function buildContext() {
  const rootPackage = readJson(path.join(repoRoot, 'package.json')) ?? {}
  const workspaceProjects = loadWorkspaceProjects()
  const apiEndpoints = extractApiEndpoints()
  const schemaSummary = extractSchemaSummary()
  const migrationFiles = listFilesRecursive('apps/api/src/db/migrations').filter((filePath) =>
    filePath.endsWith('.sql')
  )
  const docsCount = countMarkdownFiles('docs')
  const docsResultCount = countMarkdownFiles('docs_result')
  const techStack = collectTechStack(rootPackage, workspaceProjects, apiEndpoints, migrationFiles)
  const overview = buildOverview(workspaceProjects, apiEndpoints, migrationFiles, docsCount, docsResultCount)
  const directorySnapshot = buildDirectorySnapshot()

  return {
    rootPackage,
    workspaceProjects,
    apiEndpoints,
    schemaSummary,
    migrationFiles,
    docsCount,
    docsResultCount,
    techStack,
    overview,
    directorySnapshot,
  }
}

function renderReadme(context) {
  const title = inferTitle(context.rootPackage)
  const overviewSection = renderBulletList(
    context.overview,
    '저장소 메타데이터를 읽지 못했습니다. `pnpm readme:update`를 다시 실행하세요.'
  )
  const stackSection = renderBulletList(context.techStack, '기술 스택 정보를 감지하지 못했습니다.')
  const workspaceTable = renderWorkspaceTable(context.workspaceProjects)
  const apiTable = renderApiTable(context.apiEndpoints)
  const schemaSection = renderSchemaSection(context.schemaSummary)
  const directorySnapshot = context.directorySnapshot.join('\n')
  const rootCommands = renderRootCommands(context.rootPackage)
  const projectCommands = renderProjectCommands(context.workspaceProjects)

  return `# ${title}

> 이 문서는 \`scripts/update-readme.mjs\`가 저장소를 스캔해 자동 생성합니다.
> 수동 수정 내용은 다음 자동 실행에서 덮어써질 수 있습니다.

## 프로젝트 개요
${overviewSection}

## 기술 스택
${stackSection}

## 워크스페이스 패키지
${workspaceTable}

## API 엔드포인트 (apps/api)
${apiTable}

## 공유 스키마 요약 (packages/shared)
${schemaSection}

## 디렉터리 스냅샷
\`\`\`text
${directorySnapshot}
\`\`\`

## 자주 쓰는 명령어
### 루트
${rootCommands}

### 앱 / 패키지
${projectCommands}

## README 자동화 (커밋/푸시)
1. \`.githooks/pre-commit\`이 README를 재생성하고 \`README.md\`를 스테이징합니다.
2. \`.githooks/pre-push\`가 README를 재확인하고 변경이 있으면 푸시를 중단합니다.
3. 수동 업데이트: \`pnpm readme:update\`
4. 점검 모드: \`pnpm readme:check\`
5. 임시 우회: \`ASO_SKIP_README_HOOK=1\` (PowerShell: \`$env:ASO_SKIP_README_HOOK='1'\`)
`
}

function inferTitle(rootPackage) {
  const packageName = asString(rootPackage.name)
  if (!packageName) {
    return '프로젝트 README'
  }
  if (packageName === 'aso-copilot') {
    return 'ASO Copilot'
  }
  return packageName
}

function buildOverview(projects, apiEndpoints, migrationFiles, docsCount, docsResultCount) {
  const hasApi = hasProject(projects, 'apps/api')
  const hasWeb = hasProject(projects, 'apps/web')
  const hasShared = projects.some((project) => project.packageName === '@aso-copilot/shared')
  const hasScoring = projects.some((project) => project.packageName === '@aso-copilot/scoring')

  const endpointPaths = new Set(apiEndpoints.map((item) => item.path))
  const lines = []

  if (hasApi && hasWeb) {
    lines.push('`apps/web`(Next.js)와 `apps/api`(Cloudflare Worker)를 함께 운영하는 pnpm 모노레포입니다.')
  } else if (hasApi) {
    lines.push('Cloudflare Worker 기반 API 프로젝트입니다.')
  }

  if (hasShared) {
    lines.push('`packages/shared`에서 요청/응답 스키마를 공유해 API와 웹의 타입 계약을 맞춥니다.')
  }

  if (hasScoring) {
    lines.push('`packages/scoring`에서 카피 점수 계산과 추천 로직을 담당합니다.')
  }

  if (endpointPaths.has('/generate')) {
    lines.push('`POST /generate`는 생성된 카피 변형과 점수/추천 결과를 반환합니다.')
  }

  if (endpointPaths.has('/v1/entitlements')) {
    lines.push('`GET /v1/entitlements`는 현재 플랜과 월간 사용량 상태를 반환합니다.')
  }

  if (endpointPaths.has('/webhooks/polar')) {
    lines.push('`POST /webhooks/polar`는 결제 이벤트를 받아 entitlement를 동기화합니다.')
  }

  if (migrationFiles.length > 0) {
    lines.push(`D1 마이그레이션 파일 ${migrationFiles.length}개로 데이터 모델 변경을 관리합니다.`)
  }

  if (docsCount > 0 || docsResultCount > 0) {
    lines.push(
      `문서 자산: \`docs/\` ${docsCount}개, \`docs_result/\` ${docsResultCount}개의 Markdown 파일`
    )
  }

  return lines
}

function hasProject(projects, pathValue) {
  return projects.some((project) => project.path === pathValue)
}

function renderWorkspaceTable(projects) {
  if (projects.length === 0) {
    return '워크스페이스 패키지를 찾지 못했습니다.'
  }

  const header = [
    '| 경로 | 패키지 | 역할 | 주요 스크립트 |',
    '| --- | --- | --- | --- |',
  ]

  const rows = projects.map((project) => {
    const role = inferProjectRole(project)
    const scriptNames = Object.keys(project.scripts)
    const preview = scriptNames.length > 0
      ? scriptNames.slice(0, 5).map((name) => `\`${name}\``).join(', ')
      : '-'
    return `| \`${project.path}\` | \`${project.packageName}\` | ${role} | ${preview} |`
  })

  return `${header.join('\n')}\n${rows.join('\n')}`
}

function inferProjectRole(project) {
  const depSet = new Set(project.dependencyNames.map((name) => name.toLowerCase()))
  const lowerName = project.packageName.toLowerCase()

  if (project.path === 'apps/web' || depSet.has('next')) {
    return '웹 애플리케이션'
  }
  if (project.path === 'apps/api' || depSet.has('hono')) {
    return 'API Worker'
  }
  if (lowerName.includes('shared')) {
    return '공유 스키마/타입'
  }
  if (lowerName.includes('scoring')) {
    return '스코어링 로직'
  }

  return '워크스페이스 모듈'
}

function renderApiTable(endpoints) {
  if (endpoints.length === 0) {
    return '엔드포인트를 감지하지 못했습니다.'
  }

  const lines = [
    '| Method | Path | Source |',
    '| --- | --- | --- |',
  ]

  for (const endpoint of endpoints) {
    lines.push(`| \`${endpoint.method}\` | \`${endpoint.path}\` | \`${endpoint.source}\` |`)
  }

  return lines.join('\n')
}

function renderSchemaSection(summary) {
  if (
    summary.requestFields.length === 0 &&
    summary.responseFields.length === 0 &&
    summary.breakdownFields.length === 0
  ) {
    return '스키마 요약을 추출하지 못했습니다.'
  }

  const requestFields = summary.requestFields.length > 0
    ? summary.requestFields.map((field) => `- \`${field}\``).join('\n')
    : '- 없음'
  const responseFields = summary.responseFields.length > 0
    ? summary.responseFields.map((field) => `- \`${field}\``).join('\n')
    : '- 없음'
  const breakdownFields = summary.breakdownFields.length > 0
    ? summary.breakdownFields.map((field) => `- \`${field}\``).join('\n')
    : '- 없음'

  return `### GenerateRequestSchema
${requestFields}

### GenerateResponseSchema
${responseFields}

### BreakdownSchema
${breakdownFields}`
}

function buildDirectorySnapshot() {
  const lines = ['.']
  lines.push(...walkDirectory('', 0, 3, 10))
  return lines
}

function walkDirectory(relativeDir, depth, maxDepth, maxEntries) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    return []
  }

  const entries = fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => !shouldIgnoreEntry(relativeDir, entry))
    .sort((a, b) => sortEntries(relativeDir, a, b))

  const sliced = entries.slice(0, maxEntries)
  const lines = []

  for (const entry of sliced) {
    const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name
    const line = `${'  '.repeat(depth + 1)}${entry.name}${entry.isDirectory() ? '/' : ''}`
    lines.push(line)

    if (entry.isDirectory() && depth < maxDepth) {
      lines.push(...walkDirectory(childRelative, depth + 1, maxDepth, maxEntries))
    }
  }

  if (entries.length > sliced.length) {
    lines.push(`${'  '.repeat(depth + 1)}... (추가 ${entries.length - sliced.length}개)`)
  }

  return lines
}

function shouldIgnoreEntry(relativeDir, entry) {
  const ignoredDirectories = new Set([
    '.git',
    '.claude',
    '.wrangler',
    'node_modules',
    '.pnpm-store',
    '.next',
    'out',
    'dist',
    'build',
    'coverage',
  ])

  if (entry.isDirectory()) {
    return ignoredDirectories.has(entry.name)
  }

  if (entry.name.endsWith('.tsbuildinfo')) {
    return true
  }
  if (entry.name === '.DS_Store') {
    return true
  }
  if (entry.name.startsWith('.env')) {
    return true
  }

  if (!relativeDir && entry.name === 'pnpm-lock.yaml') {
    return true
  }

  return false
}

function sortEntries(relativeDir, a, b) {
  if (!relativeDir) {
    return sortByRootPriority(a, b)
  }

  if (a.isDirectory() && !b.isDirectory()) {
    return -1
  }
  if (!a.isDirectory() && b.isDirectory()) {
    return 1
  }
  return a.name.localeCompare(b.name)
}

function sortByRootPriority(a, b) {
  const rootOrder = [
    'apps',
    'packages',
    'scripts',
    '.githooks',
    'docs',
    'docs_result',
    'README.md',
    'package.json',
    'pnpm-workspace.yaml',
    '.gitignore',
    '.vscode',
  ]

  const indexA = rootOrder.indexOf(a.name)
  const indexB = rootOrder.indexOf(b.name)

  if (indexA !== -1 || indexB !== -1) {
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  }

  if (a.isDirectory() && !b.isDirectory()) {
    return -1
  }
  if (!a.isDirectory() && b.isDirectory()) {
    return 1
  }
  return a.name.localeCompare(b.name)
}

function renderRootCommands(rootPackage) {
  const scripts = normalizeScriptMap(rootPackage.scripts)
  const entries = sortScriptEntries(Object.entries(scripts))

  if (entries.length === 0) {
    return '- 루트 스크립트를 찾지 못했습니다.'
  }

  return entries
    .map(([name, value]) => `- \`pnpm ${name}\` - ${value}`)
    .join('\n')
}

function renderProjectCommands(projects) {
  if (projects.length === 0) {
    return '- 워크스페이스 패키지를 찾지 못했습니다.'
  }

  const blocks = projects.map((project) => {
    const entries = sortScriptEntries(Object.entries(project.scripts))
    if (entries.length === 0) {
      return `#### ${project.path}\n- 스크립트 없음`
    }

    const lines = entries
      .slice(0, 7)
      .map(([name, value]) => `- \`pnpm -C ${project.path} ${name}\` - ${value}`)
      .join('\n')

    return `#### ${project.path}\n${lines}`
  })

  return blocks.join('\n\n')
}

function sortScriptEntries(entries) {
  const preferred = [
    'dev',
    'start',
    'build',
    'test',
    'lint',
    'deploy',
    'readme:update',
    'readme:check',
    'prepare',
  ]

  return [...entries].sort(([nameA], [nameB]) => {
    const indexA = preferred.indexOf(nameA)
    const indexB = preferred.indexOf(nameB)

    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    }

    return nameA.localeCompare(nameB)
  })
}

function renderBulletList(items, fallback) {
  if (!items || items.length === 0) {
    return `- ${fallback}`
  }
  return items.map((item) => `- ${item}`).join('\n')
}

function loadWorkspaceProjects() {
  const groups = ['apps', 'packages']
  const projects = []

  for (const group of groups) {
    const groupAbs = path.join(repoRoot, group)
    if (!fs.existsSync(groupAbs) || !fs.statSync(groupAbs).isDirectory()) {
      continue
    }

    const dirs = fs
      .readdirSync(groupAbs, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b))

    for (const dirName of dirs) {
      const relPath = `${group}/${dirName}`
      const packagePath = path.join(repoRoot, relPath, 'package.json')
      if (!fs.existsSync(packagePath)) {
        continue
      }

      const packageJson = readJson(packagePath) ?? {}
      const scripts = normalizeScriptMap(packageJson.scripts)
      const dependencyNames = [
        ...Object.keys(normalizeScriptMap(packageJson.dependencies)),
        ...Object.keys(normalizeScriptMap(packageJson.devDependencies)),
      ]

      projects.push({
        path: relPath.replace(/\\/g, '/'),
        packageName: asString(packageJson.name) || dirName,
        version: asString(packageJson.version) || '0.0.0',
        scripts,
        dependencyNames,
      })
    }
  }

  return projects.sort((a, b) => a.path.localeCompare(b.path))
}

function normalizeScriptMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const output = {}
  for (const [key, script] of Object.entries(value)) {
    if (typeof script === 'string' && script.trim()) {
      output[key] = script.trim()
    }
  }
  return output
}

function collectTechStack(rootPackage, projects, endpoints, migrationFiles) {
  const dependencySet = new Set()
  addDependencyNames(dependencySet, rootPackage)
  for (const project of projects) {
    for (const depName of project.dependencyNames) {
      dependencySet.add(depName.toLowerCase())
    }
  }

  const lines = []

  if (asString(rootPackage.packageManager).startsWith('pnpm')) {
    lines.push(`pnpm 워크스페이스 (\`${asString(rootPackage.packageManager)}\`)`)
  }
  if (dependencySet.has('typescript')) {
    lines.push('TypeScript')
  }
  if (dependencySet.has('next')) {
    lines.push('Next.js + React')
  }
  if (dependencySet.has('hono')) {
    lines.push('Hono (API 라우터)')
  }
  if (dependencySet.has('wrangler')) {
    lines.push('Cloudflare Workers + Wrangler')
  }
  if (migrationFiles.length > 0) {
    lines.push('Cloudflare D1 (SQL 마이그레이션)')
  }
  if (dependencySet.has('zod')) {
    lines.push('Zod (공유 스키마 검증)')
  }
  if (dependencySet.has('vitest')) {
    lines.push('Vitest')
  }
  if (endpoints.some((endpoint) => endpoint.path === '/webhooks/polar')) {
    lines.push('Polar 웹훅 연동')
  }

  return dedupe(lines)
}

function addDependencyNames(targetSet, packageJson) {
  const deps = packageJson?.dependencies
  const devDeps = packageJson?.devDependencies

  if (deps && typeof deps === 'object') {
    for (const dep of Object.keys(deps)) {
      targetSet.add(dep.toLowerCase())
    }
  }
  if (devDeps && typeof devDeps === 'object') {
    for (const dep of Object.keys(devDeps)) {
      targetSet.add(dep.toLowerCase())
    }
  }
}

function dedupe(values) {
  return [...new Set(values)]
}

function extractApiEndpoints() {
  const files = []

  const appIndex = path.join(repoRoot, 'apps/api/src/index.ts')
  if (fs.existsSync(appIndex)) {
    files.push(appIndex)
  }

  const routeFiles = listFilesRecursive('apps/api/src/routes')
    .filter((filePath) => filePath.endsWith('.ts') || filePath.endsWith('.mts'))
    .map((filePath) => path.join(repoRoot, filePath))
  files.push(...routeFiles)

  const endpointPattern = /\b[a-zA-Z_$][\w$]*\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g
  const methodOrder = { GET: 1, POST: 2, PUT: 3, PATCH: 4, DELETE: 5 }

  const endpointMap = new Map()

  for (const filePath of files) {
    const source = readText(filePath)
    let match
    while ((match = endpointPattern.exec(source)) !== null) {
      const method = match[1].toUpperCase()
      const routePath = match[3].trim()
      if (!routePath.startsWith('/')) {
        continue
      }

      const key = `${method} ${routePath}`
      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          method,
          path: routePath,
          source: toPosix(path.relative(repoRoot, filePath)),
        })
      }
    }
  }

  return [...endpointMap.values()].sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path)
    }
    return (methodOrder[a.method] ?? 99) - (methodOrder[b.method] ?? 99)
  })
}

function extractSchemaSummary() {
  const sourcePath = path.join(repoRoot, 'packages/shared/src/generate.ts')
  const source = readText(sourcePath)
  if (!source) {
    return {
      requestFields: [],
      responseFields: [],
      breakdownFields: [],
    }
  }

  return {
    requestFields: extractZodObjectKeys(source, 'GenerateRequestSchema'),
    responseFields: extractZodObjectKeys(source, 'GenerateResponseSchema'),
    breakdownFields: extractZodObjectKeys(source, 'BreakdownSchema'),
  }
}

function extractZodObjectKeys(source, schemaName) {
  const marker = `${schemaName} = z.object(`
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) {
    return []
  }

  const openBraceIndex = source.indexOf('{', markerIndex + marker.length)
  if (openBraceIndex === -1) {
    return []
  }

  const body = extractObjectBody(source, openBraceIndex)
  if (!body) {
    return []
  }

  return parseTopLevelKeys(body)
}

function extractObjectBody(source, openBraceIndex) {
  let depth = 0
  for (let i = openBraceIndex + 1; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '{') {
      depth += 1
      continue
    }
    if (ch === '}') {
      if (depth === 0) {
        return source.slice(openBraceIndex + 1, i)
      }
      depth -= 1
    }
  }
  return ''
}

function parseTopLevelKeys(body) {
  const keys = []
  let depth = 0
  let cursor = 0

  while (cursor < body.length) {
    const ch = body[cursor]

    if (ch === '{') {
      depth += 1
      cursor += 1
      continue
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1)
      cursor += 1
      continue
    }

    if (depth === 0 && /[A-Za-z_]/.test(ch)) {
      const start = cursor
      cursor += 1
      while (cursor < body.length && /[A-Za-z0-9_]/.test(body[cursor])) {
        cursor += 1
      }
      const key = body.slice(start, cursor)

      let lookAhead = cursor
      while (lookAhead < body.length && /\s/.test(body[lookAhead])) {
        lookAhead += 1
      }

      if (body[lookAhead] === ':') {
        keys.push(key)
      }

      cursor = lookAhead + 1
      continue
    }

    cursor += 1
  }

  return dedupe(keys)
}

function listFilesRecursive(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir)
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    return []
  }

  const files = []

  function walk(currentAbsolute, currentRelative) {
    const entries = fs
      .readdirSync(currentAbsolute, { withFileTypes: true })
      .filter((entry) => !shouldIgnoreEntry(currentRelative, entry))
      .sort((a, b) => sortEntries(currentRelative, a, b))

    for (const entry of entries) {
      const nextRelative = currentRelative ? `${currentRelative}/${entry.name}` : entry.name
      const nextAbsolute = path.join(currentAbsolute, entry.name)

      if (entry.isDirectory()) {
        walk(nextAbsolute, nextRelative)
      } else if (entry.isFile()) {
        files.push(nextRelative.replace(/\\/g, '/'))
      }
    }
  }

  walk(absoluteDir, toPosix(relativeDir))
  return files
}

function countMarkdownFiles(relativeDir) {
  return listFilesRecursive(relativeDir).filter((filePath) => filePath.endsWith('.md')).length
}

function getArgValue(inputArgs, key) {
  const index = inputArgs.indexOf(key)
  if (index === -1 || index === inputArgs.length - 1) {
    return ''
  }
  return inputArgs[index + 1]
}

function readText(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return ''
    }
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toPosix(value) {
  return value.replace(/\\/g, '/')
}
