export class UsersRepo {
  constructor(private db: D1Database) {}

  async upsert(uid: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO users (uid, last_seen_at)
         VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(uid) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
      )
      .bind(uid)
      .run()
  }
}
