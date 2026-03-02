import { Hono } from 'hono'
import { cors } from 'hono/cors'

import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@aso-copilot/shared'

import { scoreCopy } from '@aso-copilot/scoring'

const app = new Hono()

/**
 * ✅ 1. 전역 CORS (라우트보다 반드시 위에 있어야 함)
 */
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
)

/**
 * ✅ 2. Preflight 대응
 */
app.options('*', (c) => {
  return c.body(null, 204)
})

/**
 * Health check
 */
app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'api',
  })
})

/**
 * Generate endpoint
 */
app.post('/generate', async (c) => {
  let body: unknown

  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { ok: false, error: 'Invalid JSON' },
      400
    )
  }

  const parsed = GenerateRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      { ok: false, error: parsed.error.flatten() },
      400
    )
  }

  const request: GenerateRequest = parsed.data
  const scoring = scoreCopy(parsed.data)

  const response: GenerateResponse = {
    variants: {
      A: [`${request.appName} A1`, `${request.appName} A2`],
      B: [`${request.category} B1`, `${request.category} B2`],
      C: ['C1', 'C2'],
    },
    score: scoring.score,
    breakdown: scoring.breakdown,
    recommendation: scoring.recommendation,
  }

  // 응답 스키마 검증
  GenerateResponseSchema.parse(response)

  return c.json(response)
})

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json(
    { ok: false, error: 'Not Found' },
    404
  )
})

export default app