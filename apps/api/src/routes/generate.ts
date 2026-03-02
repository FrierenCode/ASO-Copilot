import { Hono } from 'hono'
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateRequest, type GenerateResponse } from '@aso-copilot/shared'
import { scoreCopy } from '@aso-copilot/scoring'
import type { AppEnv } from '../env'
import { checkAndGate } from '../services/usage-gate.service'

const generateRouter = new Hono<AppEnv>()

generateRouter.post('/generate', async (c) => {
  const uid = c.get('uid')
  const requestId = c.get('requestId')

  // --- Parse body ---
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  const parsed = GenerateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: parsed.error.flatten() }, 400)
  }

  // --- Usage gate ---
  const gate = await checkAndGate(c.env.DB, uid, requestId)

  if (!gate.ok) {
    if (gate.reason === 'duplicate') {
      return c.json(
        { ok: false, error: 'DUPLICATE_REQUEST', message: 'Duplicate request id detected.' },
        409,
      )
    }
    // limit_exceeded
    return c.json(
      {
        ok: false,
        error: 'LIMIT_EXCEEDED',
        message:
          'Monthly generation limit reached. Upgrade to Pro for unlimited generations.',
        upgrade_url: '/pricing',
      },
      429,
    )
  }

  // --- Generation ---
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

export default generateRouter
