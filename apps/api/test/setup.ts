import { env } from 'cloudflare:test'
import { beforeAll } from 'vitest'
import migration from '../src/db/migrations/0001_billing_usage.sql?raw'

beforeAll(async () => {
  // D1 exec() chokes on PRAGMA and comment-only chunks.
  // Split on ';', strip comments, and run each real statement individually.
  const statements = migration
    .split(';')
    .map((s) => {
      // Remove single-line comments and trim
      return s
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--') && !line.trimStart().startsWith('PRAGMA'))
        .join('\n')
        .trim()
    })
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    await env.DB.prepare(stmt).run()
  }
})
