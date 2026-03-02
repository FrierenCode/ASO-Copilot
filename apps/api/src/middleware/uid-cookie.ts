import type { MiddlewareHandler } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../env'
import { UsersRepo } from '../repositories/users.repo'

const COOKIE_NAME = 'aso_uid'
const MAX_AGE = 31536000 // 1 year

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function signUid(key: CryptoKey, uid: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(uid))
  return bufToBase64Url(sig)
}

async function parseAndVerifyCookie(
  secret: string,
  cookieValue: string | undefined,
): Promise<string | null> {
  if (!cookieValue) return null

  const dotIdx = cookieValue.lastIndexOf('.')
  if (dotIdx === -1) return null

  const uid = cookieValue.slice(0, dotIdx)
  const sig = cookieValue.slice(dotIdx + 1)

  if (uid.length !== 36) return null

  const key = await importHmacKey(secret)
  const expectedSig = await signUid(key, uid)

  return sig === expectedSig ? uid : null
}

async function makeSignedCookieValue(secret: string, uid: string): Promise<string> {
  const key = await importHmacKey(secret)
  const sig = await signUid(key, uid)
  return `${uid}.${sig}`
}

export const uidCookieMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = c.env.UID_COOKIE_SECRET
  const raw = getCookie(c, COOKIE_NAME)

  let uid = await parseAndVerifyCookie(secret, raw)

  if (!uid) {
    uid = crypto.randomUUID()
    const cookieVal = await makeSignedCookieValue(secret, uid)
    setCookie(c, COOKIE_NAME, cookieVal, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: MAX_AGE,
    })
  }

  // Upsert the user row so uid is always in the users table
  const usersRepo = new UsersRepo(c.env.DB)
  await usersRepo.upsert(uid)

  c.set('uid', uid)
  await next()
}
