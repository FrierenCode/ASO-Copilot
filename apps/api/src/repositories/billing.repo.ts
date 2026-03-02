export class BillingRepo {
  constructor(private db: D1Database) {}

  async getUidByCustomerId(polarCustomerId: string): Promise<string | null> {
    const row = await this.db
      .prepare(`SELECT uid FROM billing_customers WHERE polar_customer_id = ?`)
      .bind(polarCustomerId)
      .first<{ uid: string }>()
    return row?.uid ?? null
  }

  async upsertCustomer(polarCustomerId: string, uid: string, email: string | null): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `INSERT INTO billing_customers (polar_customer_id, uid, email, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(polar_customer_id) DO UPDATE SET
           uid        = excluded.uid,
           email      = COALESCE(excluded.email, billing_customers.email),
           updated_at = excluded.updated_at`,
      )
      .bind(polarCustomerId, uid, email, now)
      .run()
  }

  async upsertSubscription(
    polarSubscriptionId: string,
    polarCustomerId: string,
    uid: string,
    planCode: string,
    status: string,
    cancelAtPeriodEnd: boolean,
    currentPeriodStart: string | null,
    currentPeriodEnd: string | null,
    sourceUpdatedAt: string,
    rawJson: string,
  ): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `INSERT INTO billing_subscriptions
           (polar_subscription_id, polar_customer_id, uid, plan_code, status,
            cancel_at_period_end, current_period_start, current_period_end,
            source_updated_at, raw_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(polar_subscription_id) DO UPDATE SET
           plan_code            = excluded.plan_code,
           status               = excluded.status,
           cancel_at_period_end = excluded.cancel_at_period_end,
           current_period_start = excluded.current_period_start,
           current_period_end   = excluded.current_period_end,
           source_updated_at    = excluded.source_updated_at,
           raw_json             = excluded.raw_json,
           updated_at           = excluded.updated_at`,
      )
      .bind(
        polarSubscriptionId,
        polarCustomerId,
        uid,
        planCode,
        status,
        cancelAtPeriodEnd ? 1 : 0,
        currentPeriodStart,
        currentPeriodEnd,
        sourceUpdatedAt,
        rawJson,
        now,
      )
      .run()
  }

  async getPlanCodeForProduct(polarProductId: string): Promise<string | null> {
    const row = await this.db
      .prepare(`SELECT plan_code FROM polar_product_plan_map WHERE polar_product_id = ?`)
      .bind(polarProductId)
      .first<{ plan_code: string }>()
    return row?.plan_code ?? null
  }
}
