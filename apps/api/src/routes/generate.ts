import { Hono } from 'hono'
import { GenerateRequestSchema, GenerateResponseSchema, type GenerateRequest, type GenerateResponse } from '@aso-copilot/shared'
import { scoreCopy } from '@aso-copilot/scoring'
import type { AppEnv } from '../env'
import {
  startGateV2,
  commitQuotaV2,
  markSucceeded,
  markFailed,
} from '../services/usage-gate.service'

const generateRouter = new Hono<AppEnv>()

generateRouter.post('/generate', async (c) => {
  const uid = c.get('uid')
  const requestId = c.get('requestId')
  const isV2 = c.env.USAGE_POLICY_V2_ENABLED === 'true'

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

  if (isV2) {
  const idempotencyKey = c.req.header('x-request-id')
  if (!idempotencyKey) {
    return c.json({ ok: false, error: 'MISSING_IDEMPOTENCY_KEY' }, 400)
  }

  const sessionUid = c.get('sessionUid')
  const isAuthenticated = c.get('isAuthenticated')
  const effectiveUid = sessionUid ?? uid

  const gate = await startGateV2(c.env.DB, effectiveUid, idempotencyKey, isAuthenticated)

  if (!gate.ok) {
    if (gate.reason === 'duplicate') {
      return c.json({ ok: false, error: 'DUPLICATE_REQUEST' }, 409)
    }
    return c.json(
      { ok: false, error: 'LIMIT_EXCEEDED', plan: gate.userPlan, upgrade_url: '/pricing' },
      429,
    )
  }

  try {
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

    // 🔥 성공 후 quota commit
    const committed = await commitQuotaV2(c.env.DB, effectiveUid, gate.userPlan)

    if (!committed) {
      await markFailed(c.env.DB, effectiveUid, idempotencyKey)
      return c.json(
        { ok: false, error: 'LIMIT_EXCEEDED', plan: gate.userPlan, upgrade_url: '/pricing' },
        429,
      )
    }

    await markSucceeded(c.env.DB, effectiveUid, idempotencyKey)

    return c.json(response)
  } catch (err) {
    await markFailed(c.env.DB, effectiveUid, idempotencyKey)
    throw err
  }
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
