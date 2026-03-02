export interface Session {
  session_id: string
  session_token_hash: string
  uid: string
  created_at: string
  last_seen_at: string
  expires_at: string
  revoked_at: string | null
}

export class SessionsRepo {
  constructor(private db: D1Database) {}

  async create(params: {
    sessionId: string
    sessionTokenHash: string
    uid: string
    expiresAt: string
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO sessions (session_id, session_token_hash, uid, expires_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(params.sessionId, params.sessionTokenHash, params.uid, params.expiresAt)
      .run()
  }

  async getByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.db
      .prepare('SELECT * FROM sessions WHERE session_token_hash = ?')
      .bind(tokenHash)
      .first<Session>()
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sessions
         SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE session_id = ?`,
      )
      .bind(sessionId)
      .run()
  }

  async revokeByUid(uid: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sessions
         SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE uid = ? AND revoked_at IS NULL`,
      )
      .bind(uid)
      .run()
  }

  async touch(sessionId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sessions
         SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE session_id = ?`,
      )
      .bind(sessionId)
      .run()
  }
}
