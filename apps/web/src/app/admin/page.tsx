'use client'

import { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8787'
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

const cell: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
}

const headerCell: React.CSSProperties = {
  ...cell,
  fontWeight: 700,
  background: '#f9fafb',
  color: '#374151',
}

function pctLabel(v: number | null) {
  return v == null ? '—' : `${v}%`
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/analytics`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error('Unauthorized — check NEXT_PUBLIC_ADMIN_KEY')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ ok: boolean } & AnalyticsData>
      })
      .then((json) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main style={{ padding: 40, fontFamily: 'sans-serif', color: '#9ca3af' }}>
        Loading analytics…
      </main>
    )
  }

  if (error) {
    return (
      <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <p style={{ color: '#dc2626', fontWeight: 600 }}>Error: {error}</p>
      </main>
    )
  }

  if (!data) return null

  const { kpi, plan_distribution, hourly } = data

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 64px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 32px', color: '#111' }}>
        Admin — Funnel Analytics
      </h1>

      {/* ── KPI Cards ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#374151' }}>
          Key Metrics
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {[
            { label: 'Total Generates', value: kpi.generate_start },
            { label: 'Successes', value: kpi.generate_success },
            { label: 'Success Rate', value: pctLabel(kpi.success_rate) },
            { label: 'Limit Exceeded', value: kpi.limit_exceeded },
            { label: 'Limit Rate', value: pctLabel(kpi.limit_rate) },
            { label: 'Result Views', value: kpi.result_view },
            { label: 'Upgrade Clicks', value: kpi.upgrade_click },
            { label: 'Upgrade Rate', value: pctLabel(kpi.upgrade_rate) },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding: '16px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fafafa',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plan Distribution ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#374151' }}>
          Plan Distribution (generate_start)
        </h2>
        {plan_distribution.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>No data yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={headerCell}>User State</th>
                <th style={{ ...headerCell, textAlign: 'right' }}>Count</th>
                <th style={{ ...headerCell, textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {plan_distribution.map((row) => {
                const share = kpi.generate_start > 0
                  ? Math.round((row.count / kpi.generate_start) * 1000) / 10
                  : 0
                return (
                  <tr key={row.user_state}>
                    <td style={cell}>{row.user_state}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{row.count}</td>
                    <td style={{ ...cell, textAlign: 'right' }}>{share}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Hourly ── */}
      <section>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#374151' }}>
          Hourly generate_start (last 24 h)
        </h2>
        {hourly.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>No data in the last 24 hours.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={headerCell}>Hour (UTC)</th>
                <th style={{ ...headerCell, textAlign: 'right' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((row) => (
                <tr key={row.hour}>
                  <td style={{ ...cell, fontFamily: 'monospace' }}>{row.hour}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
