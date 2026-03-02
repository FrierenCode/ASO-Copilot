export class EventsRepo {
  constructor(private db: D1Database) {}

  async insert(params: {
    event_id: string
    event_name: string
    user_state: string
    route: string
    session_id: string
    payload_json: string | null
    created_at: string
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO events
           (event_id, event_name, user_state, route, session_id, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        params.event_id,
        params.event_name,
        params.user_state,
        params.route,
        params.session_id,
        params.payload_json,
        params.created_at,
      )
      .run()
  }
}
