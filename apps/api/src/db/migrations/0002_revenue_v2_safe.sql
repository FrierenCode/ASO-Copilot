-- 0002_revenue_v2_safe.sql
-- Additive-only migration: safe to apply on existing production DB.
-- All changes use CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- Existing tables (users, usage_monthly, generation_requests, etc.) are unchanged.

-- ---------------------------------------------------------------------------
-- 1) user_auth_profiles: email / user_type extension (1:1 with users)
--    Separate table avoids ALTER TABLE and is 100% additive.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_auth_profiles (
  uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  email TEXT,
  email_normalized TEXT,
  user_type TEXT NOT NULL DEFAULT 'anonymous'
    CHECK(user_type IN ('anonymous','member')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auth_profiles_email_normalized
  ON user_auth_profiles(email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_auth_profiles_user_type
  ON user_auth_profiles(user_type);

-- ---------------------------------------------------------------------------
-- 2) auth_magic_links: magic link token hashes (plain token never stored)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_magic_links (
  magic_link_id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  requested_by_uid TEXT REFERENCES users(uid) ON DELETE SET NULL,
  target_uid TEXT REFERENCES users(uid) ON DELETE SET NULL,
  redirect_to TEXT,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  invalidated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email_created
  ON auth_magic_links(email_normalized, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_magic_links_expires_used
  ON auth_magic_links(expires_at, used_at);

-- ---------------------------------------------------------------------------
-- 3) sessions: session token hashes (plain token never stored)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL UNIQUE,
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_uid
  ON sessions(uid);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_revoked
  ON sessions(expires_at, revoked_at);

-- ---------------------------------------------------------------------------
-- 4) usage_lifetime: anonymous lifetime quota counter (v2 policy: limit 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_lifetime (
  uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK(used_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------------
-- 5) generation_idempotency: per-request dedup + postsuccess status tracking
--    Used by v2 gate (generation_requests is still used by v1 gate).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generation_idempotency (
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started'
    CHECK(status IN ('started','succeeded','failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (uid, idempotency_key)
);

-- ---------------------------------------------------------------------------
-- 6) Additional indexes on generation_requests for v2 analytics queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_generation_requests_uid_decision
  ON generation_requests(uid, decision);

CREATE INDEX IF NOT EXISTS idx_generation_requests_uid_created_at
  ON generation_requests(uid, created_at DESC);
