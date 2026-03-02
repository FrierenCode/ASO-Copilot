'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEntitlements } from '@/hooks/useEntitlements'
import { logEvent } from '@/lib/logger'

const copy = {
  en: {
    badge: 'AI-powered ASO',
    headline: 'Boost Your\nApp Store Rankings',
    subhead:
      'Get an instant quality score, three keyword variant sets, and actionable optimization tips — in seconds.',
    cta: 'Try for free →',
    ctaSub: 'No sign-up required',
    features: [
      {
        icon: '📊',
        title: 'ASO Score',
        desc: 'Instant 0–100 quality score across CTA, clarity, benefit, numeric proof, and emotional resonance.',
      },
      {
        icon: '🔑',
        title: 'Keyword Variants',
        desc: 'Three A/B/C keyword variant sets generated from your app context, ready to test.',
      },
      {
        icon: '💡',
        title: 'Recommendations',
        desc: 'Actionable tips per dimension to improve visibility, conversion, and store ranking.',
      },
    ],
    planFree: 'Free plan',
    planPro: 'Pro plan',
    planFreeSub: '3 generations / month',
    planProSub: 'Unlimited generations',
    upgrade: 'Upgrade to Pro →',
    remaining: (n: number) => `${n} free attempt${n === 1 ? '' : 's'} remaining this month`,
    usedAll: "You've used all free attempts this month.",
    benchmark: 'Most apps score below 65. See where yours stands.',
  },
  ko: {
    badge: 'AI 기반 ASO',
    headline: '앱스토어 순위를\n높이세요',
    subhead:
      'AI로 즉시 ASO 품질 점수, 세 가지 키워드 변형, 최적화 제안을 받아보세요 — 몇 초면 충분합니다.',
    cta: '무료로 시작하기 →',
    ctaSub: '회원가입 불필요',
    features: [
      {
        icon: '📊',
        title: 'ASO 점수',
        desc: 'CTA·명확성·혜택·수치 근거·감성 5개 차원에서 즉시 0–100 점수를 확인하세요.',
      },
      {
        icon: '🔑',
        title: '키워드 변형',
        desc: '앱 정보를 기반으로 A/B/C 세 가지 키워드 변형 세트를 생성해 바로 테스트하세요.',
      },
      {
        icon: '💡',
        title: '최적화 제안',
        desc: '차원별 실행 가능한 팁으로 노출과 전환율, 스토어 순위를 높이세요.',
      },
    ],
    planFree: '무료 플랜',
    planPro: 'Pro 플랜',
    planFreeSub: '월 3회 생성',
    planProSub: '무제한 생성',
    upgrade: 'Pro로 업그레이드 →',
    remaining: (n: number) => `이번 달 남은 무료 시도: ${n}회`,
    usedAll: '이번 달 무료 시도를 모두 사용했습니다.',
    benchmark: '대부분의 앱은 65점 이하입니다. 내 앱은 몇 점일까요?',
  },
}

type Lang = 'en' | 'ko'

export default function Landing() {
  const [lang, setLang] = useState<Lang>('en')
  const { data: entitlements, loading: entLoading } = useEntitlements()

  const t = copy[lang]
  const isPro = entitlements?.plan === 'pro'

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111' }}>
      {/* ── Nav ── */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 10,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
          ASO Copilot{' '}
          {!entLoading && isPro && (
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Pro</span>
          )}
        </span>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* KR / EN toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ko' : 'en')}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: 'transparent',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            {lang === 'en' ? '한국어' : 'English'}
          </button>

          {!isPro && (
            <Link
              href="/pricing"
              style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}
            >
              {lang === 'en' ? 'Pricing' : '요금제'}
            </Link>
          )}

          <Link
            href="/try"
            style={{
              padding: '7px 18px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
            }}
            onClick={() => logEvent('upgrade_click', { source: 'nav' })}
          >
            {lang === 'en' ? 'Try now' : '시작하기'}
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '80px 24px 64px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: '#eff6ff',
            color: '#2563eb',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          {t.badge}
        </span>

        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1px',
            margin: '0 0 20px',
            whiteSpace: 'pre-line',
          }}
        >
          {t.headline}
        </h1>

        <p
          style={{
            fontSize: 18,
            color: '#6b7280',
            lineHeight: 1.6,
            maxWidth: 560,
            margin: '0 auto 16px',
          }}
        >
          {t.subhead}
        </p>

        <p
          style={{
            fontSize: 14,
            color: '#6b7280',
            margin: '0 auto 28px',
          }}
        >
          {t.benchmark}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <Link
            href="/try"
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
            }}
            onClick={() => logEvent('upgrade_click', { source: 'hero_cta' })}
          >
            {t.cta}
          </Link>
        </div>

        <p style={{ marginTop: 12, fontSize: 13, color: '#9ca3af' }}>{t.ctaSub}</p>
      </section>

      {/* ── Features ── */}
      <section
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '0 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}
      >
        {t.features.map((f) => (
          <div
            key={f.title}
            style={{
              padding: '28px 24px',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{f.title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Pricing comparison ── */}
      <section
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* Free card */}
          <div
            style={{
              padding: '24px 20px',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{t.planFree}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>{t.planFreeSub}</p>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>—</p>
          </div>

          {/* Pro card */}
          <div
            style={{
              padding: '24px 20px',
              border: '2px solid #2563eb',
              borderRadius: 12,
              background: '#eff6ff',
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1d4ed8' }}>{t.planPro}</p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#3b82f6' }}>{t.planProSub}</p>
            {!isPro && (
              <Link
                href="/pricing"
                style={{
                  fontSize: 13,
                  color: '#2563eb',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
                onClick={() => logEvent('upgrade_click', { source: 'pricing_card' })}
              >
                {t.upgrade}
              </Link>
            )}
            {isPro && (
              <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Active</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: 13,
          color: '#9ca3af',
        }}
      >
        ASO Copilot © {new Date().getFullYear()}
      </footer>
    </main>
  )
}
