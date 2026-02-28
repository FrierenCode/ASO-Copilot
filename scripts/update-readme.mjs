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
  const changes = listChangedFiles(updateMode)
    .filter((change) => change.path !== 'README.md')

  if (changes.length === 0) {
    return []
  }

  const diffStats = collectDiffStats(updateMode)
  const lines = []

  lines.push(renderChangeSummaryLine(changes))

  const areaSummary = renderAreaSummaryLine(changes)
  if (areaSummary) {
    lines.push(areaSummary)
  }

  const detailLines = changes
    .slice(0, 10)
    .map((change) => renderDetailedChangeLine(change, diffStats))
    .filter(Boolean)

  lines.push(...detailLines)

  if (changes.length > 10) {
    lines.push(`- 상세 항목은 ${changes.length - 10}개 파일이 더 있습니다.`)
  }

  lines.push(`- 한줄 요약: ${buildOneLineSummary(changes)}`)

  return dedupe(lines)
}

function listChangedFiles(updateMode) {
  let changeLines = []

  if (updateMode === 'pre-commit') {
    changeLines = runGit(
      ['diff', '--cached', '--name-status', '--diff-filter=ACDMRT'],
      { allowFailure: true }
    )
    return dedupeChanges(
      changeLines
        .map((line) => parseNameStatusLine(line))
        .filter((item) => item.path !== '')
    )
  }

  if (updateMode === 'pre-push') {
    const upstream = resolveUpstreamRef()

    if (upstream) {
      changeLines = runGit(
        ['diff', '--name-status', '--diff-filter=ACDMRT', `${upstream}...HEAD`],
        { allowFailure: true }
      )
    } else {
      changeLines = runGit(
        ['show', '--name-status', '--pretty=format:', '--diff-filter=ACDMRT', 'HEAD'],
        { allowFailure: true }
      )
    }

    return dedupeChanges(
      changeLines
        .map((line) => parseNameStatusLine(line))
        .filter((item) => item.path !== '')
    )
  }

  const statusLines = runGit(['status', '--porcelain'], { allowFailure: true })
  return dedupeChanges(
    statusLines
      .map((line) => parsePorcelainStatusLine(line))
      .filter((item) => item.path !== '')
  )
}

function collectDiffStats(updateMode) {
  const numstatLines = []

  if (updateMode === 'pre-commit') {
    numstatLines.push(
      ...runGit(['diff', '--cached', '--numstat', '--diff-filter=ACDMRT'], {
        allowFailure: true,
      })
    )
  } else if (updateMode === 'pre-push') {
    const upstream = resolveUpstreamRef()

    if (upstream) {
      numstatLines.push(
        ...runGit(['diff', '--numstat', '--diff-filter=ACDMRT', `${upstream}...HEAD`], {
          allowFailure: true,
        })
      )
    } else {
      numstatLines.push(
        ...runGit(['show', '--numstat', '--pretty=format:', '--diff-filter=ACDMRT', 'HEAD'], {
          allowFailure: true,
        })
      )
    }
  } else {
    numstatLines.push(
      ...runGit(['diff', '--numstat', '--diff-filter=ACDMRT'], {
        allowFailure: true,
      })
    )
    numstatLines.push(
      ...runGit(['diff', '--cached', '--numstat', '--diff-filter=ACDMRT'], {
        allowFailure: true,
      })
    )
  }

  const stats = new Map()

  for (const line of numstatLines) {
    const parsed = parseNumstatLine(line)
    if (!parsed) {
      continue
    }

    const existing = stats.get(parsed.path) ?? { additions: 0, deletions: 0 }
    existing.additions += parsed.additions
    existing.deletions += parsed.deletions
    stats.set(parsed.path, existing)
  }

  return stats
}

function resolveUpstreamRef() {
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
    allowFailure: true,
  })

  return upstream.length > 0 ? upstream[0] : null
}

function parseNameStatusLine(line) {
  const parts = line.split('\t')
  if (parts.length < 2) {
    return { actionCode: 'M', action: '수정', path: '' }
  }

  const status = parts[0]
  const actionCode = status.charAt(0)
  const actionByCode = {
    A: '추가',
    C: '복사',
    D: '삭제',
    M: '수정',
    R: '이름 변경',
    T: '유형 변경',
  }

  const action = actionByCode[actionCode] ?? '수정'

  if (actionCode === 'R' && parts.length >= 3) {
    return {
      actionCode,
      action,
      path: parts[2].replace(/\\/g, '/'),
    }
  }

  return {
    actionCode,
    action,
    path: parts[1].replace(/\\/g, '/'),
  }
}

function parsePorcelainStatusLine(line) {
  if (!line || line.length < 3) {
    return { actionCode: 'M', action: '수정', path: '' }
  }

  const statusPair = line.slice(0, 2)
  const rawPath = line.slice(3).trim()
  if (!rawPath) {
    return { actionCode: 'M', action: '수정', path: '' }
  }

  const normalizedPath = normalizePathFromRename(rawPath)
  const primaryStatus = statusPair[0] !== ' ' ? statusPair[0] : statusPair[1]
  const normalizedStatus = primaryStatus === '?' ? 'A' : primaryStatus
  const actionByCode = {
    A: '추가',
    C: '복사',
    D: '삭제',
    M: '수정',
    R: '이름 변경',
    T: '유형 변경',
  }

  return {
    actionCode: actionByCode[normalizedStatus] ? normalizedStatus : 'M',
    action: actionByCode[normalizedStatus] ?? '수정',
    path: normalizedPath,
  }
}

function parseNumstatLine(line) {
  const parts = line.split('\t')
  if (parts.length < 3) {
    return null
  }

  const additions = parseInt(parts[0], 10)
  const deletions = parseInt(parts[1], 10)
  const rawPath = parts.slice(2).join('\t')
  const normalizedPath = normalizePathFromRename(rawPath)

  return {
    path: normalizedPath,
    additions: Number.isFinite(additions) ? additions : 0,
    deletions: Number.isFinite(deletions) ? deletions : 0,
  }
}

function normalizePathFromRename(value) {
  let normalized = value.trim().replace(/\\/g, '/')

  if (normalized.includes(' -> ')) {
    normalized = normalized.split(' -> ').at(-1) ?? normalized
  }

  if (normalized.includes('=>') && normalized.includes('{') && normalized.includes('}')) {
    normalized = normalized.replace(/\{([^{}]*)=>\s*([^{}]*)\}/g, '$2')
  }

  return normalized
}

function dedupeChanges(changes) {
  const byPath = new Map()

  for (const change of changes) {
    if (!change.path) {
      continue
    }
    byPath.set(change.path, change)
  }

  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path))
}

function renderChangeSummaryLine(changes) {
  const counts = countChangesByAction(changes)
  const parts = []

  if (counts.A > 0) parts.push(`추가 ${counts.A}개`)
  if (counts.M > 0) parts.push(`수정 ${counts.M}개`)
  if (counts.D > 0) parts.push(`삭제 ${counts.D}개`)
  if (counts.R > 0) parts.push(`이름 변경 ${counts.R}개`)
  if (counts.C > 0) parts.push(`복사 ${counts.C}개`)
  if (counts.T > 0) parts.push(`유형 변경 ${counts.T}개`)

  return `- 변경 요약: 총 ${changes.length}개 파일 (${parts.join(', ') || '수정 0개'}).`
}

function renderAreaSummaryLine(changes) {
  const areaCounts = new Map()

  for (const change of changes) {
    const area = classifyArea(change.path)
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
  }

  const ordered = Array.from(areaCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1]
      }
      return a[0].localeCompare(b[0])
    })
    .slice(0, 6)

  if (ordered.length === 0) {
    return ''
  }

  const text = ordered
    .map(([area, count]) => `\`${area}\` ${count}개`)
    .join(', ')

  return `- 구조 분석: ${text}.`
}

function renderDetailedChangeLine(change, diffStats) {
  const stat = diffStats.get(change.path)
  const statText = stat ? `, +${stat.additions}/-${stat.deletions}` : ''
  const detail = buildFileInsight(change)

  return `- 상세: \`${change.path}\` (${change.action}${statText}) - ${detail}`
}

function buildFileInsight(change) {
  const roleDescription = describeFile(change.path)

  if (change.actionCode === 'D') {
    return `${roleDescription} 파일을 삭제했습니다.`
  }

  if (change.path === 'package.json') {
    return summarizeRootPackageJson()
  }

  if (change.path.endsWith('/package.json')) {
    return summarizeWorkspacePackageJson(change.path) ?? roleDescription
  }

  if (change.path === 'README.meta.json') {
    return summarizeReadmeMeta()
  }

  if (change.path === 'README.md') {
    return summarizeReadmeDocument()
  }

  if (change.path.startsWith('.githooks/')) {
    return summarizeHookFile(change.path)
  }

  if (change.path === 'scripts/update-readme.mjs') {
    return summarizeReadmeAutomationScript()
  }

  if (change.path.endsWith('.ts') || change.path.endsWith('.tsx') || change.path.endsWith('.mts')) {
    return summarizeTypeScriptFile(change.path) ?? roleDescription
  }

  return roleDescription
}

function summarizeRootPackageJson() {
  const pkg = readJsonFile('package.json')
  if (!pkg || typeof pkg !== 'object') {
    return '워크스페이스 루트 설정과 실행 스크립트를 관리합니다.'
  }

  const scripts = pkg.scripts && typeof pkg.scripts === 'object'
    ? Object.keys(pkg.scripts)
    : []

  const primaryScripts = dedupe([
    ...scripts.filter((name) => name.startsWith('readme:')),
    ...scripts.filter((name) => name.startsWith('dev:')).slice(0, 2),
    ...scripts.filter((name) => name.startsWith('build:')).slice(0, 2),
    ...scripts.filter((name) => name === 'prepare'),
  ]).slice(0, 6)

  if (primaryScripts.length === 0) {
    return '워크스페이스 루트 설정과 실행 스크립트를 관리합니다.'
  }

  return `워크스페이스 루트 설정과 실행 스크립트를 관리합니다. 주요 스크립트: ${primaryScripts.map((name) => `\`${name}\``).join(', ')}.`
}

function summarizeWorkspacePackageJson(filePath) {
  const pkg = readJsonFile(filePath)
  if (!pkg || typeof pkg !== 'object') {
    return null
  }

  const packageName = asString(pkg.name)
  const scriptsCount = pkg.scripts && typeof pkg.scripts === 'object'
    ? Object.keys(pkg.scripts).length
    : 0
  const dependencyCount = countObjectKeys(pkg.dependencies) + countObjectKeys(pkg.devDependencies)

  const named = packageName ? `\`${packageName}\`` : '워크스페이스 패키지'
  return `${named} 설정 파일입니다. scripts ${scriptsCount}개, dependencies ${dependencyCount}개를 포함합니다.`
}

function summarizeReadmeMeta() {
  const meta = readJsonFile('README.meta.json')
  if (!meta || typeof meta !== 'object') {
    return 'README 자동 생성용 서비스/기능 메타데이터를 관리합니다.'
  }

  const projectName = asString(meta.projectName) || 'ASO Copilot'
  const features = Array.isArray(meta.features) ? meta.features : []
  const featureNames = features
    .map((item) => (item && typeof item === 'object' ? asString(item.name) : ''))
    .filter(Boolean)

  const preview = featureNames.slice(0, 3).join(', ')
  if (!preview) {
    return `${projectName} README의 서비스/기능 메타데이터를 관리합니다.`
  }

  return `${projectName} README 메타데이터입니다. 기능 ${featureNames.length}개(예: ${preview})를 정의합니다.`
}

function summarizeReadmeDocument() {
  const text = readTextFile('README.md')
  if (!text) {
    return '프로젝트 문서를 자동으로 생성/갱신합니다.'
  }

  const headings = []
  const headingPattern = /^##\s+(.+)$/gm
  let match
  while ((match = headingPattern.exec(text)) !== null) {
    headings.push(match[1].trim())
  }

  if (headings.length === 0) {
    return '프로젝트 문서를 자동으로 생성/갱신합니다.'
  }

  return `문서 핵심 섹션: ${headings.slice(0, 5).join(', ')}${headings.length > 5 ? ' 등' : ''}.`
}

function summarizeHookFile(filePath) {
  const text = readTextFile(filePath)
  if (!text) {
    return '커밋/푸시 시점 자동화 훅을 정의합니다.'
  }

  const commands = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('if '))
    .filter((line) => line !== 'fi')
    .filter((line) => !line.startsWith('then'))
    .filter((line) => !line.startsWith('else'))
    .filter((line) => line !== 'set -eu')
    .filter((line) => !line.startsWith('exit '))
    .slice(0, 4)
    .map((line) => `\`${truncate(line, 70)}\``)

  if (commands.length === 0) {
    return '커밋/푸시 시점 자동화 훅을 정의합니다.'
  }

  return `훅 실행 단계: ${commands.join(' -> ')}.`
}

function summarizeReadmeAutomationScript() {
  const text = readTextFile('scripts/update-readme.mjs')
  if (!text) {
    return 'README 자동 생성/요약/업데이트 노트 작성 로직을 포함합니다.'
  }

  const functionNames = []
  const functionPattern = /function\s+([A-Za-z0-9_]+)\s*\(/g
  let match
  while ((match = functionPattern.exec(text)) !== null) {
    functionNames.push(match[1])
  }

  const preferred = [
    'buildUpdateLines',
    'renderProjectStructure',
    'buildFileInsight',
    'renderDetailedChangeLine',
    'collectDiffStats',
  ]
  const selected = dedupe([
    ...preferred.filter((name) => functionNames.includes(name)),
    ...functionNames.slice(0, 5),
  ]).slice(0, 5)

  if (selected.length === 0) {
    return 'README 자동 생성/요약/업데이트 노트 작성 로직을 포함합니다.'
  }

  return `README 자동 생성/요약 로직입니다. 핵심 함수: ${selected.map((name) => `\`${name}\``).join(', ')}.`
}

function summarizeTypeScriptFile(filePath) {
  const text = readTextFile(filePath)
  if (!text) {
    return null
  }

  const exports = []
  const exportPattern = /export\s+(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g
  let match
  while ((match = exportPattern.exec(text)) !== null) {
    exports.push(match[1])
  }

  const uniqueExports = dedupe(exports).slice(0, 4)
  if (uniqueExports.length === 0) {
    return null
  }

  return `TypeScript 소스입니다. 주요 export: ${uniqueExports.map((name) => `\`${name}\``).join(', ')}.`
}

function readTextFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(absolutePath)) {
    return null
  }

  try {
    return fs.readFileSync(absolutePath, 'utf8')
  } catch {
    return null
  }
}

function readJsonFile(relativePath) {
  const text = readTextFile(relativePath)
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}

function countObjectKeys(value) {
  if (!value || typeof value !== 'object') {
    return 0
  }
  return Object.keys(value).length
}

function countChangesByAction(changes) {
  const counts = { A: 0, M: 0, D: 0, R: 0, C: 0, T: 0 }

  for (const change of changes) {
    if (counts[change.actionCode] !== undefined) {
      counts[change.actionCode] += 1
    } else {
      counts.M += 1
    }
  }

  return counts
}

function classifyArea(filePath) {
  if (filePath === 'README.md' || filePath === 'README.meta.json') {
    return '프로젝트 문서'
  }
  if (filePath === 'package.json' || filePath === 'pnpm-lock.yaml' || filePath === 'pnpm-workspace.yaml') {
    return '루트 설정'
  }
  if (filePath.startsWith('.githooks/')) {
    return 'Git 훅'
  }
  if (filePath.startsWith('scripts/')) {
    return '자동화 스크립트'
  }
  if (filePath.startsWith('apps/api/')) {
    return 'API 앱'
  }
  if (filePath.startsWith('apps/web/')) {
    return '웹 앱'
  }
  if (filePath.startsWith('packages/shared/')) {
    return '공유 패키지'
  }
  if (filePath.startsWith('packages/scoring/')) {
    return '스코어링 패키지'
  }
  if (filePath.startsWith('packages/')) {
    return '패키지'
  }
  if (filePath.startsWith('docs_result/')) {
    return '결과 문서'
  }
  if (filePath.startsWith('docs/')) {
    return '기획 문서'
  }

  const topLevel = filePath.split('/')[0] || '기타'
  return topLevel
}

function buildOneLineSummary(changes) {
  const areaCounts = new Map()
  const actionCounts = countChangesByAction(changes)

  for (const change of changes) {
    const area = classifyArea(change.path)
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
  }

  const topAreas = Array.from(areaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([area]) => area)

  const dominantActionCode = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'M'

  const actionVerb = {
    A: '추가',
    M: '수정',
    D: '삭제',
    R: '재구성',
    C: '복사',
    T: '변경',
  }[dominantActionCode] ?? '수정'

  const areaText = topAreas.length > 0
    ? `${topAreas.join(', ')} 영역`
    : '프로젝트 전반'

  return `${areaText} 중심으로 ${changes.length}개 파일을 ${actionVerb}했습니다.`
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

    notes.set(date, enhanceLegacyNotes(dedupe(lines)))
  }

  return notes
}

function renderReadme(meta, trackedFiles, notes) {
  const featureLines = meta.features
    .map((feature, index) => `${index + 1}. **${feature.name}**: ${feature.description}`)
    .join('\n')

  const structureSection = renderProjectStructure(trackedFiles)

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
${structureSection}

## 업데이트 노트
${notesStartMarker}
${notesBlock}
${notesEndMarker}
`
}

function renderProjectStructure(trackedFiles) {
  if (trackedFiles.length === 0) {
    return '- 추적된 파일을 찾지 못했습니다.'
  }

  const overviewLines = buildStructureOverview(trackedFiles)
  const groups = groupFilesBySection(trackedFiles)
  const orderedKeys = getOrderedGroupKeys(groups)
  const groupBlocks = orderedKeys.map((key) => renderFileGroup(key, groups.get(key) ?? []))

  return `### 구조 개요
${overviewLines.join('\n')}

### 파일 상세
${groupBlocks.join('\n\n')}`
}

function buildStructureOverview(files) {
  const rootCount = files.filter((filePath) => !filePath.includes('/')).length
  const topMap = new Map()

  for (const filePath of files) {
    const parts = filePath.split('/')
    if (parts.length === 1) {
      continue
    }

    const top = parts[0]
    const second = parts[1] ?? ''

    if (!topMap.has(top)) {
      topMap.set(top, {
        count: 0,
        secondLevel: new Map(),
      })
    }

    const topInfo = topMap.get(top)
    topInfo.count += 1
    if (second) {
      topInfo.secondLevel.set(second, (topInfo.secondLevel.get(second) ?? 0) + 1)
    }
  }

  const lines = [`- 루트 파일: ${rootCount}개`]
  const topOrder = ['apps', 'packages', 'scripts', 'docs', 'docs_result', '.githooks', '.vscode']

  const sortedTopKeys = Array.from(topMap.keys()).sort((a, b) => {
    const indexA = topOrder.indexOf(a)
    const indexB = topOrder.indexOf(b)
    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    }
    return a.localeCompare(b)
  })

  for (const top of sortedTopKeys) {
    const info = topMap.get(top)

    if ((top === 'apps' || top === 'packages') && info.secondLevel.size > 0) {
      const children = Array.from(info.secondLevel.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1]
          }
          return a[0].localeCompare(b[0])
        })
        .slice(0, 5)
        .map(([name, count]) => `${name} ${count}개`)
        .join(', ')
      lines.push(`- \`${top}/\`: 총 ${info.count}개 파일 (${children})`)
      continue
    }

    lines.push(`- \`${top}/\`: ${info.count}개 파일`)
  }

  return lines
}

function groupFilesBySection(files) {
  const groups = new Map()

  for (const filePath of files) {
    const key = getFileGroupKey(filePath)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(filePath)
  }

  for (const [key, groupFiles] of groups.entries()) {
    groups.set(
      key,
      groupFiles.sort((a, b) => a.localeCompare(b))
    )
  }

  return groups
}

function getFileGroupKey(filePath) {
  if (!filePath.includes('/')) {
    return 'root'
  }

  if (filePath.startsWith('.githooks/')) return '.githooks'
  if (filePath.startsWith('.vscode/')) return '.vscode'
  if (filePath.startsWith('apps/api/')) return 'apps/api'
  if (filePath.startsWith('apps/web/')) return 'apps/web'
  if (filePath.startsWith('packages/shared/')) return 'packages/shared'
  if (filePath.startsWith('packages/scoring/')) return 'packages/scoring'
  if (filePath.startsWith('packages/')) return 'packages/other'
  if (filePath.startsWith('scripts/')) return 'scripts'
  if (filePath.startsWith('docs_result/')) return 'docs_result'
  if (filePath.startsWith('docs/')) return 'docs'

  return filePath.split('/')[0]
}

function getOrderedGroupKeys(groups) {
  const preferredOrder = [
    'root',
    '.githooks',
    '.vscode',
    'apps/api',
    'apps/web',
    'packages/shared',
    'packages/scoring',
    'packages/other',
    'scripts',
    'docs',
    'docs_result',
  ]

  const keys = Array.from(groups.keys())
  const ordered = []

  for (const key of preferredOrder) {
    if (groups.has(key)) {
      ordered.push(key)
    }
  }

  const remaining = keys
    .filter((key) => !preferredOrder.includes(key))
    .sort((a, b) => a.localeCompare(b))

  return [...ordered, ...remaining]
}

function renderFileGroup(groupKey, files) {
  const title = getGroupTitle(groupKey)
  const rows = files
    .map((filePath) => {
      const displayPath = toGroupRelativePath(groupKey, filePath)
      return `| \`${displayPath}\` | ${describeFile(filePath)} |`
    })
    .join('\n')

  return `<details>
<summary>${title} (${files.length}개 파일)</summary>

| 파일 | 설명 |
| --- | --- |
${rows}
</details>`
}

function getGroupTitle(groupKey) {
  const titleMap = {
    root: '루트',
    '.githooks': 'Git Hooks',
    '.vscode': 'VSCode 설정',
    'apps/api': 'apps/api',
    'apps/web': 'apps/web',
    'packages/shared': 'packages/shared',
    'packages/scoring': 'packages/scoring',
    'packages/other': 'packages',
    scripts: 'scripts',
    docs: 'docs',
    docs_result: 'docs_result',
  }

  return titleMap[groupKey] ?? groupKey
}

function toGroupRelativePath(groupKey, filePath) {
  if (groupKey === 'root') {
    return filePath
  }

  const prefix = `${groupKey}/`
  if (filePath.startsWith(prefix)) {
    return filePath.slice(prefix.length)
  }

  return filePath
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
    '.githooks/pre-push': '푸시 전에 README 최신 여부를 점검합니다.',
    '.vscode/settings.json': 'VSCode 워크스페이스 설정입니다.',
    'README.md': '자동 생성되는 프로젝트 문서입니다.',
    'README.meta.json': '서비스/기능 설명 원본 메타데이터입니다.',
    'package.json': '워크스페이스 루트 패키지 메타데이터 및 스크립트입니다.',
    'pnpm-lock.yaml': '워크스페이스 의존성 잠금 파일입니다.',
    'pnpm-workspace.yaml': 'pnpm 워크스페이스 범위 설정입니다.',
    'scripts/update-readme.mjs': 'README 자동 갱신 및 변경 요약 생성 스크립트입니다.',
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
    return '워크스페이스에서 재사용하는 공유 스키마/타입 정의입니다.'
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
  if (normalized.startsWith('scripts/')) {
    return '자동화 실행 스크립트입니다.'
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

function enhanceLegacyNotes(lines) {
  if (lines.length === 0) {
    return lines
  }

  const alreadyDetailed = lines.some((line) =>
    line.startsWith('- 변경 요약:') ||
    line.startsWith('- 구조 분석:') ||
    line.startsWith('- 상세:') ||
    line.startsWith('- 한줄 요약:')
  )

  if (alreadyDetailed) {
    return lines
  }

  const parsedChanges = lines
    .map((line) => {
      const match = line.match(/^- (추가|수정|삭제|이름 변경|복사|유형 변경): `(.+)`$/)
      if (!match) {
        return null
      }

      const action = match[1]
      const path = match[2]
      const actionCodeByLabel = {
        추가: 'A',
        수정: 'M',
        삭제: 'D',
        '이름 변경': 'R',
        복사: 'C',
        '유형 변경': 'T',
      }

      return {
        actionCode: actionCodeByLabel[action] ?? 'M',
        action,
        path,
      }
    })
    .filter(Boolean)

  if (parsedChanges.length === 0) {
    return lines
  }

  const upgraded = [renderChangeSummaryLine(parsedChanges)]
  const areaLine = renderAreaSummaryLine(parsedChanges)
  if (areaLine) {
    upgraded.push(areaLine)
  }

  upgraded.push(
    ...parsedChanges
      .slice(0, 8)
      .map((change) => `- 상세: \`${change.path}\` (${change.action}) - ${buildFileInsight(change)}`)
  )

  if (parsedChanges.length > 8) {
    upgraded.push(`- 상세 항목은 ${parsedChanges.length - 8}개 파일이 더 있습니다.`)
  }

  upgraded.push(`- 한줄 요약: ${buildOneLineSummary(parsedChanges)}`)
  return dedupe(upgraded)
}

function scanFiles(baseDir, relativeDir) {
  const currentDir = path.join(baseDir, relativeDir)
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  const ignoreDirectories = new Set([
    '.git',
    '.claude',
    '.wrangler',
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
