PRAGMA foreign_keys = ON;

-- 1) Users (anonymous uid cookie is the identity key)
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY CHECK(length(uid) = 36),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 2) Plan catalog (single place for limits + future plans)
CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_code TEXT PRIMARY KEY CHECK(plan_code IN ('free','pro','premium')),
  monthly_generation_limit INTEGER,               -- NULL = unlimited
  is_enabled INTEGER NOT NULL DEFAULT 1 CHECK(is_enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO plan_catalog (plan_code, monthly_generation_limit, is_enabled)
VALUES
  ('free', 3, 1),
  ('pro', NULL, 1),
  ('premium', NULL, 0); -- reserved for future

-- 3) Polar product/price -> internal plan mapping
CREATE TABLE IF NOT EXISTS polar_product_plan_map (
  polar_product_id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL REFERENCES plan_catalog(plan_code),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 4) Billing customers (provider identity linked to uid)
CREATE TABLE IF NOT EXISTS billing_customers (
  polar_customer_id TEXT PRIMARY KEY,
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_billing_customers_uid
  ON billing_customers(uid);

-- 5) Current subscription state per Polar subscription
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  polar_subscription_id TEXT PRIMARY KEY,
  polar_customer_id TEXT NOT NULL REFERENCES billing_customers(polar_customer_id) ON DELETE CASCADE,
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES plan_catalog(plan_code),
  status TEXT NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK(cancel_at_period_end IN (0,1)),
  current_period_start TEXT,
  current_period_end TEXT,
  source_updated_at TEXT NOT NULL,               -- from provider object/event timestamp
  raw_json TEXT NOT NULL,                        -- audit/debug
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_uid_status_period
  ON billing_subscriptions(uid, status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_source_updated
  ON billing_subscriptions(source_updated_at);

-- 6) Single source of truth for request-time authorization
CREATE TABLE IF NOT EXISTS user_entitlements (
  uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES plan_catalog(plan_code),
  status TEXT NOT NULL CHECK(status IN ('active','inactive')),
  source_type TEXT NOT NULL CHECK(source_type IN ('free_default','polar_subscription')),
  source_ref TEXT,                               -- e.g., polar_subscription_id
  usage_limit_monthly INTEGER,                   -- NULL = unlimited
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- 7) Monthly usage counter (fast quota check path)
CREATE TABLE IF NOT EXISTS usage_monthly (
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  period_start TEXT NOT NULL,                    -- UTC month anchor: YYYY-MM-01T00:00:00Z
  used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (uid, period_start)
);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_period
  ON usage_monthly(period_start);

-- 8) Request-level usage audit + idempotency
CREATE TABLE IF NOT EXISTS generation_requests (
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  request_id TEXT NOT NULL,                      -- client/server UUID for idempotency
  period_start TEXT NOT NULL,
  plan_code TEXT NOT NULL REFERENCES plan_catalog(plan_code),
  decision TEXT NOT NULL CHECK(decision IN ('allowed','rejected_limit','failed')),
  counted INTEGER NOT NULL CHECK(counted IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (uid, request_id)
);
CREATE INDEX IF NOT EXISTS idx_generation_requests_uid_period
  ON generation_requests(uid, period_start);

-- 9) Webhook inbox for dedupe/replay-safe processing
CREATE TABLE IF NOT EXISTS webhook_inbox (
  provider TEXT NOT NULL CHECK(provider IN ('polar')),
  webhook_id TEXT NOT NULL,                      -- from webhook-id header (Standard Webhooks)
  provider_event_id TEXT,                        -- if payload includes stable event id
  event_type TEXT NOT NULL,
  event_created_at TEXT,
  signature_valid INTEGER NOT NULL CHECK(signature_valid IN (0,1)),
  payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('received','processing','processed','ignored','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  first_received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  processed_at TEXT,
  last_error TEXT,
  PRIMARY KEY (provider, webhook_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_event
  ON webhook_inbox(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_status
  ON webhook_inbox(status);
