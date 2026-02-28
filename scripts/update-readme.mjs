#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readmePath = path.join(repoRoot, 'README.md')
const metaPath = path.join(repoRoot, 'README.meta.json')

const args = process.argv.slice(2)
const mode = getArgValue(args, '--mode') || 'manual'
const checkOnly = args.includes('--check')

const existingReadme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : ''
const metadata = loadMetadata()
const trackedFiles = listProjectFiles()
const autoSyncFilesText = resolveAutoSyncFileList(existingReadme)
const nextReadme = renderReadme({
  meta: metadata,
  trackedFiles,
  existingReadme,
  autoSyncFilesText,
  mode,
})
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
  fs.writeFileSync(readmePath, nextReadme, 'utf8')
  process.stdout.write('README.md를 업데이트했습니다.\n')
} else {
  process.stdout.write('README.md가 이미 최신 상태입니다.\n')
}

function getArgValue(inputArgs, key) {
  const index = inputArgs.indexOf(key)
  if (index === -1 || index === inputArgs.length - 1) {
    return ''
  }
  return inputArgs[index + 1]
}

function loadMetadata() {
  const fallback = {
    projectName: 'ASO Copilot',
    tagline: 'commit/push 전에 README를 자동 갱신하는 워크스페이스 문서입니다.',
    liveUrl: '',
    serviceDescription:
      'ASO Copilot은 앱 카피 생성 입력을 검증하고, 카피 품질을 점수화하며, 반복적인 App Store Optimization 워크플로우를 위한 API/웹 연동 지점을 제공하는 워크스페이스입니다.',
    features: [
      {
        name: '스키마 검증',
        description: '공유 Zod 스키마로 요청/응답 계약을 검증해 API 동작을 안정적으로 유지합니다.',
      },
      {
        name: '카피 스코어링 엔진',
        description: '키워드, 명확성, 수치 신호, 카테고리 정합성 점수로 실행 가능한 추천을 제공합니다.',
      },
      {
        name: '생성 API',
        description: 'Cloudflare Worker + Hono 엔드포인트가 생성 입력을 처리하고 결과를 반환합니다.',
      },
      {
        name: '웹 프론트엔드',
        description: 'Next.js 프론트엔드가 향후 생성/스코어링 UI 플로우를 위한 연동 화면을 제공합니다.',
      },
    ],
    commitRules: [
      '커밋/푸시 전에 `scripts/update-readme.mjs`로 README를 최신 상태로 동기화합니다.',
      '`pre-commit` 훅에서 README를 갱신하고 자동으로 스테이징합니다.',
      '`pre-push` 훅에서 README 변경 여부를 점검하고, 변경 시 푸시를 중단합니다.',
      '자동 동기화 블록(`README:AUTO-START/END`)은 스크립트가 직접 관리합니다.',
    ],
  }

  if (!fs.existsSync(metaPath)) {
    return fallback
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (!parsed || typeof parsed !== 'object') {
      return fallback
    }

    const projectName = asString(parsed.projectName) || fallback.projectName
    const tagline = asString(parsed.tagline) || fallback.tagline
    const liveUrl = asString(parsed.liveUrl) || fallback.liveUrl
    const serviceDescription = asString(parsed.serviceDescription) || fallback.serviceDescription
    const features = parseFeatureList(parsed.features, fallback.features)
    const commitRules = parseStringList(parsed.commitRules, fallback.commitRules)

    return {
      projectName,
      tagline,
      liveUrl,
      serviceDescription,
      features,
      commitRules,
    }
  } catch {
    return fallback
  }
}

function parseFeatureList(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const parsed = value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      name: asString(item.name),
      description: asString(item.description),
    }))
    .filter((item) => item.name && item.description)

  return parsed.length > 0 ? parsed : fallback
}

function parseStringList(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const parsed = value.map((item) => asString(item)).filter(Boolean)
  return parsed.length > 0 ? parsed : fallback
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

function resolveAutoSyncFileList(existingReadmeText) {
  const staged = getStagedChanges()
  if (staged.length > 0) {
    return formatChangedFiles(staged)
  }

  const preserved = extractAutoSyncFileList(existingReadmeText)
  if (preserved) {
    return preserved
  }

  return '변경 파일 없음'
}

function getStagedChanges() {
  try {
    const raw = execSync('git -c safe.directory=* diff --cached --name-status -- .', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    if (!raw) {
      return []
    }

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [status = '', ...rest] = line.split(/\s+/)
        const filePath = rest.join(' ').replace(/\\/g, '/')
        return {
          status: status || 'M',
          filePath,
        }
      })
      .filter((entry) => entry.filePath)
  } catch {
    return []
  }
}

function formatChangedFiles(entries) {
  return entries.map((entry) => `${entry.status}\n${entry.filePath}`).join('\n')
}

function extractAutoSyncFileList(readmeText) {
  if (!readmeText.includes('<!-- README:AUTO-START -->')) {
    return ''
  }

  const match = readmeText.match(
    /<!-- README:AUTO-START -->[\s\S]*?```text\s*\n([\s\S]*?)\n```[\s\S]*?<!-- README:AUTO-END -->/
  )
  if (!match) {
    return ''
  }

  return match[1].trim()
}

function renderReadme({ meta, trackedFiles, existingReadme: existingReadmeText, autoSyncFilesText, mode: runMode }) {
  const liveLine = meta.liveUrl ? `**Live**: [${meta.liveUrl}](${meta.liveUrl})\n\n` : ''
  const featureBlocks = meta.features
    .map(
      (feature, index) =>
        `### ${index + 1}. ${feature.name}\n- ${feature.description}`
    )
    .join('\n\n')
  const commitRules = meta.commitRules.map((rule) => `- ${rule}`).join('\n')
  const projectStructure = renderProjectTree(trackedFiles)
  const autoSyncBlock = renderAutoSyncBlock(autoSyncFilesText)
  const updatesSection = buildUpdatesSection(existingReadmeText, autoSyncBlock, runMode)

  return `# ${meta.projectName}

> ${meta.tagline}

${liveLine}---

## 서비스 개요

${meta.serviceDescription}

---

## 주요 기능

${featureBlocks}

---

## 프로젝트 구조

\`\`\`text
${projectStructure}
\`\`\`

---

## 커밋/푸시 운영 규칙

${commitRules}

---

${updatesSection}
`
}

function renderProjectTree(filePaths) {
  if (filePaths.length === 0) {
    return '(추적된 파일 없음)'
  }

  const tree = createNode()
  for (const filePath of filePaths) {
    insertPath(tree, filePath.split('/'))
  }

  const lines = renderTreeNode(tree, 0, true)
  return lines.join('\n')
}

function createNode() {
  return {
    files: [],
    directories: new Map(),
  }
}

function insertPath(node, parts) {
  if (parts.length === 0) {
    return
  }

  if (parts.length === 1) {
    node.files.push(parts[0])
    return
  }

  const [directory, ...rest] = parts
  if (!node.directories.has(directory)) {
    node.directories.set(directory, createNode())
  }
  insertPath(node.directories.get(directory), rest)
}

function renderTreeNode(node, depth, isRoot) {
  const indent = ' '.repeat(depth * 3)
  const lines = []
  const fileNames = [...node.files].sort((a, b) => a.localeCompare(b))
  const dirNames = sortDirectoryNames([...node.directories.keys()], isRoot)

  for (const fileName of fileNames) {
    lines.push(`${indent}${fileName}`)
  }

  for (const directoryName of dirNames) {
    lines.push(`${indent}${directoryName}`)
    const child = node.directories.get(directoryName)
    lines.push(...renderTreeNode(child, depth + 1, false))
  }

  return lines
}

function sortDirectoryNames(names, isRoot) {
  if (!isRoot) {
    return names.sort((a, b) => a.localeCompare(b))
  }

  const preferredOrder = [
    'apps',
    'packages',
    'scripts',
    'docs',
    'docs_result',
    '.githooks',
    '.vscode',
  ]

  return names.sort((a, b) => {
    const indexA = preferredOrder.indexOf(a)
    const indexB = preferredOrder.indexOf(b)

    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    }

    return a.localeCompare(b)
  })
}

function renderAutoSyncBlock(filesText) {
  return `<!-- README:AUTO-START -->
### 자동 동기화

#### 변경 파일(커밋 스테이징 기준)
\`\`\`text
${filesText}
\`\`\`

<!-- README:AUTO-END -->`
}

function buildUpdatesSection(existingReadmeText, autoSyncBlock, runMode) {
  const existingSection = extractUpdatesSection(existingReadmeText)

  if (!existingSection) {
    return renderDefaultUpdatesSection(autoSyncBlock, runMode)
  }

  return ensureAutoSyncBlock(existingSection, autoSyncBlock)
}

function extractUpdatesSection(readmeText) {
  const anchor = '## 업데이트 기록'
  const start = readmeText.indexOf(anchor)
  if (start === -1) {
    return ''
  }
  return readmeText.slice(start).trim()
}

function renderDefaultUpdatesSection(autoSyncBlock, runMode) {
  const today = new Date().toISOString().slice(0, 10)
  const title = runMode === 'pre-push' ? 'README 자동 점검' : 'README 자동화 양식 정비'

  return `## 업데이트 기록

<details>
<summary><strong>${today}</strong> - ${title}</summary>

**요약**
- README 자동화 출력 양식을 예시 기반 섹션형 템플릿으로 정리했습니다.
- 자동 동기화 블록(\`README:AUTO-START/END\`)을 스크립트가 직접 갱신하도록 구성했습니다.

${autoSyncBlock}

</details>`
}

function ensureAutoSyncBlock(updateSection, autoSyncBlock) {
  if (updateSection.includes('<!-- README:AUTO-START -->')) {
    return updateSection.replace(
      /<!-- README:AUTO-START -->[\s\S]*?<!-- README:AUTO-END -->/,
      autoSyncBlock
    )
  }

  if (updateSection.includes('</details>')) {
    return updateSection.replace('</details>', `${autoSyncBlock}\n\n</details>`)
  }

  return `${updateSection.trimEnd()}\n\n${autoSyncBlock}`
}
