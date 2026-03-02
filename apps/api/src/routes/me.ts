import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { UserAuthProfilesRepo } from '../repositories/user-auth-profiles.repo'
import { EntitlementsRepo } from '../repositories/entitlements.repo'
import { UsageRepo } from '../repositories/usage.repo'
import { getCurrentPeriod } from '../services/entitlement.service'

const meRouter = new Hono<AppEnv>()

// GET /api/me
meRouter.get('/api/me', async (c) => {
  const sessionUid = c.get('sessionUid')
  const uidCookie = c.get('uid')
  const isAuthenticated = c.get('isAuthenticated')
  const effectiveUid = sessionUid ?? uidCookie

  const profilesRepo = new UserAuthProfilesRepo(c.env.DB)
  const entRepo = new EntitlementsRepo(c.env.DB)
  const usageRepo = new UsageRepo(c.env.DB)

  const [profile, ent] = await Promise.all([
    profilesRepo.get(effectiveUid),
    entRepo.get(effectiveUid),
  ])

  const userType = profile?.user_type ?? 'anonymous'
  const planCode = ent?.plan_code === 'pro' && ent.status === 'active' ? 'pro' : userType === 'member' ? 'free' : 'anonymous'

  let usagePayload: {
    policy: string
    limit: number | null
    used: number
    remaining: number | null
    reset_at: string | null
  }

  if (planCode === 'pro') {
    usagePayload = { policy: 'unlimited', limit: null, used: 0, remaining: null, reset_at: null }
  } else if (planCode === 'anonymous') {
    const lifetime = await usageRepo.getLifetime(effectiveUid)
    const used = lifetime?.used_count ?? 0
    const limit = 2
    usagePayload = {
      policy: 'lifetime',
      limit,
      used,
      remaining: Math.max(0, limit - used),
      reset_at: null,
    }
  } else {
    // free / member monthly
    const { periodStart, periodEnd } = getCurrentPeriod()
    const monthly = await usageRepo.getMonthly(effectiveUid, periodStart)
    const used = monthly?.used_count ?? 0
    const limit = 5
    usagePayload = {
      policy: 'monthly',
      limit,
      used,
      remaining: Math.max(0, limit - used),
      reset_at: periodEnd,
    }
  }

  return c.json(
    {
      uid: effectiveUid,
      authenticated: isAuthenticated,
      email: profile?.email ?? null,
      plan: planCode,
      usage: usagePayload,
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

export default meRouter
