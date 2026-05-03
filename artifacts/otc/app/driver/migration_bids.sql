-- ================================================================
-- Bidding Engine Tables Migration
-- Run in your Supabase SQL Editor
-- ================================================================

-- ride_bids: user-posted ride bids with suggested fare
CREATE TABLE IF NOT EXISTS ride_bids (
  id                TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_name       TEXT NOT NULL,
  pickup_lat        DOUBLE PRECISION NOT NULL DEFAULT 0,
  pickup_lng        DOUBLE PRECISION NOT NULL DEFAULT 0,
  dropoff_name      TEXT NOT NULL,
  dropoff_lat       DOUBLE PRECISION NOT NULL DEFAULT 0,
  dropoff_lng       DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_km       NUMERIC(8,2) NOT NULL DEFAULT 0,
  suggested_fare    NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','accepted','cancelled','expired')),
  accepted_driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  accepted_fare     NUMERIC(10,2),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bid_offers: driver offers on a specific bid
CREATE TABLE IF NOT EXISTS bid_offers (
  id               TEXT PRIMARY KEY,
  bid_id           TEXT NOT NULL REFERENCES ride_bids(id) ON DELETE CASCADE,
  driver_id        TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  driver_name      TEXT NOT NULL,
  driver_phone     TEXT,
  driver_vehicle   TEXT,
  driver_plate     TEXT,
  driver_rating    NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  offered_fare     NUMERIC(10,2) NOT NULL,
  eta              INTEGER NOT NULL DEFAULT 5,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ride_bids_status ON ride_bids(status);
CREATE INDEX IF NOT EXISTS idx_ride_bids_expires ON ride_bids(expires_at);
CREATE INDEX IF NOT EXISTS idx_bid_offers_bid_id ON bid_offers(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_offers_driver ON bid_offers(driver_id);

-- Row-Level Security
ALTER TABLE ride_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_offers ENABLE ROW LEVEL SECURITY;

-- Public read access for bids (service role bypasses RLS anyway)
CREATE POLICY "Anyone can read open bids"
  ON ride_bids FOR SELECT
  USING (status = 'open');

CREATE POLICY "Users can create bids"
  ON ride_bids FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read offers"
  ON bid_offers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert offers"
  ON bid_offers FOR INSERT
  WITH CHECK (true);
