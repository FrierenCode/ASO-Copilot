import { GenerationIdempotencyRepo } from '../repositories/generation-idempotency.repo'
import { UsageRepo } from '../repositories/usage.repo'
import { UserAuthProfilesRepo } from '../repositories/user-auth-profiles.repo'
import { EntitlementsRepo } from '../repositories/entitlements.repo'
import { getCurrentPeriod } from './entitlement.service'

const V2_ANON_LIFETIME_LIMIT = 2
const V2_MEMBER_MONTHLY_LIMIT = 5

export type UserPlan = 'anonymous' | 'free' | 'pro'

export type GateV2StartResult =
  | { ok: true; userPlan: UserPlan }
  | { ok: false; reason: 'duplicate' | 'limit_exceeded'; userPlan: UserPlan }

export async function startGateV2(
  db: D1Database,
  uid: string,
  idempotencyKey: string,
  isAuthenticated: boolean,
): Promise<GateV2StartResult> {
  const idempotencyRepo = new GenerationIdempotencyRepo(db)

  // 1️⃣ idempotency 선점
  const inserted = await idempotencyRepo.insert(uid, idempotencyKey)
  if (!inserted) {
    const userPlan = await resolveUserPlan(db, uid, isAuthenticated)
    return { ok: false, reason: 'duplicate', userPlan }
  }

  // 2️⃣ 플랜 결정
  const userPlan = await resolveUserPlan(db, uid, isAuthenticated)

  // 3️⃣ Pro → 무제한
  if (userPlan === 'pro') {
    return { ok: true, userPlan }
  }

  // 4️⃣ 슬롯 존재 여부만 체크 (차감하지 않음)
  const usageRepo = new UsageRepo(db)
  const { periodStart } = getCurrentPeriod()

  if (userPlan === 'anonymous') {
    const current = await usageRepo.getLifetime(uid)
    const used = current?.used_count ?? 0
    if (used >= V2_ANON_LIFETIME_LIMIT) {
      return { ok: false, reason: 'limit_exceeded', userPlan }
    }
  } else {
    const current = await usageRepo.getMonthly(uid, periodStart)
    const used = current?.used_count ?? 0
    if (used >= V2_MEMBER_MONTHLY_LIMIT) {
      return { ok: false, reason: 'limit_exceeded', userPlan }
    }
  }

  return { ok: true, userPlan }
}

export async function commitQuotaV2(
  db: D1Database,
  uid: string,
  userPlan: UserPlan,
): Promise<boolean> {
  if (userPlan === 'pro') return true

  const usageRepo = new UsageRepo(db)
  const { periodStart } = getCurrentPeriod()

  if (userPlan === 'anonymous') {
    return usageRepo.incrementLifetimeIfBelowLimit(uid, V2_ANON_LIFETIME_LIMIT)
  }

  return usageRepo.incrementIfBelowLimit(uid, periodStart, V2_MEMBER_MONTHLY_LIMIT)
}

export async function markSucceeded(
  db: D1Database,
  uid: string,
  idempotencyKey: string,
) {
  const repo = new GenerationIdempotencyRepo(db)
  await repo.updateStatus(uid, idempotencyKey, 'succeeded')
}

export async function markFailed(
  db: D1Database,
  uid: string,
  idempotencyKey: string,
) {
  const repo = new GenerationIdempotencyRepo(db)
  await repo.updateStatus(uid, idempotencyKey, 'failed')
}

async function resolveUserPlan(
  db: D1Database,
  uid: string,
  isAuthenticated: boolean,
): Promise<UserPlan> {
  const entRepo = new EntitlementsRepo(db)
  const ent = await entRepo.get(uid)
  if (ent?.plan_code === 'pro' && ent.status === 'active') {
    return 'pro'
  }

  if (isAuthenticated) {
    const profilesRepo = new UserAuthProfilesRepo(db)
    const profile = await profilesRepo.get(uid)
    if (profile?.user_type === 'member') return 'free'
  }

  return 'anonymous'
}