'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TopNav from '@/components/TopNav'
import { useEntitlements } from '@/hooks/useEntitlements'

const POLAR_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
  'https://buy.polar.sh/polar_cl_0fvC8twmmF1M3OcIl6wJ2JREHYcxS5Og0C6qb1ouo74'

function PricingContent() {
  const { data, loading, error, refetch } = useEntitlements()
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('checkout') === 'cancelled'

  const handleUpgrade = () => {
    if (!data?.uid) return
    const checkout = new URL(POLAR_CHECKOUT_URL)
    checkout.searchParams.set('reference_id', data.uid)
    window.location.href = checkout.toString()
  }

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 580, margin: '44px auto 64px', padding: '0 20px' }}>
        <h1 style={{ marginBottom: 8 }}>Unlock Unlimited ASO Generation</h1>

        {cancelled && (
          <div
            style={{
              marginBottom: 20,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 14,
              background: '#f3f4f6',
            }}
          >
            Checkout was canceled. You can upgrade any time.
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 20,
              padding: '12px 16px',
              borderRadius: 6,
              background: '#fef2f2',
              border: '1px solid #fca5a5',
            }}
          >
            <p style={{ margin: '0 0 8px', color: '#991b1b', fontSize: 14 }}>
              Could not load entitlements. Please retry.
            </p>
            <button
              type="button"
              onClick={refetch}
              style={{ padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
          <thead>
            <tr>
              <th style={headerCell} />
              <th style={headerCell}>Free</th>
              <th style={{ ...headerCell, background: '#eff6ff' }}>Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={bodyCell}>Monthly generations</td>
              <td style={bodyCellCenter}>3 / month</td>
              <td style={{ ...bodyCellCenter, background: '#eff6ff' }}>Unlimited</td>
            </tr>
            <tr>
              <td style={bodyCell}>Score breakdown</td>
              <td style={bodyCellCenter}>Basic</td>
              <td style={{ ...bodyCellCenter, background: '#eff6ff' }}>Advanced</td>
            </tr>
            <tr>
              <td style={bodyCell}>Priority processing</td>
              <td style={bodyCellCenter}>No</td>
              <td style={{ ...bodyCellCenter, background: '#eff6ff' }}>Yes</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: 20, fontSize: 14, color: '#6b7280' }}>
          Current plan:{' '}
          <strong style={{ color: '#111827' }}>
            {loading ? 'Loading plan...' : (data?.plan ?? 'free')}
          </strong>
        </div>

        {!loading && !error && data?.plan === 'pro' ? (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 6,
              border: '1px solid #86efac',
              background: '#f0fdf4',
              color: '#166534',
            }}
          >
            <strong>You are on Pro plan.</strong>
            <p style={{ marginTop: 4, fontSize: 14 }}>
              Unlimited generations and priority processing are active.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading || !data?.uid}
            style={{
              padding: '10px 28px',
              borderRadius: 6,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              background: loading || !data?.uid ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              cursor: loading || !data?.uid ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Loading plan...' : 'Upgrade to Pro'}
          </button>
        )}
      </section>
    </main>
  )
}

const headerCell: React.CSSProperties = {
  textAlign: 'center',
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
  fontSize: 14,
}

const bodyCell: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
  fontSize: 14,
}

const bodyCellCenter: React.CSSProperties = {
  ...bodyCell,
  textAlign: 'center',
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
          <TopNav />
          <section style={{ padding: 40, textAlign: 'center' }}>Loading...</section>
        </main>
      }
    >
      <PricingContent />
    </Suspense>
  )
}
