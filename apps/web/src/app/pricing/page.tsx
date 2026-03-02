'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    <main style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Unlock Unlimited ASO Generation</h1>

      {cancelled && (
        <div style={{ marginBottom: 20, padding: '10px 14px', background: '#f3f4f6', borderRadius: 6, fontSize: 14 }}>
          Checkout was canceled. You can upgrade anytime.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6 }}>
          <p style={{ margin: '0 0 8px', color: '#991b1b', fontSize: 14 }}>
            Could not load entitlements. Please retry.
          </p>
          <button
            onClick={refetch}
            style={{ padding: '5px 14px', fontSize: 13, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Plan comparison table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #e5e7eb' }} />
            <th style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>Free</th>
            <th style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', background: '#eff6ff' }}>Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontSize: 14 }}>Monthly generations</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: 14 }}>3 / month</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: 14, background: '#eff6ff' }}>Unlimited</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontSize: 14 }}>Score breakdown</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>✓</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', background: '#eff6ff' }}>✓</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', fontSize: 14 }}>Priority processing</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', color: '#9ca3af' }}>—</td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', textAlign: 'center', background: '#eff6ff' }}>✓</td>
          </tr>
        </tbody>
      </table>

      {/* Current plan status */}
      <div style={{ marginBottom: 20, fontSize: 14, color: '#6b7280' }}>
        Current plan:{' '}
        <strong style={{ color: '#111' }}>
          {loading ? 'Loading plan...' : (data?.plan ?? '—')}
        </strong>
      </div>

      {/* CTA */}
      {!loading && !error && data?.plan === 'pro' ? (
        <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>
          <strong style={{ color: '#166534' }}>You&apos;re on Pro plan</strong>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#166534' }}>
            Unlimited generations + priority processing are active.
          </p>
        </div>
      ) : (
        <button
          onClick={handleUpgrade}
          disabled={loading || !data?.uid}
          style={{
            padding: '10px 28px',
            background: loading || !data?.uid ? '#93c5fd' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 15,
            cursor: loading || !data?.uid ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading plan...' : 'Upgrade to Pro'}
        </button>
      )}
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading...</div>}>
      <PricingContent />
    </Suspense>
  )
}
