import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { EventsRepo } from '../repositories/events.repo'

const VALID_USER_STATES = ['anonymous', 'free', 'pro'] as const

const eventsRouter = new Hono<AppEnv>()

eventsRouter.post('/api/events', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  const b = body as Record<string, unknown>

  if (!b.event_name || typeof b.event_name !== 'string') {
    return c.json({ ok: false, error: 'event_name required' }, 400)
  }
  if (!b.route || typeof b.route !== 'string') {
    return c.json({ ok: false, error: 'route required' }, 400)
  }
  if (!b.session_id || typeof b.session_id !== 'string') {
    return c.json({ ok: false, error: 'session_id required' }, 400)
  }
  if (!b.user_state || !VALID_USER_STATES.includes(b.user_state as (typeof VALID_USER_STATES)[number])) {
    return c.json({ ok: false, error: 'user_state required' }, 400)
  }

  const repo = new EventsRepo(c.env.DB)
  await repo.insert({
    event_id: crypto.randomUUID(),
    event_name: b.event_name,
    user_state: b.user_state as string,
    route: b.route,
    session_id: b.session_id,
    payload_json: b.payload != null ? JSON.stringify(b.payload) : null,
    created_at: new Date().toISOString(),
  })

  return c.json({ ok: true })
})

export default eventsRouter
