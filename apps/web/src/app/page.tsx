'use client'

import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { useEntitlements } from '@/hooks/useEntitlements'
import { useLanguage } from '@/hooks/useLanguage'
import { logEvent } from '@/lib/logger'

const copy = {
  en: {
    badge: 'AI-powered ASO',
    headline: 'Boost your App Store rankings',
    subhead:
      'Get an instant quality score, three keyword variant sets, and optimization tips in seconds.',
    benchmark: 'Most apps score below 65. Check where yours stands.',
    primaryCta: 'Try for free',
    ctaSub: 'No sign-up required',
    features: [
      {
        title: 'ASO Score',
        description:
          'Instant 0-100 score across CTA strength, clarity, benefit, numeric proof, and emotional pull.',
      },
      {
        title: 'Keyword Variants',
        description:
          'Three variant sets generated from your app context so you can A/B/C test quickly.',
      },
      {
        title: 'Actionable Tips',
        description:
          'Clear recommendations to improve visibility, conversion, and ranking performance.',
      },
    ],
    freeTitle: 'Free plan',
    freeSub: '3 generations / month',
    proTitle: 'Pro plan',
    proSub: 'Unlimited generations',
    upgradeLabel: 'Upgrade to Pro',
    proActive: 'Pro active',
  },
  kr: {
    badge: 'AI 기반 ASO',
    headline: '앱스토어 순위를 높이세요',
    subhead:
      '즉시 품질 점수, 3가지 키워드 변형, 실행 가능한 최적화 팁을 몇 초 안에 받아보세요.',
    benchmark: '대부분 앱의 점수는 65 미만입니다. 지금 확인해보세요.',
    primaryCta: '무료로 시작하기',
    ctaSub: '회원가입 없이 사용 가능',
    features: [
      {
        title: 'ASO 점수',
        description: 'CTA, 명확성, 효익, 수치 근거, 감성 요소를 기준으로 0-100 점수를 제공합니다.',
      },
      {
        title: '키워드 변형',
        description: '앱 정보를 바탕으로 A/B/C 테스트용 키워드 세트를 자동 생성합니다.',
      },
      {
        title: '실행 가이드',
        description: '노출과 전환 개선을 위한 구체적인 최적화 방향을 제안합니다.',
      },
    ],
    freeTitle: '무료 플랜',
    freeSub: '월 3회 생성',
    proTitle: 'Pro 플랜',
    proSub: '무제한 생성',
    upgradeLabel: 'Pro 업그레이드',
    proActive: 'Pro 사용 중',
  },
}

export default function LandingPage() {
  const { language, setLanguage } = useLanguage()
  const { data: entitlements, loading: entitlementsLoading } = useEntitlements()

  const t = copy[language]
  const isPro = entitlements?.plan === 'pro'

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav language={language} onLanguageChange={setLanguage} />

      <section
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '84px 24px 64px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            borderRadius: 999,
            background: '#eff6ff',
            color: '#1d4ed8',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {t.badge}
        </span>

        <h1
          style={{
            margin: '0 0 18px',
            fontSize: 'clamp(34px, 6vw, 54px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            fontWeight: 900,
          }}
        >
          {t.headline}
        </h1>

        <p
          style={{
            margin: '0 auto 14px',
            maxWidth: 620,
            color: '#4b5563',
            lineHeight: 1.65,
            fontSize: 17,
          }}
        >
          {t.subhead}
        </p>

        <p style={{ margin: '0 auto 28px', fontSize: 14, color: '#6b7280' }}>{t.benchmark}</p>

        <Link
          href="/try"
          style={{
            display: 'inline-block',
            padding: '13px 34px',
            borderRadius: 8,
            background: '#2563eb',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(37,99,235,0.22)',
          }}
          onClick={() => logEvent('upgrade_click', { source: 'landing_hero' })}
        >
          {t.primaryCta}
        </Link>

        <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 13 }}>{t.ctaSub}</p>
      </section>

      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 24px 72px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 18,
        }}
      >
        {t.features.map((feature) => (
          <article
            key={feature.title}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '22px 20px',
              background: '#fafafa',
            }}
          >
            <h2 style={{ margin: '0 0 10px', fontSize: 17 }}>{feature.title}</h2>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.65, fontSize: 14 }}>
              {feature.description}
            </p>
          </article>
        ))}
      </section>

      <section style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '20px 16px',
              background: '#ffffff',
            }}
          >
            <p style={{ margin: '0 0 6px', fontWeight: 800 }}>{t.freeTitle}</p>
            <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{t.freeSub}</p>
          </div>

          <div
            style={{
              border: '2px solid #2563eb',
              borderRadius: 12,
              padding: '20px 16px',
              background: '#eff6ff',
            }}
          >
            <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#1d4ed8' }}>{t.proTitle}</p>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#1d4ed8' }}>{t.proSub}</p>

            {!entitlementsLoading && isPro ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{t.proActive}</span>
            ) : (
              <Link
                href="/pricing"
                style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                onClick={() => logEvent('upgrade_click', { source: 'landing_pricing_card' })}
              >
                {t.upgradeLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
