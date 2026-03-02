'use client'

import { useRouter } from 'next/navigation'

interface Props {
  upgradeUrl?: string
  onDismiss: () => void
}

export default function LimitExceededPrompt({ upgradeUrl = '/pricing', onDismiss }: Props) {
  const router = useRouter()

  return (
    <div
      style={{
        marginTop: 16,
        padding: '16px 20px',
        background: '#fff8e1',
        border: '1px solid #f59e0b',
        borderRadius: 8,
      }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#92400e' }}>
        Free limit reached
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#78350f' }}>
        You&apos;ve used 3 free generations this month.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push(upgradeUrl)}
          style={{
            padding: '7px 18px',
            background: '#4a90d9',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Upgrade to Pro
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '7px 18px',
            background: 'transparent',
            color: '#78350f',
            border: '1px solid #f59e0b',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
