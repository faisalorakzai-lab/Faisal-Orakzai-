-- ── Support Tickets Migration ──────────────────────────────────────────────────
-- Run in Supabase SQL Editor

DROP TABLE IF EXISTS support_tickets;

CREATE TABLE support_tickets (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'general',
  -- 'ride_issue' | 'payment' | 'okbond' | 'general' | 'marcus_escalation'
  subject     TEXT        NOT NULL,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'open',
  -- 'open' | 'in_progress' | 'resolved'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status  ON support_tickets(status);
