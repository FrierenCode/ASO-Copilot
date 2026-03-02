export interface GenerationRequest {
  uid: string
  request_id: string
  period_start: string
  plan_code: string
  decision: 'allowed' | 'rejected_limit' | 'failed'
  counted: 0 | 1
  created_at: string
}

export class GenerationRepo {
  constructor(private db: D1Database) {}

  async get(uid: string, requestId: string): Promise<GenerationRequest | null> {
    return this.db
      .prepare(`SELECT * FROM generation_requests WHERE uid = ? AND request_id = ?`)
      .bind(uid, requestId)
      .first<GenerationRequest>()
  }

  async insert(
    uid: string,
    requestId: string,
    periodStart: string,
    planCode: string,
    decision: 'allowed' | 'rejected_limit' | 'failed',
    counted: 0 | 1,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO generation_requests
           (uid, request_id, period_start, plan_code, decision, counted)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(uid, requestId, periodStart, planCode, decision, counted)
      .run()
  }
}
