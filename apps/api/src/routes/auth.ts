import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { AppEnv } from '../env'
import {
  requestMagicLink,
  verifyMagicLink,
  revokeSession,
  isValidEmail,
} from '../services/auth.service'
import { ConsoleMagicLinkSender } from '../services/email/magic-link-sender'

const authRouter = new Hono<AppEnv>()

const SESSION_COOKIE_NAME = 'aso_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

// POST /auth/request-magic-link
authRouter.post('/auth/request-magic-link', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ ok: false, error: 'INVALID_JSON' }, 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const rawRedirect = typeof body.redirect_to === 'string' ? body.redirect_to : '/'
  const redirect_to = rawRedirect.startsWith('/') ? rawRedirect : '/'

  if (!isValidEmail(email)) {
    return c.json({ ok: false, error: 'INVALID_EMAIL' }, 400)
  }

  const uid = c.get('uid')
  const appBaseUrl = c.env.APP_BASE_URL ?? 'http://localhost:3000'
  const tokenTtlMinutes = Number(c.env.MAGIC_LINK_TOKEN_TTL_MINUTES ?? '15')
  const sender = new ConsoleMagicLinkSender()

  try {
    await requestMagicLink(
      c.env.DB,
      email,
      uid,
      appBaseUrl,
      redirect_to,
      tokenTtlMinutes,
      sender,
    )
    return c.json({ ok: true }, 202)
  } catch (err) {
    console.error('[auth] requestMagicLink error:', err)
    return c.json({ ok: false, error: 'EMAIL_SEND_FAILED' }, 500)
  }
})

// GET /auth/verify?token=...&redirect_to=...
authRouter.get('/auth/verify', async (c) => {
  const rawToken = c.req.query('token')
  const redirectTo = c.req.query('redirect_to') ?? '/'

  // Only allow relative paths to prevent open redirect
  const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/'

  if (!rawToken) {
    return c.json({ ok: false, error: 'INVALID_TOKEN' }, 400)
  }

  const result = await verifyMagicLink(c.env.DB, rawToken)

  if (!result.ok) {
    const status = result.error === 'INVALID_TOKEN' ? 400 : 410
    return c.json({ ok: false, error: result.error }, status)
  }

  // Set aso_session cookie
  setCookie(c, SESSION_COOKIE_NAME, result.rawSessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  // Sync aso_uid to the canonical uid
  // (uid-cookie middleware already set a cookie; we overwrite with canonical uid)
  // This is handled by uid-cookie middleware on next request;
  // for now just redirect so the next page load picks up the new session.

  return c.redirect(safeRedirect, 302)
})

// POST /auth/logout
authRouter.post('/auth/logout', async (c) => {
  const rawToken = getCookie(c, SESSION_COOKIE_NAME)

  if (rawToken) {
    try {
      await revokeSession(c.env.DB, rawToken)
    } catch {
      // Best-effort revocation
    }
    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  }

  return c.json({ ok: true }, 200)
})

export default authRouter
