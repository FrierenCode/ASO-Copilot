'use client'

import { useRouter } from 'next/navigation'

interface Props {
  upgradeUrl?: string
  onDismiss: () => void
  /** plan from 429 response: 'anonymous' | 'free' | undefined (v1 fallback) */
  plan?: string
}

export default function LimitExceededPrompt({ upgradeUrl = '/pricing', onDismiss, plan }: Props) {
  const router = useRouter()

  const isAnonymous = plan === 'anonymous'

  const title = isAnonymous ? 'Free trial limit reached' : 'Monthly limit reached'
  const body = isAnonymous
    ? "You've used your 2 free lifetime generations. Sign up or upgrade to continue."
    : "You've used all 3 free generations this month. Upgrade to Pro for unlimited access."

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
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#92400e' }}>{title}</p>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#78350f' }}>{body}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push(upgradeUrl)}
          style={{
            padding: '7px 18px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
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
            fontSize: 14,
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
