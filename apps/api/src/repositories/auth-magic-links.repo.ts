export interface AuthMagicLink {
  magic_link_id: string
  email_normalized: string
  token_hash: string
  requested_by_uid: string | null
  target_uid: string | null
  redirect_to: string | null
  expires_at: string
  used_at: string | null
  invalidated_at: string | null
  created_at: string
}

export class AuthMagicLinksRepo {
  constructor(private db: D1Database) {}

  async create(params: {
    magicLinkId: string
    emailNormalized: string
    tokenHash: string
    requestedByUid: string
    targetUid: string | null
    redirectTo: string | null
    expiresAt: string
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO auth_magic_links
           (magic_link_id, email_normalized, token_hash, requested_by_uid, target_uid, redirect_to, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        params.magicLinkId,
        params.emailNormalized,
        params.tokenHash,
        params.requestedByUid,
        params.targetUid,
        params.redirectTo,
        params.expiresAt,
      )
      .run()
  }

  async getByTokenHash(tokenHash: string): Promise<AuthMagicLink | null> {
    return this.db
      .prepare('SELECT * FROM auth_magic_links WHERE token_hash = ?')
      .bind(tokenHash)
      .first<AuthMagicLink>()
  }

  async consume(magicLinkId: string): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE auth_magic_links
         SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE magic_link_id = ? AND used_at IS NULL AND invalidated_at IS NULL`,
      )
      .bind(magicLinkId)
      .run()
    return result.meta.changes > 0
  }

  /** Count recent magic link requests for an email (rate limiting). */
  async countRecentByEmail(emailNormalized: string, windowStart: string): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM auth_magic_links
         WHERE email_normalized = ? AND created_at > ? AND invalidated_at IS NULL`,
      )
      .bind(emailNormalized, windowStart)
      .first<{ cnt: number }>()
    return row?.cnt ?? 0
  }
}
