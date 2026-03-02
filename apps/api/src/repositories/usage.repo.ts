export interface UsageMonthly {
  uid: string
  period_start: string
  used_count: number
  updated_at: string
}

export interface UsageLifetime {
  uid: string
  used_count: number
  updated_at: string
}

export class UsageRepo {
  constructor(private db: D1Database) {}

  async getMonthly(uid: string, periodStart: string): Promise<UsageMonthly | null> {
    return this.db
      .prepare(`SELECT * FROM usage_monthly WHERE uid = ? AND period_start = ?`)
      .bind(uid, periodStart)
      .first<UsageMonthly>()
  }

  /**
   * Atomically increment the counter only when used_count < limit.
   * Returns true when the increment succeeded (slot was available).
   */
  async incrementIfBelowLimit(uid: string, periodStart: string, limit: number): Promise<boolean> {
    // Ensure the row exists with 0 before trying to increment
    await this.db
      .prepare(
        `INSERT INTO usage_monthly (uid, period_start, used_count, updated_at)
         VALUES (?, ?, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(uid, period_start) DO NOTHING`,
      )
      .bind(uid, periodStart)
      .run()

    const result = await this.db
      .prepare(
        `UPDATE usage_monthly
         SET used_count = used_count + 1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE uid = ? AND period_start = ? AND used_count < ?`,
      )
      .bind(uid, periodStart, limit)
      .run()

    return result.meta.changes > 0
  }

  async getOrCreate(uid: string, periodStart: string): Promise<UsageMonthly> {
    await this.db
      .prepare(
        `INSERT INTO usage_monthly (uid, period_start, used_count, updated_at)
         VALUES (?, ?, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(uid, period_start) DO NOTHING`,
      )
      .bind(uid, periodStart)
      .run()
    return (await this.getMonthly(uid, periodStart))!
  }

  // ---------------------------------------------------------------------------
  // Lifetime usage (v2 anonymous policy)
  // ---------------------------------------------------------------------------

  async getLifetime(uid: string): Promise<UsageLifetime | null> {
    return this.db
      .prepare('SELECT * FROM usage_lifetime WHERE uid = ?')
      .bind(uid)
      .first<UsageLifetime>()
  }

  /**
   * Atomically increment the lifetime counter only when used_count < limit.
   * Returns true when the increment succeeded (slot was available).
   */
  async incrementLifetimeIfBelowLimit(uid: string, limit: number): Promise<boolean> {
    await this.db
      .prepare(
        `INSERT INTO usage_lifetime (uid, used_count, updated_at)
         VALUES (?, 0, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(uid) DO NOTHING`,
      )
      .bind(uid)
      .run()

    const result = await this.db
      .prepare(
        `UPDATE usage_lifetime
         SET used_count = used_count + 1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE uid = ? AND used_count < ?`,
      )
      .bind(uid, limit)
      .run()

    return result.meta.changes > 0
  }
}
