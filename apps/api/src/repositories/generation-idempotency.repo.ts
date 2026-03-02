export interface GenerationIdempotency {
  uid: string
  idempotency_key: string
  status: 'started' | 'succeeded' | 'failed'
  created_at: string
  updated_at: string
}

export class GenerationIdempotencyRepo {
  constructor(private db: D1Database) {}

  async get(uid: string, idempotencyKey: string): Promise<GenerationIdempotency | null> {
    return this.db
      .prepare(
        `SELECT * FROM generation_idempotency WHERE uid = ? AND idempotency_key = ?`,
      )
      .bind(uid, idempotencyKey)
      .first<GenerationIdempotency>()
  }

  /**
   * Insert a new 'started' record.
   * Returns true when inserted (first time), false when (uid, idempotencyKey) already exists.
   */
  async insert(uid: string, idempotencyKey: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `INSERT OR IGNORE INTO generation_idempotency (uid, idempotency_key, status)
         VALUES (?, ?, 'started')`,
      )
      .bind(uid, idempotencyKey)
      .run()
    return result.meta.changes > 0
  }

  async updateStatus(
    uid: string,
    idempotencyKey: string,
    status: 'succeeded' | 'failed',
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE generation_idempotency
         SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE uid = ? AND idempotency_key = ?`,
      )
      .bind(status, uid, idempotencyKey)
      .run()
  }
}
