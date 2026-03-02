import type { MiddlewareHandler } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import type { AppEnv } from '../env'
import { SessionsRepo } from '../repositories/sessions.repo'

const SESSION_COOKIE_NAME = 'aso_session'

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const sessionCookieMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  // Default: not authenticated
  c.set('sessionUid', undefined)
  c.set('isAuthenticated', false)

  const rawToken = getCookie(c, SESSION_COOKIE_NAME)

  if (rawToken && c.env.DB) {
    try {
      const tokenHash = await sha256Hex(rawToken)
      const sessionsRepo = new SessionsRepo(c.env.DB)
      const session = await sessionsRepo.getByTokenHash(tokenHash)

      if (session) {
        const now = new Date()
        const isExpired = new Date(session.expires_at) < now
        const isRevoked = session.revoked_at !== null

        if (!isExpired && !isRevoked) {
          c.set('sessionUid', session.uid)
          c.set('isAuthenticated', true)
          // Touch last_seen_at (fire and forget – don't block response)
          void sessionsRepo.touch(session.session_id)
        } else {
          // Clear stale cookie
          deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
        }
      }
    } catch {
      // Session validation failure should not break the request
    }
  }

  await next()
}
