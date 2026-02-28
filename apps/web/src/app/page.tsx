'use client'

import { useState } from 'react'
import type { Breakdown, GenerateResponse } from '@aso-copilot/shared'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'
const USAGE_KEY = 'aso_copilot_usage'
const PRO_KEY = 'aso_copilot_is_pro'
const FREE_LIMIT = 3

function readUsage(): number {
  return parseInt(localStorage.getItem(USAGE_KEY) ?? '0', 10)
}

function incrementUsage(): number {
  const next = readUsage() + 1
  localStorage.setItem(USAGE_KEY, String(next))
  return next
}

function readIsPro(): boolean {
  return localStorage.getItem(PRO_KEY) === 'true'
}

function activatePro(): void {
  localStorage.setItem(PRO_KEY, 'true')
}

export default function Home() {
  const [appName, setAppName] = useState('')
  const [category, setCategory] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [usage, setUsage] = useState<number>(() => readUsage())
  const [isPro, setIsPro] = useState<boolean>(() => readIsPro())

  const remaining = Math.max(0, FREE_LIMIT - usage)
  const limitReached = !isPro && usage >= FREE_LIMIT

  const handleScreenshotChange = (index: number, value: string) => {
    setScreenshots(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleUpgrade = () => {
    activatePro()
    setIsPro(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, category, screenshots }),
      })

      if (!res.ok) {
        const data = await res.json()
        const msg =
          typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        setError(msg)
        return
      }

      const data: GenerateResponse = await res.json()
      setResult(data)
      if (!isPro) setUsage(incrementUsage())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h1>ASO Copilot {isPro && <span style={{ fontSize: 14, color: '#4a90d9' }}>Pro</span>}</h1>

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

        <button type="submit" disabled={loading || limitReached} style={{ padding: '8px 24px' }}>
          {loading ? 'Generating…' : 'Generate'}
        </button>

        {!isPro && (
          <p style={{ marginTop: 8, fontSize: 14, color: limitReached ? 'red' : '#666' }}>
            {limitReached
              ? 'You have used all 3 free attempts.'
              : `${remaining} free attempt${remaining === 1 ? '' : 's'} remaining`}
          </p>
        )}

        {limitReached && (
          <button
            type="button"
            onClick={handleUpgrade}
            style={{ marginTop: 8, padding: '8px 24px', background: '#4a90d9', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Upgrade to Pro
          </button>
        )}
      </form>

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

          {isPro && (
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
          )}

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
