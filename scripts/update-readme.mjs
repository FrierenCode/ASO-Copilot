#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readmePath = path.join(repoRoot, 'README.md')
const metaPath = path.join(repoRoot, 'README.meta.json')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')

const metadata = loadMetadata()
const files = listProjectFiles()
const existingReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : ''
const nextReadme = renderReadme(metadata, files)
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

function listProjectFiles() {
  return scanFiles(repoRoot, '')
    .map((filePath) => filePath.replace(/\\/g, '/'))
    .sort((a, b) => a.localeCompare(b))
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

function renderReadme(meta, trackedFiles) {
  const featureLines = meta.features
    .map((feature, index) => `${index + 1}. **${feature.name}**: ${feature.description}`)
    .join('\n')

  const structureSection = renderProjectStructure(trackedFiles)

  return `# ${meta.projectName}

> 이 README는 Git hook으로 commit/push 전에 자동 갱신됩니다.

## 서비스 설명
${meta.serviceDescription}

## 기능별 설명
${featureLines}

## 프로젝트 파일 구조
${structureSection}
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
  if (!filePath.includes('/')) return 'root'
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
    'scripts/update-readme.mjs': 'README 자동 갱신 스크립트입니다.',
  }

  if (exactMatches[normalized]) {
    return exactMatches[normalized]
  }

  if (normalized.startsWith('apps/api/src/')) return 'Cloudflare Worker + Hono용 API 런타임 소스입니다.'
  if (normalized.startsWith('apps/api/test/')) return 'API 테스트 소스 및 테스트 환경 타입 정의입니다.'
  if (normalized.startsWith('apps/api/public/')) return 'API 앱 도구에서 제공하는 정적 자산입니다.'
  if (normalized.startsWith('apps/api/')) return 'API 앱 설정 및 패키지 메타데이터입니다.'
  if (normalized.startsWith('apps/web/src/app/')) return 'Next.js App Router 페이지/레이아웃/스타일 소스입니다.'
  if (normalized.startsWith('apps/web/public/')) return '웹 앱 렌더링용 정적 자산입니다.'
  if (normalized.startsWith('apps/web/')) return '웹 앱 설정 및 패키지 메타데이터입니다.'
  if (normalized.startsWith('packages/shared/src/')) return '워크스페이스에서 재사용하는 공유 스키마/타입 정의입니다.'
  if (normalized.startsWith('packages/shared/')) return '앱 간 계약을 위한 공유 패키지 설정입니다.'
  if (normalized.startsWith('packages/scoring/src/')) return '카피 스코어링 구현 및 공개 export입니다.'
  if (normalized.startsWith('packages/scoring/')) return '스코어링 패키지 설정입니다.'
  if (normalized.startsWith('docs_result/')) return '구현 작업 결과 문서입니다.'
  if (normalized.startsWith('docs/')) return '기획 및 구현 문서입니다.'
  if (normalized.startsWith('scripts/')) return '자동화 실행 스크립트입니다.'

  if (ext === '.md') return 'Markdown 문서 파일입니다.'
  if (ext === '.json' || ext === '.jsonc') return 'JSON 설정 파일입니다.'
  if (ext === '.yaml' || ext === '.yml') return 'YAML 설정 파일입니다.'
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts') return 'TypeScript 소스 파일입니다.'
  if (ext === '.css') return 'CSS 스타일시트입니다.'
  if (ext === '.ico' || ext === '.svg' || ext === '.html') return '정적 UI 자산입니다.'

  return '프로젝트 파일입니다.'
}
