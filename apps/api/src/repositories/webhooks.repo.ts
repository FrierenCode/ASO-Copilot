export interface WebhookInbox {
  provider: string
  webhook_id: string
  provider_event_id: string | null
  event_type: string
  event_created_at: string | null
  signature_valid: number
  payload: string
  status: string
  attempt_count: number
  first_received_at: string
  last_received_at: string
  processed_at: string | null
  last_error: string | null
}

export class WebhooksRepo {
  constructor(private db: D1Database) {}

  async get(provider: string, webhookId: string): Promise<WebhookInbox | null> {
    return this.db
      .prepare(`SELECT * FROM webhook_inbox WHERE provider = ? AND webhook_id = ?`)
      .bind(provider, webhookId)
      .first<WebhookInbox>()
  }

  async upsertReceived(
    provider: string,
    webhookId: string,
    eventType: string,
    payload: string,
    signatureValid: 0 | 1,
    eventCreatedAt: string | null,
    providerEventId: string | null,
  ): Promise<WebhookInbox> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `INSERT INTO webhook_inbox
           (provider, webhook_id, provider_event_id, event_type, event_created_at,
            signature_valid, payload, status, attempt_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'received', 1)
         ON CONFLICT(provider, webhook_id) DO UPDATE SET
           last_received_at  = ?,
           attempt_count     = attempt_count + 1,
           payload           = excluded.payload,
           signature_valid   = excluded.signature_valid`,
      )
      .bind(
        provider,
        webhookId,
        providerEventId,
        eventType,
        eventCreatedAt,
        signatureValid,
        payload,
        now,
      )
      .run()
    return (await this.get(provider, webhookId))!
  }

  async setProcessing(provider: string, webhookId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE webhook_inbox SET status = 'processing' WHERE provider = ? AND webhook_id = ?`,
      )
      .bind(provider, webhookId)
      .run()
  }

  async setProcessed(provider: string, webhookId: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .prepare(
        `UPDATE webhook_inbox
         SET status = 'processed', processed_at = ?
         WHERE provider = ? AND webhook_id = ?`,
      )
      .bind(now, provider, webhookId)
      .run()
  }

  async setFailed(provider: string, webhookId: string, error: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE webhook_inbox
         SET status = 'failed', last_error = ?
         WHERE provider = ? AND webhook_id = ?`,
      )
      .bind(error, provider, webhookId)
      .run()
  }
}
