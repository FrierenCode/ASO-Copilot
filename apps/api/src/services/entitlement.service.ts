import { EntitlementsRepo, type UserEntitlement } from '../repositories/entitlements.repo'
import { UsageRepo } from '../repositories/usage.repo'

export interface EntitlementResponse {
  uid: string
  plan: string
  status: string
  limits: {
    monthlyGenerations: number | null
    usedThisMonth: number
    remainingThisMonth: number | null
    periodStart: string
    periodEnd: string
  }
  source: {
    type: string
    ref: string | null
    version: number
    updatedAt: string
  }
}

export function getCurrentPeriod(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0-based

  const periodStart = `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00Z`

  const nextY = m === 11 ? y + 1 : y
  const nextM = m === 11 ? 1 : m + 2
  const periodEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00Z`

  return { periodStart, periodEnd }
}

export async function getOrCreateEntitlement(
  db: D1Database,
  uid: string,
): Promise<UserEntitlement> {
  const entRepo = new EntitlementsRepo(db)
  let ent = await entRepo.get(uid)
  if (!ent) {
    await entRepo.insertFreeDefault(uid)
    ent = (await entRepo.get(uid))!
  }
  return ent
}

export async function getEntitlements(
  db: D1Database,
  uid: string,
): Promise<EntitlementResponse> {
  const ent = await getOrCreateEntitlement(db, uid)
  const { periodStart, periodEnd } = getCurrentPeriod()

  let usedThisMonth = 0
  let remainingThisMonth: number | null = null
  const monthlyGenerations = ent.usage_limit_monthly

  if (monthlyGenerations !== null) {
    const usageRepo = new UsageRepo(db)
    const usage = await usageRepo.getMonthly(uid, periodStart)
    usedThisMonth = usage?.used_count ?? 0
    remainingThisMonth = Math.max(0, monthlyGenerations - usedThisMonth)
  }

  return {
    uid,
    plan: ent.plan_code,
    status: ent.status,
    limits: {
      monthlyGenerations,
      usedThisMonth,
      remainingThisMonth,
      periodStart,
      periodEnd,
    },
    source: {
      type: ent.source_type,
      ref: ent.source_ref,
      version: ent.version,
      updatedAt: ent.updated_at,
    },
  }
}
