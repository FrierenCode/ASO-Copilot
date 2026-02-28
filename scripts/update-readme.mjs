#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readmePath = path.join(repoRoot, 'README.md')
const metaPath = path.join(repoRoot, 'README.meta.json')
const notesStartMarker = '<!-- UPDATE_NOTES_START -->'
const notesEndMarker = '<!-- UPDATE_NOTES_END -->'

const args = process.argv.slice(2)
const mode = getArgValue(args, '--mode') ?? 'manual'
const checkOnly = args.includes('--check')

const metadata = loadMetadata()
const files = listTrackedFiles()
const existingReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : ''
const notes = parseExistingNotes(existingReadme)
const today = getTodayDate()
const updateLines = buildUpdateLines(mode)

if (!notes.has(today)) {
  notes.set(today, [])
}

if (updateLines.length > 0) {
  const todayLines = notes.get(today) ?? []
  for (const line of updateLines) {
    if (!todayLines.includes(line)) {
      todayLines.push(line)
    }
  }
  notes.set(today, todayLines)
}

const nextReadme = renderReadme(metadata, files, notes)
const changed = nextReadme !== existingReadme

if (checkOnly) {
  if (changed) {
    process.stderr.write('README.md가 최신 상태가 아닙니다. 실행: node scripts/update-readme.mjs --mode manual\n')
    process.exit(1)
  }
  process.stdout.write('README.md가 최신 상태입니다.\n')
  process.exit(0)
}

if (changed) {
  fs.writeFileSync(readmePath, nextReadme)
  process.stdout.write('README.md를 업데이트했습니다.\n')
} else {
  process.stdout.write('README.md가 이미 최신 상태입니다.\n')
}

function loadMetadata() {
  const fallback = {
    projectName: 'ASO Copilot',
    serviceDescription: 'ASO 카피 생성과 스코어링을 위한 워크스페이스입니다.',
    features: [
      {
        name: '스키마 검증',
        description: '생성 API 계약을 검증합니다.',
      },
      {
        name: '카피 스코어링',
        description: '카피를 점수화하고 추천을 반환합니다.',
      },
      {
        name: 'API + 웹',
        description: 'API와 프론트엔드 연동 지점을 제공합니다.',
      },
    ],
  }

  if (!fs.existsSync(metaPath)) {
    return fallback
  }

  try {
    const raw = fs.readFileSync(metaPath, 'utf8')
    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return fallback
    }

    const projectName = asString(parsed.projectName) || fallback.projectName
    const serviceDescription = asString(parsed.serviceDescription) || fallback.serviceDescription
    const features = Array.isArray(parsed.features)
      ? parsed.features
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: asString(item.name),
            description: asString(item.description),
          }))
          .filter((item) => item.name && item.description)
      : fallback.features

    return {
      projectName,
      serviceDescription,
      features: features.length > 0 ? features : fallback.features,
    }
  } catch {
    return fallback
  }
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function listTrackedFiles() {
  return scanFiles(repoRoot, '')
    .map((line) => line.replace(/\\/g, '/'))
    .sort((a, b) => a.localeCompare(b))
}

function buildUpdateLines(updateMode) {
  let diffLines = []

  if (updateMode === 'pre-commit') {
    diffLines = runGit(
      ['diff', '--cached', '--name-status', '--diff-filter=ACDMRT'],
      { allowFailure: true }
    )
  } else if (updateMode === 'pre-push') {
    const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
      allowFailure: true,
    })

    if (upstream.length > 0) {
      diffLines = runGit(
        ['diff', '--name-status', '--diff-filter=ACDMRT', `${upstream[0]}...HEAD`],
        { allowFailure: true }
      )
    } else {
      diffLines = runGit(
        ['show', '--name-status', '--pretty=format:', '--diff-filter=ACDMRT', 'HEAD'],
        { allowFailure: true }
      )
    }
  }

  const normalized = diffLines
    .map((line) => parseNameStatusLine(line))
    .filter((item) => item.path !== '')
    .filter((item) => item.path !== 'README.md')
    .map((item) => `- ${item.action}: \`${item.path}\``)

  return dedupe(normalized)
}

function parseNameStatusLine(line) {
  const parts = line.split('\t')
  if (parts.length < 2) {
    return { action: '수정', path: '' }
  }

  const status = parts[0]
  const statusCode = status.charAt(0)
  const actionByCode = {
    A: '추가',
    C: '복사',
    D: '삭제',
    M: '수정',
    R: '이름 변경',
    T: '유형 변경',
  }

  const action = actionByCode[statusCode] ?? '수정'

  if (statusCode === 'R' && parts.length >= 3) {
    return { action, path: parts[2].replace(/\\/g, '/') }
  }

  return { action, path: parts[1].replace(/\\/g, '/') }
}

function parseExistingNotes(readmeText) {
  const notes = new Map()
  if (!readmeText) {
    return notes
  }

  const markerStartIndex = readmeText.indexOf(notesStartMarker)
  const markerEndIndex = readmeText.indexOf(notesEndMarker)

  if (markerStartIndex === -1 || markerEndIndex === -1 || markerEndIndex <= markerStartIndex) {
    return notes
  }

  const notesBody = readmeText.slice(markerStartIndex + notesStartMarker.length, markerEndIndex)
  const detailPattern = /<details>\s*<summary>(\d{4}-\d{2}-\d{2})<\/summary>([\s\S]*?)<\/details>/g
  let match
  while ((match = detailPattern.exec(notesBody)) !== null) {
    const date = match[1]
    const body = match[2]
    const lines = body
      .split(/\r?\n/)
      .map((line) => normalizeLegacyNoteLine(line.trim()))
      .filter((line) => line.startsWith('- '))

    notes.set(date, dedupe(lines))
  }

  return notes
}

function renderReadme(meta, trackedFiles, notes) {
  const featureLines = meta.features
    .map((feature, index) => `${index + 1}. **${feature.name}**: ${feature.description}`)
    .join('\n')

  const structureLines = trackedFiles.length > 0
    ? trackedFiles
        .map((filePath) => `| \`${filePath}\` | ${describeFile(filePath)} |`)
        .join('\n')
    : '| `(없음)` | 추적된 파일을 찾지 못했습니다. |'

  const noteEntries = Array.from(notes.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, lines]) => renderDateNote(date, lines))
    .join('\n\n')

  const notesBlock = noteEntries || renderDateNote(getTodayDate(), ['- README 자동화 초기 기준 문서를 생성했습니다.'])

  return `# ${meta.projectName}

> 이 README는 Git hook으로 commit/push 전에 자동 갱신됩니다.

## 서비스 설명
${meta.serviceDescription}

## 기능별 설명
${featureLines}

## 프로젝트 파일 구조
| 경로 | 설명 |
| --- | --- |
${structureLines}

## 업데이트 노트
${notesStartMarker}
${notesBlock}
${notesEndMarker}
`
}

function renderDateNote(date, lines) {
  const body = lines.length > 0 ? lines.join('\n') : '- 표시할 파일 변경 사항이 없습니다.'
  return `<details>\n<summary>${date}</summary>\n\n${body}\n</details>`
}

function describeFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const ext = path.extname(normalized)

  const exactMatches = {
    '.gitignore': 'Git 무시 패턴입니다.',
    '.githooks/pre-commit': '커밋 전에 README를 갱신하고 스테이징합니다.',
    '.githooks/pre-push': '푸시 전에 README 최신 여부를 확인합니다.',
    'README.md': '자동 생성되는 프로젝트 문서입니다.',
    'README.meta.json': '서비스/기능 설명 원본 메타데이터입니다.',
    'package.json': '워크스페이스 루트 패키지 메타데이터 및 스크립트입니다.',
    'pnpm-lock.yaml': '워크스페이스 의존성 잠금 파일입니다.',
    'pnpm-workspace.yaml': 'pnpm 워크스페이스 범위 설정입니다.',
    'scripts/update-readme.mjs': 'Git hook에서 사용하는 README 자동 갱신 스크립트입니다.',
  }

  if (exactMatches[normalized]) {
    return exactMatches[normalized]
  }

  if (normalized.startsWith('apps/api/src/')) {
    return 'Cloudflare Worker + Hono용 API 런타임 소스입니다.'
  }
  if (normalized.startsWith('apps/api/test/')) {
    return 'API 테스트 소스 및 테스트 환경 타입 정의입니다.'
  }
  if (normalized.startsWith('apps/api/public/')) {
    return 'API 앱 도구에서 제공하는 정적 자산입니다.'
  }
  if (normalized.startsWith('apps/api/')) {
    return 'API 앱 설정 및 패키지 메타데이터입니다.'
  }
  if (normalized.startsWith('apps/web/src/app/')) {
    return 'Next.js App Router 페이지/레이아웃/스타일 소스입니다.'
  }
  if (normalized.startsWith('apps/web/public/')) {
    return '웹 앱 렌더링용 정적 자산입니다.'
  }
  if (normalized.startsWith('apps/web/')) {
    return '웹 앱 설정 및 패키지 메타데이터입니다.'
  }
  if (normalized.startsWith('packages/shared/src/')) {
    return '워크스페이스 패키지에서 재사용하는 공유 스키마/타입 정의입니다.'
  }
  if (normalized.startsWith('packages/shared/')) {
    return '앱 간 계약을 위한 공유 패키지 설정입니다.'
  }
  if (normalized.startsWith('packages/scoring/src/')) {
    return '카피 스코어링 구현 및 공개 export입니다.'
  }
  if (normalized.startsWith('packages/scoring/')) {
    return '스코어링 패키지 설정입니다.'
  }
  if (normalized.startsWith('docs_result/')) {
    return '구현 작업 결과 문서입니다.'
  }
  if (normalized.startsWith('docs/')) {
    return '기획 및 구현 문서입니다.'
  }

  if (ext === '.md') {
    return 'Markdown 문서 파일입니다.'
  }
  if (ext === '.json' || ext === '.jsonc') {
    return 'JSON 설정 파일입니다.'
  }
  if (ext === '.yaml' || ext === '.yml') {
    return 'YAML 설정 파일입니다.'
  }
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts') {
    return 'TypeScript 소스 파일입니다.'
  }
  if (ext === '.css') {
    return 'CSS 스타일시트입니다.'
  }
  if (ext === '.ico' || ext === '.svg' || ext === '.html') {
    return '정적 UI 자산입니다.'
  }

  return '프로젝트 파일입니다.'
}

function dedupe(items) {
  return [...new Set(items)]
}

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function runGit(gitArgs, options = {}) {
  const result = spawnSync('git', ['-c', `safe.directory=${toPosixPath(repoRoot)}`, ...gitArgs], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  if (result.error) {
    if (options.allowFailure) {
      return []
    }
    throw result.error
  }

  if (result.status !== 0) {
    if (options.allowFailure) {
      return []
    }

    const stderr = result.stderr?.trim()
    const stdout = result.stdout?.trim()
    const message = stderr || stdout || `Git command failed: ${gitArgs.join(' ')}`
    throw new Error(message)
  }

  const output = result.stdout?.trim()
  if (!output) {
    return []
  }

  return output.split(/\r?\n/)
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, '/')
}

function getArgValue(argv, flag) {
  const index = argv.indexOf(flag)
  if (index === -1 || index + 1 >= argv.length) {
    return null
  }
  return argv[index + 1]
}

function normalizeLegacyNoteLine(line) {
  const messageMap = {
    '- No visible file changes were detected.': '- 표시할 파일 변경 사항이 없습니다.',
    '- Initial README automation baseline.': '- README 자동화 초기 기준 문서를 생성했습니다.',
  }

  if (messageMap[line]) {
    return messageMap[line]
  }

  const actionMatch = line.match(/^- (Added|Copied|Deleted|Updated|Renamed|Type changed): `(.+)`$/)
  if (!actionMatch) {
    return line
  }

  const legacyActionMap = {
    Added: '추가',
    Copied: '복사',
    Deleted: '삭제',
    Updated: '수정',
    Renamed: '이름 변경',
    'Type changed': '유형 변경',
  }

  const action = legacyActionMap[actionMatch[1]] ?? actionMatch[1]
  return `- ${action}: \`${actionMatch[2]}\``
}

function scanFiles(baseDir, relativeDir) {
  const currentDir = path.join(baseDir, relativeDir)
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  const ignoreDirectories = new Set([
    '.git',
    '.claude',
    '.wrangler',
    '.vscode',
    'node_modules',
    '.pnpm-store',
    '.next',
    'dist',
    'build',
    'coverage',
  ])
  const files = []

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (ignoreDirectories.has(entry.name)) {
        continue
      }
      files.push(...scanFiles(baseDir, relativePath))
      continue
    }

    if (entry.isFile()) {
      files.push(relativePath)
    }
  }

  return files
}
