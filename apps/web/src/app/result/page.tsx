'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { logEvent } from '@/lib/logger'
import { loadResult } from '@/lib/result-store'
import type { Breakdown, GenerateResponse } from '@aso-copilot/shared'

const DIMENSION_LABELS: Record<keyof Breakdown, string> = {
  cta: 'CTA Strength',
  benefit: 'Benefit Clarity',
  clarity: 'Message Clarity',
  numeric: 'Numeric Proof',
  emotion: 'Emotional Pull',
}

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
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null)

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
      setCopiedVariant(variant)
      setTimeout(() => setCopiedVariant(null), 1600)
    })
  }

  if (notFound) {
    return (
      <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
        <TopNav />
        <section
          style={{
            maxWidth: 500,
            margin: '72px auto',
            padding: '0 20px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ marginBottom: 12 }}>Result not found</h1>
          <p style={{ marginBottom: 22, fontSize: 15, color: '#6b7280' }}>
            Results are stored in local browser storage and may have been cleared.
          </p>
          <Link
            href="/try"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: '#2563eb',
              borderRadius: 6,
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Generate report
          </Link>
        </section>
      </main>
    )
  }

  if (!result) {
    return (
      <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
        <TopNav />
        <section style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</section>
      </main>
    )
  }

  const scoreBackground = result.score >= 80 ? '#f0fdf4' : result.score >= 60 ? '#fefce8' : '#fef2f2'
  const scoreBorder = scoreColor(result.score)

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 720, margin: '30px auto 60px', padding: '0 16px' }}>
        <p style={{ margin: '0 0 24px' }}>
          <Link href="/try" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
            New report
          </Link>
        </p>

        <div
          style={{
            textAlign: 'center',
            padding: '34px 24px',
            background: scoreBackground,
            borderRadius: 16,
            border: `2px solid ${scoreBorder}33`,
            marginBottom: 30,
          }}
        >
          <p style={{ margin: 0, fontSize: 80, lineHeight: 1, letterSpacing: '-0.04em', fontWeight: 900, color: scoreBorder }}>
            {result.score}
          </p>
          <p style={{ marginTop: 8, fontSize: 15, color: '#6b7280' }}>/ 100 ASO Score</p>

          {result.benchmark_avg != null && (() => {
            const gap = result.score - result.benchmark_avg
            const isPositive = gap >= 0
            return (
              <p style={{ marginTop: 10, fontWeight: 700, color: isPositive ? '#15803d' : '#dc2626' }}>
                {isPositive ? `+${gap}` : gap} vs category average ({result.benchmark_avg})
              </p>
            )
          })()}

          {runId && (
            <p style={{ marginTop: 8, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
              Run {runId.slice(0, 8)}
            </p>
          )}
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Score Breakdown</h2>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {(Object.entries(result.breakdown) as [keyof Breakdown, number][]).map(([dimension, value], index) => (
              <div
                key={dimension}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr 48px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none',
                  background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{DIMENSION_LABELS[dimension]}</span>
                <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8 }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: value >= 16 ? '#16a34a' : value >= 12 ? '#ca8a04' : '#ef4444',
                      width: `${(value / 20) * 100}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{value}/20</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Recommendations</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.recommendation.map((item, index) => (
              <li key={index} style={{ marginBottom: 8, lineHeight: 1.6, color: '#374151' }}>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Keyword Variants</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(['A', 'B', 'C'] as const).map((variant) => (
              <article
                key={variant}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <strong style={{ fontSize: 14 }}>Variant {variant}</strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(variant, result.variants[variant])}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: `1px solid ${copiedVariant === variant ? '#16a34a' : '#93c5fd'}`,
                      background: '#ffffff',
                      color: copiedVariant === variant ? '#16a34a' : '#2563eb',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedVariant === variant ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <ul style={{ margin: 0, padding: '12px 14px 12px 32px' }}>
                  {result.variants[variant].map((line, index) => (
                    <li key={index} style={{ marginBottom: 4, lineHeight: 1.65, color: '#374151' }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 34, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link
            href="/try"
            style={{
              display: 'inline-block',
              padding: '10px 22px',
              borderRadius: 6,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Generate another
          </Link>
          <Link
            href="/pricing"
            style={{
              display: 'inline-block',
              padding: '10px 22px',
              borderRadius: 6,
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Upgrade to Pro
          </Link>
        </div>
      </section>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
          <TopNav />
          <section style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</section>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
