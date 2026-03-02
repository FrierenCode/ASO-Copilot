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
            SESSION_COOKIE_SECRET: 'test-session-cookie-secret-vitest',
            MAGIC_LINK_SECRET: 'test-magic-link-secret-vitest-32ch',
            APP_BASE_URL: 'http://localhost:8787',
            // Feature flag OFF by default; individual tests can override via custom env
            USAGE_POLICY_V2_ENABLED: 'false',
            MAGIC_LINK_TOKEN_TTL_MINUTES: '15',
          },
        },
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
})
