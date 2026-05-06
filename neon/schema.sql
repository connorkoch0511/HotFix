-- ============================================================
-- HotFix IT Helpdesk — Neon (PostgreSQL) Schema
-- Run this in the Neon SQL editor for your project
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,            -- Clerk user ID (e.g. user_abc123)
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'end_user'
                CHECK (role IN ('admin', 'technician', 'end_user')),
  department  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL
                CHECK (category IN ('hardware', 'software', 'network', 'access', 'other')),
  priority    TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_by  TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  author_id   TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  changes     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on ticket changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
