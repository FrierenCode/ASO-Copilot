import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { WebhooksRepo } from '../repositories/webhooks.repo'
import { BillingRepo } from '../repositories/billing.repo'
import { EntitlementsRepo } from '../repositories/entitlements.repo'
import { UsersRepo } from '../repositories/users.repo'

const webhooksRouter = new Hono<AppEnv>()

// ---------------------------------------------------------------------------
// Standard Webhooks signature verification
// Message = "{webhook-id}.{webhook-timestamp}.{body}"
// Secret may be plain string or "whsec_<base64>" format
// ---------------------------------------------------------------------------

async function importWebhookKey(secret: string): Promise<CryptoKey> {
  const keyBytes =
    secret.startsWith('whsec_')
      ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(secret)

  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'verify',
  ])
}

async function verifySignature(
  secret: string,
  webhookId: string,
  timestamp: string,
  body: string,
  sigHeader: string,
): Promise<boolean> {
  try {
    const key = await importWebhookKey(secret)
    const message = new TextEncoder().encode(`${webhookId}.${timestamp}.${body}`)
    // sigHeader can hold multiple "v1,<base64>" values separated by spaces
    for (const part of sigHeader.split(' ')) {
      const [version, b64] = part.split(',')
      if (version !== 'v1' || !b64) continue
      const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const valid = await crypto.subtle.verify('HMAC', key, sigBytes, message)
      if (valid) return true
    }
    return false
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Active subscription statuses (treat as granting entitlement)
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

function isSubscriptionActive(status: string, cancelAtPeriodEnd: boolean): boolean {
  // If cancel_at_period_end is set the subscription is still active until period ends
  return ACTIVE_STATUSES.has(status) || (cancelAtPeriodEnd && ACTIVE_STATUSES.has(status))
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

webhooksRouter.post('/webhooks/polar', async (c) => {
  const rawBody = await c.req.text()

  const webhookId = c.req.header('webhook-id') ?? ''
  const timestamp = c.req.header('webhook-timestamp') ?? ''
  const sigHeader = c.req.header('webhook-signature') ?? ''

  if (!webhookId) {
    return c.json({ ok: false, error: 'Missing webhook-id header' }, 400)
  }

  // Verify signature
  const signatureValid = await verifySignature(
    c.env.POLAR_WEBHOOK_SECRET,
    webhookId,
    timestamp,
    rawBody,
    sigHeader,
  )

  // Parse JSON (needed for event_type even if sig invalid)
  let event: Record<string, unknown> = {}
  let eventType = 'unknown'
  let eventCreatedAt: string | null = null
  let providerEventId: string | null = null

  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
    eventType = (event.type as string) ?? 'unknown'
    eventCreatedAt = (event.created_at as string) ?? null
    providerEventId = (event.event_id as string) ?? null
  } catch {
    // bad JSON – store as-is and fail
  }

  const webhooksRepo = new WebhooksRepo(c.env.DB)

  // Upsert inbox row (dedupe check)
  const inbox = await webhooksRepo.upsertReceived(
    'polar',
    webhookId,
    eventType,
    rawBody,
    signatureValid ? 1 : 0,
    eventCreatedAt,
    providerEventId,
  )

  // If already processed or ignored, skip
  if (inbox.status === 'processed' || inbox.status === 'ignored') {
    return c.json({ ok: true, deduped: true })
  }

  await webhooksRepo.setProcessing('polar', webhookId)

  if (!signatureValid) {
    await webhooksRepo.setFailed('polar', webhookId, 'invalid_signature')
    return c.json({ ok: false, error: 'Invalid signature' }, 202)
  }

  // Handle subscription events
  const HANDLED_TYPES = [
    'subscription.created',
    'subscription.updated',
    'subscription.canceled',
    'subscription.revoked',
    'subscription.active',
    'subscription.uncanceled',
  ]

  if (!HANDLED_TYPES.includes(eventType)) {
    await webhooksRepo.setProcessed('polar', webhookId)
    return c.json({ ok: true })
  }

  try {
    const data = event.data as Record<string, unknown>
    const sub = data ?? {}

    const polarSubscriptionId = sub.id as string
    const polarCustomerId = sub.customer_id as string
    const productId = (sub.product_id as string) ?? null
    const subStatus = (sub.status as string) ?? 'unknown'
    const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end)
    const currentPeriodStart = (sub.current_period_start as string) ?? null
    const currentPeriodEnd = (sub.current_period_end as string) ?? null
    const sourceUpdatedAt = (sub.modified_at as string) ?? eventCreatedAt ?? new Date().toISOString()

    // Resolve uid
    const customer = sub.customer as Record<string, unknown> | undefined
    const customerMeta = customer?.metadata as Record<string, unknown> | undefined
    const uidFromMeta =
      (customerMeta?.reference_id as string) ??
      (customerMeta?.uid as string) ??
      null

    const billingRepo = new BillingRepo(c.env.DB)

    // Try existing mapping first, then fall back to metadata
    let uid = await billingRepo.getUidByCustomerId(polarCustomerId)
    if (!uid && uidFromMeta) {
      uid = uidFromMeta
    }

    if (!uid) {
      await webhooksRepo.setFailed('polar', webhookId, 'uid_not_resolved')
      return c.json({ ok: false, error: 'Cannot resolve uid from event' }, 202)
    }

    // Ensure user row exists (uid may originate from metadata before first API call)
    const usersRepo = new UsersRepo(c.env.DB)
    await usersRepo.upsert(uid)

    // Upsert billing customer
    const email = (customer?.email as string) ?? null
    await billingRepo.upsertCustomer(polarCustomerId, uid, email)

    // Resolve plan from product map
    let planCode: string | null = productId ? await billingRepo.getPlanCodeForProduct(productId) : null
    let mappingFailed = false

    if (!planCode) {
      // No mapping found – default to free and mark failed
      planCode = 'free'
      mappingFailed = true
    }

    // Upsert subscription
    await billingRepo.upsertSubscription(
      polarSubscriptionId,
      polarCustomerId,
      uid,
      planCode,
      subStatus,
      cancelAtPeriodEnd,
      currentPeriodStart,
      currentPeriodEnd,
      sourceUpdatedAt,
      rawBody,
    )

    // Recompute entitlement
    const entRepo = new EntitlementsRepo(c.env.DB)
    const active = isSubscriptionActive(subStatus, cancelAtPeriodEnd)

    if (active && planCode === 'pro') {
      await entRepo.upsertFromSubscription(uid, 'pro', 'polar_subscription', polarSubscriptionId, null)
    } else {
      // Subscription not active, or mapping failed → free
      await entRepo.upsertFromSubscription(uid, 'free', 'free_default', null, 3)
    }

    if (mappingFailed) {
      await webhooksRepo.setFailed('polar', webhookId, `no_product_mapping:${productId}`)
      return c.json({ ok: false, error: 'No product mapping; entitlement defaulted to free' }, 202)
    }

    await webhooksRepo.setProcessed('polar', webhookId)
    return c.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await webhooksRepo.setFailed('polar', webhookId, msg)
    return c.json({ ok: false, error: 'Processing error' }, 202)
  }
})

export default webhooksRouter
