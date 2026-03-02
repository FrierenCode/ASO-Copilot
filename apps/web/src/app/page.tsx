'use client'

import { useState } from 'react'
import type { Breakdown, GenerateResponse } from '@aso-copilot/shared'
import { useEntitlements } from '@/hooks/useEntitlements'
import LimitExceededPrompt from '@/components/LimitExceededPrompt'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

export default function Home() {
  const { data: entitlements, loading: entLoading } = useEntitlements()

  const [appName, setAppName] = useState('')
  const [category, setCategory] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)

  const isPro = entitlements?.plan === 'pro'

  const handleScreenshotChange = (index: number, value: string) => {
    setScreenshots(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setLimitExceeded(false)

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, category, screenshots }),
      })

      if (res.status === 429) {
        const data = await res.json()
        if (data.error === 'LIMIT_EXCEEDED') {
          setLimitExceeded(true)
          return
        }
        setError('Too many requests. Please try again later.')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        setError(msg)
        return
      }

      setResult(await res.json() as GenerateResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1>
        ASO Copilot{' '}
        {!entLoading && isPro && (
          <span style={{ fontSize: 14, color: '#4a90d9' }}>Pro</span>
        )}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            App Name
            <br />
            <input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              required
              style={{ width: '100%', padding: 6, marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>
            Category
            <br />
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              style={{ width: '100%', padding: 6, marginTop: 4, boxSizing: 'border-box' }}
            />
          </label>
        </div>

        <fieldset style={{ marginBottom: 12, padding: 12 }}>
          <legend>Screenshots (6 required)</legend>
          {screenshots.map((s, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <label>
                Screenshot {i + 1}
                <br />
                <input
                  value={s}
                  onChange={e => handleScreenshotChange(i, e.target.value)}
                  required
                  style={{ width: '100%', padding: 6, marginTop: 4, boxSizing: 'border-box' }}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <button type="submit" disabled={loading} style={{ padding: '8px 24px' }}>
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {/* Usage hint for free users */}
        {!entLoading && !isPro && entitlements && (
          <p style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
            {entitlements.limits.remainingThisMonth === 0
              ? 'You have used all 3 free attempts this month.'
              : `${entitlements.limits.remainingThisMonth} free attempt${entitlements.limits.remainingThisMonth === 1 ? '' : 's'} remaining`}
          </p>
        )}
      </form>

      {/* 429 limit exceeded banner */}
      {limitExceeded && (
        <LimitExceededPrompt
          upgradeUrl="/pricing"
          onDismiss={() => setLimitExceeded(false)}
        />
      )}

      {error && (
        <div style={{ marginTop: 24, color: 'red', border: '1px solid red', padding: 12, borderRadius: 4 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 72, fontWeight: 'bold', lineHeight: 1 }}>{result.score}</span>
            <p style={{ margin: '4px 0 0', color: '#666' }}>/ 100</p>
          </div>

          <section style={{ marginBottom: 24 }}>
            <h2>Breakdown</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(Object.entries(result.breakdown) as [keyof Breakdown, number][]).map(
                  ([dim, val]) => (
                    <tr key={dim}>
                      <td style={{ padding: '4px 8px', textTransform: 'capitalize', width: 80 }}>
                        {dim}
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              background: '#4a90d9',
                              height: 16,
                              width: `${(val / 20) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{val} / 20</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2>Recommendations</h2>
            <ul>
              {result.recommendation.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Variants</h2>
            {(['A', 'B', 'C'] as const).map(v => (
              <div key={v} style={{ marginBottom: 16 }}>
                <h3>Variant {v}</h3>
                <ul>
                  {result.variants[v].map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                {isPro && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = result.variants[v].join('\n')
                      navigator.clipboard.writeText(text)
                    }}
                    style={{ marginTop: 4, padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}
                  >
                    Copy Variant {v}
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </main>
  )
}
