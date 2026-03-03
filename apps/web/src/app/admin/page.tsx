'use client'

import { useEffect, useState } from 'react'
import TopNav from '@/components/TopNav'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.gigigitg95.workers.dev'
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? ''

interface KPI {
  generate_start: number
  generate_success: number
  limit_exceeded: number
  result_view: number
  upgrade_click: number
  success_rate: number | null
  limit_rate: number | null
  upgrade_rate: number | null
}

interface PlanRow {
  user_state: string
  count: number
}

interface HourRow {
  hour: string
  count: number
}

interface AnalyticsData {
  kpi: KPI
  plan_distribution: PlanRow[]
  hourly: HourRow[]
}

const cellStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
}

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 700,
  background: '#f9fafb',
  color: '#374151',
}

function percentLabel(value: number | null): string {
  return value == null ? '-' : `${value}%`
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ADMIN_KEY) {
      setError('Admin key not configured')
      setErrorDetail(
        'Set NEXT_PUBLIC_ADMIN_KEY in Cloudflare Pages environment variables, then trigger a new deploy.',
      )
      setLoading(false)
      return
    }

    fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error('Unauthorized: check NEXT_PUBLIC_ADMIN_KEY matches ADMIN_SECRET')
        }
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json() as Promise<AnalyticsData>
      })
      .then((analytics) => setData(analytics))
      .catch((requestError: Error) => {
        setError(requestError.message)
        setErrorDetail(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main style={{ fontFamily: 'sans-serif', color: '#111827' }}>
      <TopNav />

      <section style={{ maxWidth: 920, margin: '30px auto 60px', padding: '0 16px' }}>
        <h1 style={{ fontSize: 24, marginBottom: 22 }}>Admin Funnel Analytics</h1>

        {loading && <p style={{ color: '#6b7280' }}>Loading analytics...</p>}

        {!loading && error && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
            }}
          >
            <p style={{ margin: 0, fontWeight: 700 }}>Unable to load admin analytics.</p>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>{error}</p>
            {errorDetail && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{errorDetail}</p>}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Key Metrics</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  { label: 'Total Generates', value: data.kpi.generate_start },
                  { label: 'Successes', value: data.kpi.generate_success },
                  { label: 'Success Rate', value: percentLabel(data.kpi.success_rate) },
                  { label: 'Limit Exceeded', value: data.kpi.limit_exceeded },
                  { label: 'Limit Rate', value: percentLabel(data.kpi.limit_rate) },
                  { label: 'Result Views', value: data.kpi.result_view },
                  { label: 'Upgrade Clicks', value: data.kpi.upgrade_click },
                  { label: 'Upgrade Rate', value: percentLabel(data.kpi.upgrade_rate) },
                ].map((item) => (
                  <article
                    key={item.label}
                    style={{
                      padding: '16px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fafafa',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{item.value}</p>
                  </article>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Plan Distribution (generate_start)</h2>
              {data.plan_distribution.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>No data yet.</p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>User State</th>
                      <th style={{ ...headerCellStyle, textAlign: 'right' }}>Count</th>
                      <th style={{ ...headerCellStyle, textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.plan_distribution.map((row) => {
                      const share =
                        data.kpi.generate_start > 0
                          ? Math.round((row.count / data.kpi.generate_start) * 1000) / 10
                          : 0

                      return (
                        <tr key={row.user_state}>
                          <td style={cellStyle}>{row.user_state}</td>
                          <td style={{ ...cellStyle, textAlign: 'right' }}>{row.count}</td>
                          <td style={{ ...cellStyle, textAlign: 'right' }}>{share}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Hourly generate_start (last 24h)</h2>
              {data.hourly.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>No data in the last 24 hours.</p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>Hour (UTC)</th>
                      <th style={{ ...headerCellStyle, textAlign: 'right' }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hourly.map((row) => (
                      <tr key={row.hour}>
                        <td style={{ ...cellStyle, fontFamily: 'monospace' }}>{row.hour}</td>
                        <td style={{ ...cellStyle, textAlign: 'right' }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
