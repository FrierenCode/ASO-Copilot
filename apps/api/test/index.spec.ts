import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { scoreCopy } from '@aso-copilot/scoring'

describe('API Routes', () => {
  it('health', async () => {
    const req = new Request('http://localhost/health')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, {}, ctx)
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
    const res = await app.fetch(req, {}, ctx)
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
    const res = await app.fetch(req, {}, ctx)
    await waitOnExecutionContext(ctx)

    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error).toBeDefined()
    expect(data.error.fieldErrors).toBeDefined()
    expect(data.error.fieldErrors.screenshots).toBeDefined()
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
