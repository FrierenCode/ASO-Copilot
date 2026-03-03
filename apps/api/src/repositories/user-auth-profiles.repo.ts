export interface UserAuthProfile {
  uid: string
  email: string | null
  email_normalized: string | null
  user_type: 'anonymous' | 'member'
  role: 'user' | 'admin'
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export class UserAuthProfilesRepo {
  constructor(private db: D1Database) {}

  async get(uid: string): Promise<UserAuthProfile | null> {
    return this.db
      .prepare('SELECT * FROM user_auth_profiles WHERE uid = ?')
      .bind(uid)
      .first<UserAuthProfile>()
  }

  async getByEmailNormalized(emailNormalized: string): Promise<UserAuthProfile | null> {
    return this.db
      .prepare('SELECT * FROM user_auth_profiles WHERE email_normalized = ?')
      .bind(emailNormalized)
      .first<UserAuthProfile>()
  }

  /** Ensure an anonymous profile row exists for this uid (INSERT OR IGNORE). */
  async ensureAnonymous(uid: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO user_auth_profiles (uid, user_type) VALUES (?, 'anonymous')
         ON CONFLICT(uid) DO NOTHING`,
      )
      .bind(uid)
      .run()
  }

  /** Upsert uid to member status with verified email. */
  async promoteToMember(uid: string, email: string, emailNormalized: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO user_auth_profiles
           (uid, email, email_normalized, user_type, email_verified_at, updated_at)
         VALUES (?, ?, ?, 'member', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(uid) DO UPDATE SET
           email = excluded.email,
           email_normalized = excluded.email_normalized,
           user_type = 'member',
           email_verified_at = COALESCE(user_auth_profiles.email_verified_at, excluded.email_verified_at),
           updated_at = excluded.updated_at`,
      )
      .bind(uid, email, emailNormalized)
      .run()
  }
}
