import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Provide test values for secrets so middleware works without .dev.vars
          bindings: {
            UID_COOKIE_SECRET: 'test-uid-cookie-secret-vitest-32ch',
            POLAR_WEBHOOK_SECRET: 'test-polar-webhook-secret-vitest',
          },
        },
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
})
