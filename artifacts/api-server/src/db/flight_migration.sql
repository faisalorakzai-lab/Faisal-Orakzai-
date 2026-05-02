-- ── Airlines & Global Travel Module Migration ─────────────────────────────────
-- Run this in Supabase SQL Editor

DROP TABLE IF EXISTS airline_bookings;

CREATE TABLE airline_bookings (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT        NOT NULL,
  travel_type      TEXT        NOT NULL,   -- 'domestic' | 'international'
  from_city        TEXT        NOT NULL,
  to_city          TEXT        NOT NULL,
  departure_date   TEXT        NOT NULL,   -- YYYY-MM-DD
  travel_class     TEXT        NOT NULL,   -- 'economy' | 'business' | 'first_class'
  passengers       INTEGER     NOT NULL DEFAULT 1,
  suggested_fare   INTEGER     NOT NULL,   -- PKR system-suggested price
  proposed_fare    INTEGER,                -- user counter-offer (NULL = accept suggested)
  visa_assistance  BOOLEAN     NOT NULL DEFAULT FALSE,
  status           TEXT        NOT NULL DEFAULT 'pending_approval',
  -- 'pending_approval' | 'confirmed' | 'negotiating' | 'cancelled'
  admin_note       TEXT,
  final_fare       INTEGER,               -- admin-confirmed price
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_airline_bookings_user_id ON airline_bookings(user_id);
CREATE INDEX idx_airline_bookings_status  ON airline_bookings(status);
CREATE INDEX idx_airline_bookings_type    ON airline_bookings(travel_type);
