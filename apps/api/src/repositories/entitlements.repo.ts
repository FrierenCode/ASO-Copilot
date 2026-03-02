export interface UserEntitlement {
  uid: string
  plan_code: string
  status: string
  source_type: string
  source_ref: string | null
  usage_limit_monthly: number | null
  effective_from: string
  effective_until: string | null
  version: number
  updated_at: string
}

export class EntitlementsRepo {
  constructor(private db: D1Database) {}

  async get(uid: string): Promise<UserEntitlement | null> {
    return this.db
      .prepare(`SELECT * FROM user_entitlements WHERE uid = ?`)
      .bind(uid)
      .first<UserEntitlement>()
  }

  /** Insert free-default row only if no entitlement exists yet */
  async insertFreeDefault(uid: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO user_entitlements
           (uid, plan_code, status, source_type, usage_limit_monthly, effective_from, version, updated_at)
         VALUES (?, 'free', 'active', 'free_default', 3, ?, 1, ?)`,
      )
      .bind(uid, now, now)
      .run()
  }

  /** Full upsert used by webhook handler to set pro or revert to free */
  async upsertFromSubscription(
    uid: string,
    planCode: string,
    sourceType: 'polar_subscription' | 'free_default',
    sourceRef: string | null,
    usageLimitMonthly: number | null,
  ): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `INSERT INTO user_entitlements
           (uid, plan_code, status, source_type, source_ref, usage_limit_monthly, effective_from, version, updated_at)
         VALUES (?, ?, 'active', ?, ?, ?, ?, 1, ?)
         ON CONFLICT(uid) DO UPDATE SET
           plan_code            = excluded.plan_code,
           status               = excluded.status,
           source_type          = excluded.source_type,
           source_ref           = excluded.source_ref,
           usage_limit_monthly  = excluded.usage_limit_monthly,
           version              = version + 1,
           updated_at           = excluded.updated_at`,
      )
      .bind(uid, planCode, sourceType, sourceRef, usageLimitMonthly, now, now)
      .run()
  }
}
