'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Breakdown, GenerateResponse } from '@aso-copilot/shared'
import { loadResult } from '@/lib/result-store'
import { logEvent } from '@/lib/logger'

// Human-readable labels for each breakdown dimension
const DIMENSION_LABELS: Record<keyof Breakdown, string> = {
  cta: 'CTA Strength',
  benefit: 'Benefit Clarity',
  clarity: 'Message Clarity',
  numeric: 'Numeric Proof',
  emotion: 'Emotional Pull',
}

// Score → colour mapping
function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  return '#dc2626'
}

function ResultContent() {
  const searchParams = useSearchParams()
  const runId = searchParams.get('id')
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setNotFound(true)
      return
    }
    const data = loadResult(runId)
    if (!data) {
      setNotFound(true)
      return
    }
    setResult(data)
    logEvent('result_view', { runId, score: data.score })
  }, [runId])

  const handleCopy = (variant: 'A' | 'B' | 'C', lines: string[]) => {
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      logEvent('copy_variant', { runId: runId ?? '', variant })
      setCopied(variant)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (notFound) {
    return (
      <main
        style={{
          maxWidth: 480,
          margin: '80px auto',
          padding: '0 20px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ marginBottom: 12 }}>Result not found</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 15 }}>
          Results are stored locally and may have been cleared. Please generate a new report.
        </p>
        <Link
          href="/try"
          style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Generate report →
        </Link>
      </main>
    )
  }

  if (!result) {
    return (
      <main style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#9ca3af' }}>
        Loading…
      </main>
    )
  }

  const scoreBg = result.score >= 80 ? '#f0fdf4' : result.score >= 60 ? '#fefce8' : '#fef2f2'
  const scoreRingColor = scoreColor(result.score)

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 64px', fontFamily: 'sans-serif' }}>
      {/* Back */}
      <p style={{ margin: '0 0 28px' }}>
        <Link href="/try" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          ← New report
        </Link>
      </p>

      {/* Score hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '36px 24px',
          background: scoreBg,
          borderRadius: 16,
          marginBottom: 32,
          border: `2px solid ${scoreRingColor}22`,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            lineHeight: 1,
            color: scoreRingColor,
            letterSpacing: '-2px',
          }}
        >
          {result.score}
        </div>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 15 }}>/ 100 ASO Score</p>
        {runId && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#d1d5db', fontFamily: 'monospace' }}>
            Run {runId.slice(0, 8)}
          </p>
        )}
      </div>

      {/* Breakdown */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>Score Breakdown</h2>
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {(Object.entries(result.breakdown) as [keyof Breakdown, number][]).map(
            ([dim, val], i) => (
              <div
                key={dim}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 48px',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none',
                  background: i % 2 === 0 ? '#fff' : '#fafafa',
                }}
              >
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                  {DIMENSION_LABELS[dim]}
                </span>
                <div
                  style={{
                    background: '#e5e7eb',
                    borderRadius: 4,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      background: val >= 16 ? '#16a34a' : val >= 12 ? '#ca8a04' : '#ef4444',
                      height: '100%',
                      width: `${(val / 20) * 100}%`,
                      borderRadius: 4,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: '#374151' }}>
                  {val}/20
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Recommendations */}
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 17, marginBottom: 14 }}>Recommendations</h2>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {result.recommendation.map((r, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* Variants */}
      <section>
        <h2 style={{ fontSize: 17, marginBottom: 14 }}>Keyword Variants</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(['A', 'B', 'C'] as const).map((v) => (
            <div
              key={v}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* Variant header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>
                  Variant {v}
                </span>
                <button
                  onClick={() => handleCopy(v, result.variants[v])}
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: copied === v ? '#16a34a' : '#2563eb',
                    background: 'transparent',
                    border: `1px solid ${copied === v ? '#16a34a' : '#93c5fd'}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {copied === v ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Variant lines */}
              <ul style={{ margin: 0, padding: '12px 16px 12px 32px' }}>
                {result.variants[v].map((item, i) => (
                  <li
                    key={i}
                    style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 2 }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA to generate another */}
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link
          href="/try"
          style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: '#f3f4f6',
            color: '#374151',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
            marginRight: 12,
          }}
        >
          Generate another →
        </Link>
        <Link
          href="/pricing"
          style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Upgrade to Pro →
        </Link>
      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#9ca3af' }}>
          Loading…
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
