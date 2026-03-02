import { env } from 'cloudflare:test'
import { beforeAll } from 'vitest'
import migration0001 from '../src/db/migrations/0001_billing_usage.sql?raw'
import migration0002 from '../src/db/migrations/0002_revenue_v2_safe.sql?raw'

function runMigration(sql: string) {
  // D1 exec() chokes on PRAGMA and comment-only chunks.
  // Split on ';', strip comments, and run each real statement individually.
  return sql
    .split(';')
    .map((s) =>
      s
        .split('\n')
        .filter(
          (line) =>
            !line.trimStart().startsWith('--') && !line.trimStart().startsWith('PRAGMA'),
        )
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0)
}

beforeAll(async () => {
  for (const stmt of runMigration(migration0001)) {
    await env.DB.prepare(stmt).run()
  }
  for (const stmt of runMigration(migration0002)) {
    await env.DB.prepare(stmt).run()
  }
})
