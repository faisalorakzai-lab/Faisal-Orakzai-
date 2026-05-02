-- OTC ride_requests table
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.ride_requests (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  pickup_name      TEXT          NOT NULL,
  pickup_lat       DOUBLE PRECISION NOT NULL,
  pickup_lng       DOUBLE PRECISION NOT NULL,
  dropoff_name     TEXT          NOT NULL,
  dropoff_lat      DOUBLE PRECISION NOT NULL,
  dropoff_lng      DOUBLE PRECISION NOT NULL,
  ride_type        TEXT          NOT NULL,
  ride_type_label  TEXT,
  distance_km      DOUBLE PRECISION,
  suggested_price  INTEGER,
  offered_price    INTEGER       NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'searching',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own ride requests
CREATE POLICY "Users can insert own ride requests"
  ON public.ride_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow users to read their own ride requests
CREATE POLICY "Users can read own ride requests"
  ON public.ride_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);
