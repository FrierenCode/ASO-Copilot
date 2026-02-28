import type { GenerateRequest } from '@aso-copilot/shared'

export interface ScoreBreakdown {
  cta: number
  benefit: number
  clarity: number
  numeric: number
  emotion: number
  category: number
}

export interface ScoreCopyResult {
  score: number
  breakdown: ScoreBreakdown
  recommendation: string[]
}

const CTA_KEYWORDS = ['download', 'get', 'start', 'try', 'now', 'free', 'join', 'unlock']
const BENEFIT_KEYWORDS = ['save', 'easy', 'fast', 'improve', 'boost', 'productivity', 'growth']
const EMOTION_KEYWORDS = ['amazing', 'love', 'powerful', 'effortless', 'confident']

const CATEGORY_MAP: Record<string, string[]> = {
  productivity: ['productivity', 'focus', 'task', 'plan', 'organize', 'workflow', 'efficiency'],
  finance: ['budget', 'finance', 'money', 'expense', 'invest', 'saving', 'portfolio'],
  health: ['health', 'fitness', 'workout', 'wellness', 'sleep', 'calorie', 'habit'],
  education: ['learn', 'study', 'course', 'lesson', 'quiz', 'practice', 'education'],
  gaming: ['game', 'level', 'battle', 'quest', 'multiplayer', 'score', 'leaderboard'],
  lifestyle: ['lifestyle', 'routine', 'daily', 'habit', 'self-care', 'balance', 'home'],
  travel: ['travel', 'trip', 'itinerary', 'flight', 'hotel', 'booking', 'destination'],
  business: ['business', 'sales', 'crm', 'lead', 'pipeline', 'team', 'revenue'],
  utility: ['tool', 'utility', 'quick', 'simple', 'manage', 'organize', 'optimize'],
  utilities: ['tool', 'utility', 'quick', 'simple', 'manage', 'organize', 'optimize'],
}

const IMAGE_FILE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif|tiff?|avif)$/i
const GENERIC_FILENAME_PATTERN = /^(?:img|image|screenshot|screen|shot|capture|photo|pic|ss)?[_-]?[a-z]*\d+[a-z0-9_-]*$/i
const NUMERIC_PATTERN = /\b\d+(?:[.,]\d+)?(?:\s?(?:%|x|k|m|b|days?|hrs?|hours?|mins?|minutes?|sec|seconds?|users?|downloads?|stars?|rating))?\b/gi
const WORD_PATTERN = /[a-z0-9]+/g

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function countKeywords(corpus: string, keywords: string[]): number {
  return keywords.reduce((count, kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi')
    return count + (corpus.match(regex)?.length ?? 0)
  }, 0)
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function extractWords(corpus: string): string[] {
  return corpus.match(WORD_PATTERN) ?? []
}

function isLikelyScreenshotFilename(value: string): boolean {
  const normalized = normalizeText(value)

  if (!normalized) {
    return false
  }
  if (/[\\/]/.test(normalized)) {
    return true
  }
  if (IMAGE_FILE_EXTENSION_PATTERN.test(normalized)) {
    return true
  }

  return GENERIC_FILENAME_PATTERN.test(normalized)
}

function buildCorpus(input: GenerateRequest, excludeFilenameScreenshots = false): string {
  const screenshots = excludeFilenameScreenshots
    ? input.screenshots.filter((value) => !isLikelyScreenshotFilename(value))
    : input.screenshots

  return [input.appName, input.category, screenshots.join(' ')]
    .join(' ')
    .toLowerCase()
}

function computeClarity(corpus: string): number {
  const words = corpus.trim().split(/\s+/).filter(Boolean)
  let clarity = 10

  if (words.length >= 8 && words.length <= 40) {
    clarity += 6
  } else if (words.length >= 5 && words.length <= 60) {
    clarity += 3
  } else if (words.length < 5) {
    clarity -= 4
  } else {
    clarity -= 5
  }

  const punctuationCount = (corpus.match(/[!?]/g) ?? []).length
  if (punctuationCount === 0) {
    clarity += 2
  } else if (punctuationCount <= 2) {
    clarity += 1
  } else {
    clarity -= (punctuationCount - 2) * 2
  }

  if (/[!?]{2,}/.test(corpus)) {
    clarity -= 2
  }

  const avgWordLength =
    words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0

  if (avgWordLength >= 4 && avgWordLength <= 9) {
    clarity += 2
  }

  if (words.some((word) => word.length > 24)) {
    clarity -= 2
  }

  return clamp(clarity, 0, 20)
}

function computeWeightedScore(breakdown: ScoreBreakdown): number {
  const weightedScore =
    (breakdown.cta / 20) * 20 +
    (breakdown.benefit / 20) * 20 +
    (breakdown.clarity / 20) * 15 +
    (breakdown.numeric / 20) * 10 +
    (breakdown.emotion / 20) * 10 +
    (breakdown.category / 25) * 25

  return Math.round(clamp(weightedScore, 0, 100))
}

export function scoreCopy(input: GenerateRequest): ScoreCopyResult {
  const corpus = buildCorpus(input)
  const numericCorpus = buildCorpus(input, true)
  const words = extractWords(corpus)
  const totalWordCount = Math.max(words.length, 1)

  // CTA: count CTA keywords, each contributes 5 points
  const ctaCount = countKeywords(corpus, CTA_KEYWORDS)
  const cta = clamp(ctaCount * 5, 0, 20)

  // Benefit (v2.2): ratio-based score
  const benefitWordCount = countKeywords(corpus, BENEFIT_KEYWORDS)
  const benefitRatio = benefitWordCount / totalWordCount
  const benefit = clamp(Math.round(benefitRatio * 60), 0, 20)

  // Clarity: base 10 with length/punctuation/readability adjustments
  const clarity = computeClarity(corpus)

  // Numeric: detect stat-like numeric signals after removing filename-like screenshot noise
  const numericMatches = numericCorpus.match(NUMERIC_PATTERN) ?? []
  const uniqueNumericSignals = new Set(
    numericMatches.map((match) => match.trim())
  ).size
  const numeric = clamp(uniqueNumericSignals * 5, 0, 20)

  // Emotion: count emotional words, each contributes 5 points
  const emotionCount = countKeywords(corpus, EMOTION_KEYWORDS)
  const emotion = clamp(emotionCount * 5, 0, 20)

  // Category Alignment (v2.2): ratio-based 0..25
  const categoryKeywords = CATEGORY_MAP[input.category.trim().toLowerCase()] ?? []
  const categoryMatchCount = categoryKeywords.length > 0
    ? countKeywords(corpus, categoryKeywords)
    : 0
  const alignmentRatio = categoryMatchCount / totalWordCount
  const category = clamp(Math.round(alignmentRatio * 100), 0, 25)

  const breakdown: ScoreBreakdown = { cta, benefit, clarity, numeric, emotion, category }
  const score = computeWeightedScore(breakdown)

  const recommendation: string[] = []
  if (cta < 12) recommendation.push('Add a clear CTA keyword (e.g. "Get", "Start", "Try free")')
  if (benefit < 12) recommendation.push('Highlight a user benefit (e.g. "Save time", "Boost productivity")')
  if (clarity < 12) recommendation.push('Simplify copy: keep message concise and avoid excessive punctuation')
  if (numeric < 12) recommendation.push('Add a numeric proof point (e.g. "10x faster", "50% off")')
  if (emotion < 12) recommendation.push('Use emotional language (e.g. "Powerful", "Effortless", "Confident")')
  if (category < 12) recommendation.push('Align copy with your target category keywords for stronger relevance')

  if (recommendation.length === 0) {
    recommendation.push('Great copy! Keep testing variations to maintain performance.')
  }

  return { score, breakdown, recommendation }
}
