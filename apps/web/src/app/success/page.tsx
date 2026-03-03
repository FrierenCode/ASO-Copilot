'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { useEntitlements } from '@/hooks/useEntitlements'

const MAX_POLLS = 5
const POLL_INTERVAL_MS = 2000

function SuccessContent() {
  const { data, loading, error, refetch } = useEntitlements()
  const searchParams = useSearchParams()
  const checkoutId = searchParams.get('checkout_id')
  const pollCount = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPro = data?.plan === 'pro'

  // Auto-poll until pro is confirmed or max attempts reached
  useEffect(() => {
    if (loading || isPro) return
    if (pollCount.current >= MAX_POLLS) return

    timerRef.current = setTimeout(() => {
      pollCount.current += 1
      refetch()
    }, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [loading, isPro, refetch])

  const handleManualRefetch = () => {
    pollCount.current = 0
    refetch()
  }

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <TopNav />
      <main style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      {/* Always show receipt confirmation */}
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 32 }}>
        {checkoutId ? `Order ref: ${checkoutId}` : 'Payment received.'}
      </p>

      {isPro ? (
        /* ── Pro confirmed ── */
        <div>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h1 style={{ marginBottom: 8 }}>Pro is active. You&apos;re all set.</h1>
          <p style={{ color: '#6b7280', marginBottom: 32 }}>
            Unlimited generations + priority processing are now active.
          </p>
          <Link
            href="/"
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
            Back to app
          </Link>
        </div>
      ) : (
        /* ── Still activating ── */
        <div>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <h1 style={{ marginBottom: 8 }}>Payment received. Activating your Pro access...</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Payment processing can take a moment.
          </p>

          {error && (
            <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 16 }}>
              {error}
            </p>
          )}

          {!loading && pollCount.current >= MAX_POLLS && (
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              Still processing. Please refresh manually or contact support.
            </p>
          )}

          <button
            onClick={handleManualRefetch}
            disabled={loading}
            style={{
              padding: '9px 22px',
              background: loading ? '#d1d5db' : '#4a90d9',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 16,
            }}
          >
            {loading ? 'Checking...' : 'Refresh status'}
          </button>

          <br />
          <Link href="/" style={{ fontSize: 13, color: '#6b7280' }}>
            Back to app
          </Link>
        </div>
      )}
      </main>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
