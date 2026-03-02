'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEntitlements } from '@/hooks/useEntitlements'
import LimitExceededPrompt from '@/components/LimitExceededPrompt'
import { saveResult } from '@/lib/result-store'
import { logEvent } from '@/lib/logger'
import type { GenerateResponse } from '@aso-copilot/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

const EMPTY_SCREENSHOTS: string[] = Array(6).fill('')

export default function TryPage() {
  const router = useRouter()
  const { data: entitlements, loading: entLoading } = useEntitlements()

  const [appName, setAppName] = useState('')
  const [category, setCategory] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(EMPTY_SCREENSHOTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)
  const [limitPlan, setLimitPlan] = useState<string | undefined>(undefined)

  // Prevent duplicate submits for the same form state
  const submittingRef = useRef(false)

  const isPro = entitlements?.plan === 'pro'
  const remaining = entitlements?.limits.remainingThisMonth ?? null

  const handleScreenshotChange = (index: number, value: string) => {
    setScreenshots((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Guard against double-submit (React Strict Mode / rapid clicks)
    if (submittingRef.current) return
    submittingRef.current = true

    setLoading(true)
    setError(null)
    setLimitExceeded(false)
    setLimitPlan(undefined)

    // Generate a fresh idempotency key per submission
    const runId = crypto.randomUUID()

    logEvent('generate_start', { runId, appName, category })

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': runId,
        },
        body: JSON.stringify({ appName, category, screenshots }),
      })

      if (res.status === 429) {
        const data = await res.json()
        if (data.error === 'LIMIT_EXCEEDED') {
          logEvent('limit_exceeded', { runId, plan: data.plan })
          setLimitPlan(data.plan)
          setLimitExceeded(true)
          return
        }
        setError('Too many requests. Please try again later.')
        return
      }

      if (res.status === 409) {
        // Duplicate idempotency key — should not normally happen since we
        // generate a fresh UUID per submit, but handle defensively.
        setError('Duplicate request detected. Please try again.')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        setError(msg)
        return
      }

      const result = (await res.json()) as GenerateResponse
      logEvent('generate_success', { runId, score: result.score })

      saveResult(runId, result)
      router.push(`/result?id=${runId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setError(msg)
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      {/* Back link */}
      <p style={{ margin: '0 0 24px' }}>
        <Link href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          ← Back
        </Link>
      </p>

      <h1 style={{ margin: '0 0 6px', fontSize: 24 }}>
        ASO Copilot{' '}
        {!entLoading && isPro && (
          <span style={{ fontSize: 14, color: '#2563eb', fontWeight: 600 }}>Pro</span>
        )}
      </h1>

      {/* Usage hint */}
      {!entLoading && !isPro && entitlements && (
        <p style={{ margin: '0 0 20px', fontSize: 14, color: remaining === 0 ? '#dc2626' : '#6b7280' }}>
          {remaining === 0
            ? 'You have used all free attempts this month.'
            : `${remaining} free attempt${remaining === 1 ? '' : 's'} remaining this month`}
        </p>
      )}

      {/* Category benchmark info banner */}
      <div
        style={{
          marginBottom: 20,
          padding: '10px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          fontSize: 13,
          color: '#64748b',
          display: 'flex',
          gap: 16,
        }}
      >
        <span>Recent category average score: <strong>62</strong></span>
        <span>Top-performing apps average <strong>78+</strong></span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* App Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            App Name
          </label>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. Focus Planner"
            required
            disabled={loading}
            style={inputStyle}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Category
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Productivity"
            required
            disabled={loading}
            style={inputStyle}
          />
        </div>

        {/* Screenshots */}
        <fieldset
          style={{
            marginBottom: 20,
            padding: '16px 16px 8px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
          }}
        >
          <legend style={{ fontSize: 14, fontWeight: 600, padding: '0 6px' }}>
            Screenshots (6 required)
          </legend>
          <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#9ca3af' }}>
            Paste screenshot URLs or descriptive captions for each image.
          </p>
          {screenshots.map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                Screenshot {i + 1}
              </label>
              <input
                value={s}
                onChange={(e) => handleScreenshotChange(i, e.target.value)}
                placeholder={`https://… or "Save time daily"`}
                required
                disabled={loading}
                style={inputStyle}
              />
            </div>
          ))}
        </fieldset>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || (remaining === 0 && !isPro)}
          style={{
            padding: '11px 32px',
            background: loading || (remaining === 0 && !isPro) ? '#93c5fd' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 15,
            cursor: loading || (remaining === 0 && !isPro) ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {loading ? 'Generating…' : 'Generate ASO Report'}
        </button>
      </form>

      {/* 429 Limit Exceeded banner */}
      {limitExceeded && (
        <LimitExceededPrompt
          plan={limitPlan}
          upgradeUrl="/pricing"
          onDismiss={() => setLimitExceeded(false)}
        />
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            color: '#991b1b',
            fontSize: 14,
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
}
