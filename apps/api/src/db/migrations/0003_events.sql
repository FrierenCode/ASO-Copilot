-- 0003_events.sql
-- Funnel event log. Additive-only migration.

CREATE TABLE IF NOT EXISTS events (
  event_id    TEXT PRIMARY KEY,
  event_name  TEXT NOT NULL,
  user_state  TEXT NOT NULL,
  route       TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  payload_json TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events(created_at DESC);
