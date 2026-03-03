-- 0004_role_column.sql
-- Additive-only: adds role column to user_auth_profiles.
-- SQLite ALTER TABLE ADD COLUMN is safe when a DEFAULT is provided.
-- Existing rows will get role = 'user' automatically.

ALTER TABLE user_auth_profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    CHECK(role IN ('user', 'admin'));
