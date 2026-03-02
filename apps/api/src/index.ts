import { Hono } from 'hono'
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@aso-copilot/shared'
import { scoreCopy } from '@aso-copilot/scoring'

const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type')
})

app.options('*', (c) => {
  return c.body(null, 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
})

// Health check
app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'api',
  })
})

// Generate endpoint
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

  GenerateResponseSchema.parse(response)

  return c.json(response)
})

// 404 handler
app.notFound((c) => {
  return c.json(
    { ok: false, error: 'Not Found' },
    404
  )
})

export default app
