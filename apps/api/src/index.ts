import { Hono } from 'hono'
import type { AppEnv } from './env'
import { uidCookieMiddleware } from './middleware/uid-cookie'
import { requestIdMiddleware } from './middleware/request-id'
import generateRouter from './routes/generate'
import entitlementsRouter from './routes/entitlements'
import webhooksRouter from './routes/webhooks.polar'

const app = new Hono<AppEnv>()

// ---------------------------------------------------------------------------
// CORS
// When ALLOWED_ORIGIN is set (comma-separated), credentialed requests from
// matching origins receive a specific origin + Allow-Credentials: true.
// Falls back to wildcard (*) for unrecognised or absent origins.
// ---------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('origin') ?? ''
  const allowedOrigins = (c.env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const useCredentials = allowedOrigins.length > 0 && allowedOrigins.includes(requestOrigin)
  const originHeader = useCredentials ? requestOrigin : '*'

  if (c.req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': originHeader,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
    if (useCredentials) headers['Access-Control-Allow-Credentials'] = 'true'
    return c.body(null, 204, headers)
  }

  await next()
  c.header('Access-Control-Allow-Origin', originHeader)
  c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  c.header('Access-Control-Allow-Headers', '*')
  if (useCredentials) c.header('Access-Control-Allow-Credentials', 'true')
})

// ---------------------------------------------------------------------------
// Identity + request tracing
// ---------------------------------------------------------------------------
app.use('*', requestIdMiddleware)

// uidCookieMiddleware runs on all routes except the webhook
// (webhooks are server-to-server; no cookie identity needed there)
app.use('/health', uidCookieMiddleware)
app.use('/generate', uidCookieMiddleware)
app.use('/v1/*', uidCookieMiddleware)

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/health', (c) => c.json({ ok: true, service: 'api' }))

app.route('/', generateRouter)
app.route('/', entitlementsRouter)
app.route('/', webhooksRouter)

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
app.notFound((c) => c.json({ ok: false, error: 'Not Found' }, 404))

export default app
