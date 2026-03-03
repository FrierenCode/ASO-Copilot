import Link from 'next/link'
import TopNav from '@/components/TopNav'

export default function LoginSuccessPage() {
  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />
      <section
        style={{
          maxWidth: 480,
          margin: '80px auto',
          padding: '0 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
        <h1 style={{ marginBottom: 12 }}>Login successful</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>You are now signed in.</p>
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
          Go to app
        </Link>
      </section>
    </main>
  )
}
