'use client'

import { FormEvent, useState } from 'react'
import TopNav from '@/components/TopNav'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/request-magic-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect_to: '/login/success' }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (data.ok) {
        setMessage('Check console for magic link token (dev mode)')
      } else {
        setError(data.error ?? 'Failed to send magic link')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 440, margin: '56px auto 72px', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 8, fontSize: 30 }}>Login</h1>
        <p style={{ marginBottom: 20, color: '#6b7280', lineHeight: 1.6 }}>
          Enter your email to receive a magic link.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 700 }}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              style={{
                marginTop: 6,
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              color: '#1d4ed8',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: 16,
              fontSize: 14,
              color: '#dc2626',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
