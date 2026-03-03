'use client'

import { FormEvent, useState } from 'react'
import TopNav from '@/components/TopNav'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setMessage(`Magic link flow is coming soon. (${email})`)
  }

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 440, margin: '56px auto 72px', padding: '0 16px' }}>
        <h1 style={{ marginBottom: 8, fontSize: 30 }}>Login</h1>
        <p style={{ marginBottom: 20, color: '#6b7280', lineHeight: 1.6 }}>
          Enter your email to receive a magic link. Backend auth wiring is in progress.
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
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send magic link
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
      </section>
    </main>
  )
}
