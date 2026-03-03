'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppLanguage, useLanguage } from '@/hooks/useLanguage'

interface TopNavProps {
  language?: AppLanguage
  onLanguageChange?: (nextLanguage: AppLanguage) => void
}

const ADMIN_LINK_ENABLED = Boolean(process.env.NEXT_PUBLIC_ADMIN_KEY)

const navLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#4b5563',
  textDecoration: 'none',
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export default function TopNav({ language, onLanguageChange }: TopNavProps) {
  const pathname = usePathname()
  const { language: storedLanguage, setLanguage: setStoredLanguage } = useLanguage()

  const activeLanguage = language ?? storedLanguage
  const setLanguage = onLanguageChange ?? setStoredLanguage

  const toggleLanguage = () => {
    setLanguage(activeLanguage === 'en' ? 'kr' : 'en')
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 800,
            fontSize: 17,
            color: '#111827',
            letterSpacing: '-0.02em',
            textDecoration: 'none',
          }}
        >
          ASO Copilot
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {ADMIN_LINK_ENABLED && (
            <Link
              href="/admin"
              style={{
                ...navLinkStyle,
                color: isActive(pathname, '/admin') ? '#111827' : navLinkStyle.color,
                fontWeight: isActive(pathname, '/admin') ? 700 : 500,
              }}
            >
              Admin
            </Link>
          )}

          <Link
            href="/pricing"
            style={{
              ...navLinkStyle,
              color: isActive(pathname, '/pricing') ? '#111827' : navLinkStyle.color,
              fontWeight: isActive(pathname, '/pricing') ? 700 : 500,
            }}
          >
            Pricing
          </Link>

          <Link
            href="/login"
            style={{
              ...navLinkStyle,
              color: isActive(pathname, '/login') ? '#111827' : navLinkStyle.color,
              fontWeight: isActive(pathname, '/login') ? 700 : 500,
            }}
          >
            Login
          </Link>

          <Link
            href="/signup"
            style={{
              ...navLinkStyle,
              color: isActive(pathname, '/signup') ? '#111827' : navLinkStyle.color,
              fontWeight: isActive(pathname, '/signup') ? 700 : 500,
            }}
          >
            Signup
          </Link>

          <button
            type="button"
            onClick={toggleLanguage}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 999,
              background: '#f9fafb',
              color: '#374151',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
            aria-label="Toggle language"
          >
            {activeLanguage === 'en' ? 'KR' : 'EN'}
          </button>
        </div>
      </div>
    </nav>
  )
}
