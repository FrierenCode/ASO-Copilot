import { Hono } from 'hono'
import type { AppEnv } from '../env'

const adminRouter = new Hono<AppEnv>()

adminRouter.get('/api/admin/analytics', async (c) => {
  // --- Auth ---
  const sessionUid = c.get('sessionUid')

  if (!sessionUid) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }

  const db = c.env.DB

  const profile = await db
    .prepare(`SELECT role FROM user_auth_profiles WHERE uid = ?`)
    .bind(sessionUid)
    .first<{ role: string }>()

  if (!profile || profile.role !== 'admin') {
    return c.json({ ok: false, error: 'Forbidden' }, 403)
  }

  // --- KPI counts ---
  const kpiRows = await db
    .prepare(
      `SELECT event_name, COUNT(*) as count
       FROM events
       WHERE event_name IN (
         'generate_start','generate_success','limit_exceeded',
         'result_view','upgrade_click'
       )
       GROUP BY event_name`,
    )
    .all<{ event_name: string; count: number }>()

  const kpi: Record<string, number> = {}
  for (const row of kpiRows.results) {
    kpi[row.event_name] = row.count
  }

  const starts = kpi['generate_start'] ?? 0
  const successes = kpi['generate_success'] ?? 0
  const limits = kpi['limit_exceeded'] ?? 0
  const views = kpi['result_view'] ?? 0
  const upgrades = kpi['upgrade_click'] ?? 0

  const pct = (num: number, den: number) =>
    den === 0 ? null : Math.round((num / den) * 1000) / 10

  // --- Plan distribution ---
  const planRows = await db
    .prepare(
      `SELECT user_state, COUNT(*) as count
       FROM events
       WHERE event_name = 'generate_start'
       GROUP BY user_state`,
    )
    .all<{ user_state: string; count: number }>()

  // --- Hourly (last 24 h) ---
  const hourlyRows = await db
    .prepare(
      `SELECT substr(created_at, 1, 13) as hour, COUNT(*) as count
       FROM events
       WHERE event_name = 'generate_start'
         AND created_at >= datetime('now', '-1 day')
       GROUP BY hour
       ORDER BY hour ASC`,
    )
    .all<{ hour: string; count: number }>()

  return c.json({
    ok: true,
    kpi: {
      generate_start: starts,
      generate_success: successes,
      limit_exceeded: limits,
      result_view: views,
      upgrade_click: upgrades,
      success_rate: pct(successes, starts),
      limit_rate: pct(limits, successes),
      upgrade_rate: pct(upgrades, limits),
    },
    plan_distribution: planRows.results,
    hourly: hourlyRows.results,
  })
})

export default adminRouter
