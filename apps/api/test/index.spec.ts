import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { scoreCopy } from '@aso-copilot/scoring'

describe('API Routes', () => {
  it('health', async () => {
    const req = new Request('http://localhost/health')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.service).toBe('api')
  })

  it('generate success', async () => {
    const req = new Request('http://localhost/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: 'Test App',
        category: 'Productivity',
        screenshots: [
          's1.png',
          's2.png',
          's3.png',
          's4.png',
          's5.png',
          's6.png',
        ],
      }),
    })

    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.variants).toBeDefined()
    expect(data.variants.A.length).toBeGreaterThan(0)
    expect(data.variants.B.length).toBeGreaterThan(0)
    expect(data.variants.C.length).toBeGreaterThan(0)
    expect(typeof data.score).toBe('number')
    expect(data.score).toBeGreaterThanOrEqual(0)
    expect(data.score).toBeLessThanOrEqual(100)
    expect(Array.isArray(data.recommendation)).toBe(true)
    expect(data.recommendation.length).toBeGreaterThan(0)
  })

  it('generate validation error', async () => {
    const req = new Request('http://localhost/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: 'Test App',
        category: 'Productivity',
        screenshots: ['s1.png', 's2.png'],
      }),
    })

    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.fieldErrors).toBeDefined()
    expect(data.error.fieldErrors.screenshots).toBeDefined()
  })

  it('generate returns 429 after free plan limit', async () => {
    // Use a fixed uid via a pre-signed cookie so quota state is predictable.
    // We need 4 requests for the same user: first 3 allowed, 4th rejected.
    const uid = '11111111-1111-1111-1111-111111111111'
    // Build a signed cookie matching the test secret
    const secret = 'test-uid-cookie-secret-vitest-32ch'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(uid))
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const cookieHeader = `aso_uid=${uid}.${sig}`

    const makeReq = (requestId: string) =>
      new Request('http://localhost/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          appName: 'Quota Test',
          category: 'Productivity',
          screenshots: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png'],
        }),
      })

    const ctx1 = createExecutionContext()
    const r1 = await app.fetch(makeReq('req-quota-1'), env, ctx1)
    await waitOnExecutionContext(ctx1)
    expect(r1.status).toBe(200)

    const ctx2 = createExecutionContext()
    const r2 = await app.fetch(makeReq('req-quota-2'), env, ctx2)
    await waitOnExecutionContext(ctx2)
    expect(r2.status).toBe(200)

    const ctx3 = createExecutionContext()
    const r3 = await app.fetch(makeReq('req-quota-3'), env, ctx3)
    await waitOnExecutionContext(ctx3)
    expect(r3.status).toBe(200)

    // 4th request should be rejected
    const ctx4 = createExecutionContext()
    const r4 = await app.fetch(makeReq('req-quota-4'), env, ctx4)
    await waitOnExecutionContext(ctx4)
    expect(r4.status).toBe(429)
    const data4 = await r4.json()
    expect(data4.error).toBe('LIMIT_EXCEEDED')
  })

  it('duplicate request id returns 409', async () => {
    // Both requests must share the same uid – send a pre-signed cookie
    const dedupUid = '22222222-2222-2222-2222-222222222222'
    const secret = 'test-uid-cookie-secret-vitest-32ch'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dedupUid))
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const cookieHeader = `aso_uid=${dedupUid}.${sig}`

    const req = () =>
      new Request('http://localhost/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'dedup-test-id-unique-abc',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          appName: 'Dedup Test',
          category: 'Productivity',
          screenshots: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png'],
        }),
      })

    const ctx1 = createExecutionContext()
    const r1 = await app.fetch(req(), env, ctx1)
    await waitOnExecutionContext(ctx1)
    expect(r1.status).toBe(200)

    const ctx2 = createExecutionContext()
    const r2 = await app.fetch(req(), env, ctx2)
    await waitOnExecutionContext(ctx2)
    expect(r2.status).toBe(409)
    const d2 = await r2.json()
    expect(d2.error).toBe('DUPLICATE_REQUEST')
  })

  it('GET /v1/entitlements returns shape', async () => {
    const req = new Request('http://localhost/v1/entitlements')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')

    const data = await res.json()
    expect(data.uid).toBeDefined()
    expect(data.plan).toBe('free')
    expect(data.status).toBe('active')
    expect(data.limits).toBeDefined()
    expect(data.limits.monthlyGenerations).toBe(3)
    expect(data.source).toBeDefined()
    expect(data.source.type).toBe('free_default')
  })

  // -------------------------------------------------------------------------
  // V2 feature flag tests
  // -------------------------------------------------------------------------

  it('v2: missing x-request-id returns 400 MISSING_IDEMPOTENCY_KEY', async () => {
    const v2Env = { ...env, USAGE_POLICY_V2_ENABLED: 'true' }

    const req = new Request('http://localhost/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No x-request-id header
      body: JSON.stringify({
        appName: 'V2 Test',
        category: 'Productivity',
        screenshots: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png'],
      }),
    })

    const ctx = createExecutionContext()
    const res = await app.fetch(req, v2Env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('MISSING_IDEMPOTENCY_KEY')
  })

  it('v2: anonymous user gets 429 after 2 lifetime generations', async () => {
    const v2Env = { ...env, USAGE_POLICY_V2_ENABLED: 'true' }

    const anonUid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const secret = 'test-uid-cookie-secret-vitest-32ch'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(anonUid))
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const cookieHeader = `aso_uid=${anonUid}.${sig}`

    const makeReq = (idempotencyKey: string) =>
      new Request('http://localhost/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': idempotencyKey,
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          appName: 'Anon Lifetime Test',
          category: 'Productivity',
          screenshots: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png'],
        }),
      })

    const ctx1 = createExecutionContext()
    const r1 = await app.fetch(makeReq('v2-anon-1'), v2Env, ctx1)
    await waitOnExecutionContext(ctx1)
    expect(r1.status).toBe(200)

    const ctx2 = createExecutionContext()
    const r2 = await app.fetch(makeReq('v2-anon-2'), v2Env, ctx2)
    await waitOnExecutionContext(ctx2)
    expect(r2.status).toBe(200)

    // 3rd request exceeds anonymous lifetime limit (2)
    const ctx3 = createExecutionContext()
    const r3 = await app.fetch(makeReq('v2-anon-3'), v2Env, ctx3)
    await waitOnExecutionContext(ctx3)
    expect(r3.status).toBe(429)
    const data3 = await r3.json()
    expect(data3.error).toBe('LIMIT_EXCEEDED')
    expect(data3.plan).toBe('anonymous')
    expect(data3.upgrade_url).toBe('/pricing')
  })

  it('v2: duplicate idempotency key returns 409 DUPLICATE_REQUEST', async () => {
    const v2Env = { ...env, USAGE_POLICY_V2_ENABLED: 'true' }

    const dupUid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const secret = 'test-uid-cookie-secret-vitest-32ch'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dupUid))
    const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const cookieHeader = `aso_uid=${dupUid}.${sig}`

    const makeReq = () =>
      new Request('http://localhost/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'v2-dedup-test-key-xyz',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          appName: 'V2 Dedup Test',
          category: 'Productivity',
          screenshots: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png', 's6.png'],
        }),
      })

    const ctx1 = createExecutionContext()
    const r1 = await app.fetch(makeReq(), v2Env, ctx1)
    await waitOnExecutionContext(ctx1)
    expect(r1.status).toBe(200)

    const ctx2 = createExecutionContext()
    const r2 = await app.fetch(makeReq(), v2Env, ctx2)
    await waitOnExecutionContext(ctx2)
    expect(r2.status).toBe(409)
    const d2 = await r2.json()
    expect(d2.error).toBe('DUPLICATE_REQUEST')
  })

  it('GET /api/me returns shape', async () => {
    const req = new Request('http://localhost/api/me')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.uid).toBeDefined()
    expect(typeof data.authenticated).toBe('boolean')
    expect(data.plan).toBeDefined()
    expect(data.usage).toBeDefined()
  })

  it('scoreCopy should not inflate numeric score from filename-only screenshots', () => {
    const result = scoreCopy({
      appName: 'Note App',
      category: 'Tools',
      screenshots: [
        'screenshot_1.png',
        'screenshot_2.png',
        'screenshot_3.png',
        'screenshot_4.png',
        'screenshot_5.png',
        'screenshot_6.png',
      ],
    })

    expect(result.breakdown.numeric).toBeLessThanOrEqual(5)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.recommendation.some((value) => value.toLowerCase().includes('numeric proof point'))).toBe(true)
    expect(result.score).toBeLessThanOrEqual(30)
  })

  it('scoreCopy should lower score when category is mismatched', () => {
    const aligned = scoreCopy({
      appName: 'Focus Planner',
      category: 'Productivity',
      screenshots: [
        'Save time with task planning',
        'Boost productivity with focused workflows',
        'Organize your day and complete goals faster',
        'Start now and track your progress daily',
        'Simple routines for better focus and efficiency',
        'Join free to improve your productivity habits',
      ],
    })

    const mismatched = scoreCopy({
      appName: 'Focus Planner',
      category: 'Finance',
      screenshots: [
        'Save time with task planning',
        'Boost productivity with focused workflows',
        'Organize your day and complete goals faster',
        'Start now and track your progress daily',
        'Simple routines for better focus and efficiency',
        'Join free to improve your productivity habits',
      ],
    })

    expect(aligned.breakdown.category).toBeGreaterThan(mismatched.breakdown.category)
    expect(aligned.score).toBeGreaterThan(mismatched.score)
    expect(aligned.score).toBeGreaterThanOrEqual(0)
    expect(aligned.score).toBeLessThanOrEqual(100)
    expect(mismatched.score).toBeGreaterThanOrEqual(0)
    expect(mismatched.score).toBeLessThanOrEqual(100)
  })
})
