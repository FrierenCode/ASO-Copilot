'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TopNav from '@/components/TopNav'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

interface MeData {
  uid: string
  authenticated: boolean
  email: string | null
  plan: 'anonymous' | 'free' | 'pro'
  usage: {
    policy: string
    limit: number | null
    used: number
    remaining: number | null
    reset_at: string | null
  }
}

const PLAN_LABEL: Record<string, string> = {
  anonymous: 'Free (anonymous)',
  free: 'Free',
  pro: 'Pro',
}

const PLAN_COLOR: Record<string, string> = {
  anonymous: '#6b7280',
  free: '#2563eb',
  pro: '#7c3aed',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 16,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#9ca3af',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

export default function DashboardPage() {
  const [data, setData] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: 'include', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<MeData>
      })
      .then(setData)
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : 'Network error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main style={{ fontFamily: 'sans-serif' }}>
        <TopNav />
        <div
          style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center', color: '#6b7280' }}
        >
          Loading…
        </div>
      </main>
    )
  }

  if (fetchError) {
    return (
      <main style={{ fontFamily: 'sans-serif' }}>
        <TopNav />
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>Failed to load dashboard: {fetchError}</p>
        </div>
      </main>
    )
  }

  if (!data?.authenticated) {
    return (
      <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
        <TopNav />
        <section
          style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 26, marginBottom: 12 }}>Login required</h1>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>
            Sign in to view your plan and usage.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '10px 28px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Go to Login
          </Link>
        </section>
      </main>
    )
  }

  const { usage } = data
  const planLabel = PLAN_LABEL[data.plan] ?? data.plan
  const planColor = PLAN_COLOR[data.plan] ?? '#111827'

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 480, margin: '56px auto 80px', padding: '0 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Dashboard</h1>
        {data.email && (
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>{data.email}</p>
        )}

        {/* Plan */}
        <div style={cardStyle}>
          <div style={labelStyle}>PLAN</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: planColor }}>{planLabel}</div>
          {data.plan !== 'pro' && (
            <Link
              href="/pricing"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              Upgrade to Pro →
            </Link>
          )}
        </div>

        {/* Usage */}
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <div style={labelStyle}>USAGE</div>
          {usage.policy === 'unlimited' ? (
            <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>Unlimited</div>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {usage.used} / {usage.limit ?? '∞'}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                  used
                </span>
              </div>
              {usage.remaining !== null && (
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {usage.remaining} remaining
                  {usage.reset_at &&
                    ` · resets ${new Date(usage.reset_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Primary CTA */}
        <Link
          href="/try"
          style={{
            display: 'block',
            padding: '13px 24px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 700,
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          Go to /try →
        </Link>
      </section>
    </main>
  )
}
