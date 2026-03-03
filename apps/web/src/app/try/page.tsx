'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopNav from '@/components/TopNav'
import LimitExceededPrompt from '@/components/LimitExceededPrompt'
import { useEntitlements } from '@/hooks/useEntitlements'
import { logEvent } from '@/lib/logger'
import { saveResult } from '@/lib/result-store'
import type { GenerateResponse } from '@aso-copilot/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'
const EMPTY_SCREENSHOTS: string[] = Array(6).fill('')

export default function TryPage() {
  const router = useRouter()
  const { data: entitlements, loading: entitlementsLoading } = useEntitlements()

  const [appName, setAppName] = useState('')
  const [category, setCategory] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(EMPTY_SCREENSHOTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)
  const [limitPlan, setLimitPlan] = useState<string | undefined>(undefined)

  const submittingRef = useRef(false)
  const isPro = entitlements?.plan === 'pro'
  const remaining = entitlements?.limits.remainingThisMonth ?? null

  const handleScreenshotChange = (index: number, value: string) => {
    setScreenshots((previous) => {
      const next = [...previous]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true

    setLoading(true)
    setError(null)
    setLimitExceeded(false)
    setLimitPlan(undefined)

    const runId = crypto.randomUUID()
    logEvent('generate_start', { runId, appName, category })

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': runId,
        },
        body: JSON.stringify({ appName, category, screenshots }),
      })

      if (response.status === 429) {
        const data = await response.json()
        if (data.error === 'LIMIT_EXCEEDED') {
          logEvent('limit_exceeded', { runId, plan: data.plan })
          setLimitPlan(data.plan)
          setLimitExceeded(true)
          return
        }
        setError('Too many requests. Please try again later.')
        return
      }

      if (response.status === 409) {
        setError('Duplicate request detected. Please try again.')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        const message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        setError(message)
        return
      }

      const result = (await response.json()) as GenerateResponse
      logEvent('generate_success', { runId, score: result.score })
      saveResult(runId, result)
      router.push(`/result?id=${runId}`)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Network error'
      setError(message)
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 640, margin: '32px auto 56px', padding: '0 16px' }}>
        <p style={{ margin: '0 0 22px' }}>
          <Link href="/" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            Back to home
          </Link>
        </p>

        <h1 style={{ margin: '0 0 8px', fontSize: 28, lineHeight: 1.2 }}>
          Generate ASO Report
          {!entitlementsLoading && isPro && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', marginLeft: 8 }}>
              PRO
            </span>
          )}
        </h1>

        {!entitlementsLoading && !isPro && entitlements && (
          <p
            style={{
              margin: '0 0 20px',
              fontSize: 14,
              color: remaining === 0 ? '#dc2626' : '#6b7280',
            }}
          >
            {remaining === 0
              ? 'You have used all free attempts this month.'
              : `${remaining} free attempt${remaining === 1 ? '' : 's'} remaining this month`}
          </p>
        )}

        <div
          style={{
            marginBottom: 20,
            padding: '10px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span>
            Recent category average score: <strong>62</strong>
          </span>
          <span>
            Top-performing apps average <strong>78+</strong>
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              App Name
            </label>
            <input
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              placeholder="Focus Planner"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              Category
            </label>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Productivity"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <fieldset
            style={{
              marginBottom: 20,
              padding: '14px 14px 8px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          >
            <legend style={{ fontSize: 14, fontWeight: 700, padding: '0 6px' }}>
              Screenshots (6 required)
            </legend>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#9ca3af' }}>
              Paste screenshot URLs or short captions for each screenshot.
            </p>

            {screenshots.map((screenshot, index) => (
              <div key={index} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                  Screenshot {index + 1}
                </label>
                <input
                  value={screenshot}
                  onChange={(event) => handleScreenshotChange(index, event.target.value)}
                  placeholder='https://... or "Save time daily"'
                  required
                  disabled={loading}
                  style={inputStyle}
                />
              </div>
            ))}
          </fieldset>

          <button
            type="submit"
            disabled={loading || (remaining === 0 && !isPro)}
            style={{
              width: '100%',
              padding: '11px 32px',
              background: loading || (remaining === 0 && !isPro) ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 15,
              cursor: loading || (remaining === 0 && !isPro) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Generating...' : 'Generate ASO Report'}
          </button>
        </form>

        {limitExceeded && (
          <LimitExceededPrompt
            plan={limitPlan}
            upgradeUrl="/pricing"
            onDismiss={() => setLimitExceeded(false)}
          />
        )}

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
      </section>
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
