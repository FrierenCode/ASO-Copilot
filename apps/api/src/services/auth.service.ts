import { UsersRepo } from '../repositories/users.repo'
import { UserAuthProfilesRepo } from '../repositories/user-auth-profiles.repo'
import { AuthMagicLinksRepo } from '../repositories/auth-magic-links.repo'
import { SessionsRepo } from '../repositories/sessions.repo'
import type { MagicLinkSender } from './email/magic-link-sender'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

function bufToBase64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Generate a cryptographically random URL-safe token. */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bufToBase64Url(bytes.buffer)
}

/** Normalize email: lowercase + trim. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/** Basic RFC 5322-ish email validation. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Request a magic link for the given email.
 * Stores token_hash in DB; sends the raw token via the email sender.
 *
 * @returns `{ ok: true }` on success, `{ ok: false, error }` on failure.
 */
export async function requestMagicLink(
  db: D1Database,
  email: string,
  requestedByUid: string,
  appBaseUrl: string,
  redirectTo: string,
  tokenTtlMinutes: number,
  sender: MagicLinkSender,
): Promise<void> {
  const emailNormalized = normalizeEmail(email)

  // Look up existing member with this email (for anonymous→member promotion)
  const profilesRepo = new UserAuthProfilesRepo(db)
  const existingMember = await profilesRepo.getByEmailNormalized(emailNormalized)
  const targetUid = existingMember?.uid ?? null

  const rawToken = generateToken()
  const tokenHash = await sha256Hex(rawToken)
  const magicLinkId = crypto.randomUUID()

  const expiresAt = new Date(Date.now() + tokenTtlMinutes * 60 * 1000).toISOString()

  const linksRepo = new AuthMagicLinksRepo(db)
  await linksRepo.create({
    magicLinkId,
    emailNormalized,
    tokenHash,
    requestedByUid,
    targetUid,
    redirectTo: redirectTo || '/',
    expiresAt,
  })

  const safeRedirect = encodeURIComponent(redirectTo || '/')
  const magicLink = `${appBaseUrl}/auth/verify?token=${encodeURIComponent(rawToken)}&redirect_to=${safeRedirect}`

  await sender.send({ toEmail: email, magicLink, expiresAt })
}

export type VerifyMagicLinkResult =
  | { ok: true; uid: string; email: string; sessionId: string; rawSessionToken: string }
  | { ok: false; error: 'INVALID_TOKEN' | 'MAGIC_LINK_EXPIRED_OR_USED' }

/**
 * Verify a magic link token.
 * On success: promotes the uid to member, creates a session, returns session token.
 */
export async function verifyMagicLink(
  db: D1Database,
  rawToken: string,
): Promise<VerifyMagicLinkResult> {
  const tokenHash = await sha256Hex(rawToken)

  const linksRepo = new AuthMagicLinksRepo(db)
  const link = await linksRepo.getByTokenHash(tokenHash)

  if (!link) {
    return { ok: false, error: 'INVALID_TOKEN' }
  }

  // Check expiry and already-used
  const now = new Date()
  if (link.used_at || link.invalidated_at || new Date(link.expires_at) < now) {
    return { ok: false, error: 'MAGIC_LINK_EXPIRED_OR_USED' }
  }

  // Consume the link (mark as used)
  const consumed = await linksRepo.consume(link.magic_link_id)
  if (!consumed) {
    // Race condition: another request consumed it first
    return { ok: false, error: 'MAGIC_LINK_EXPIRED_OR_USED' }
  }

  // Determine the canonical uid:
  // - If there's an existing member with this email, use that uid
  // - Otherwise promote the requesting uid to member
  const profilesRepo = new UserAuthProfilesRepo(db)
  const existingMember = await profilesRepo.getByEmailNormalized(link.email_normalized)

  let canonicalUid: string
  if (existingMember) {
    canonicalUid = existingMember.uid
  } else {
    // Promote the requesting uid (or create a new user if target_uid is set)
    canonicalUid = link.requested_by_uid ?? crypto.randomUUID()
    // Ensure user row exists
    const usersRepo = new UsersRepo(db)
    await usersRepo.upsert(canonicalUid)
    await profilesRepo.promoteToMember(canonicalUid, link.email_normalized, link.email_normalized)
  }

  // Create session
  const rawSessionToken = generateToken()
  const sessionTokenHash = await sha256Hex(rawSessionToken)
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()

  const sessionsRepo = new SessionsRepo(db)
  await sessionsRepo.create({ sessionId, sessionTokenHash, uid: canonicalUid, expiresAt })

  return {
    ok: true,
    uid: canonicalUid,
    email: link.email_normalized,
    sessionId,
    rawSessionToken,
  }
}

/**
 * Revoke the session identified by token hash.
 * Returns the session's uid if found, null otherwise.
 */
export async function revokeSession(
  db: D1Database,
  rawSessionToken: string,
): Promise<string | null> {
  const tokenHash = await sha256Hex(rawSessionToken)
  const sessionsRepo = new SessionsRepo(db)
  const session = await sessionsRepo.getByTokenHash(tokenHash)
  if (!session) return null
  await sessionsRepo.revoke(session.session_id)
  return session.uid
}
