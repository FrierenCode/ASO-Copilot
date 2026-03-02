import { GenerationRepo } from '../repositories/generation.repo'
import { UsageRepo } from '../repositories/usage.repo'
import { getOrCreateEntitlement, getCurrentPeriod } from './entitlement.service'

export type GateResult =
  | { ok: true; planCode: string }
  | { ok: false; reason: 'duplicate' | 'limit_exceeded' }

/**
 * Check quota and record the generation request atomically.
 *
 * - Returns ok:true when the request is allowed to proceed.
 * - Returns ok:false with reason='duplicate' if (uid, requestId) was already seen.
 * - Returns ok:false with reason='limit_exceeded' when the monthly quota is full.
 *
 * Pro users skip the counter entirely (counted=0).
 */
export async function checkAndGate(
  db: D1Database,
  uid: string,
  requestId: string,
): Promise<GateResult> {
  const genRepo = new GenerationRepo(db)
  const { periodStart } = getCurrentPeriod()

  // 1. Idempotency: reject duplicate request_id for this user
  const existing = await genRepo.get(uid, requestId)
  if (existing) {
    return { ok: false, reason: 'duplicate' }
  }

  // 2. Fetch entitlement (creates free default if absent)
  const ent = await getOrCreateEntitlement(db, uid)
  const planCode = ent.plan_code
  const limit = ent.usage_limit_monthly

  // 3. Pro (or any plan with no limit) – skip counter
  if (limit === null) {
    await genRepo.insert(uid, requestId, periodStart, planCode, 'allowed', 0)
    return { ok: true, planCode }
  }

  // 4. Free – atomic increment within limit
  const usageRepo = new UsageRepo(db)
  const incremented = await usageRepo.incrementIfBelowLimit(uid, periodStart, limit)

  if (!incremented) {
    await genRepo.insert(uid, requestId, periodStart, planCode, 'rejected_limit', 0)
    return { ok: false, reason: 'limit_exceeded' }
  }

  await genRepo.insert(uid, requestId, periodStart, planCode, 'allowed', 1)
  return { ok: true, planCode }
}
