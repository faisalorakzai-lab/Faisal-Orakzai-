-- Migration: driver_earnings table for OTC commission/payout ledger
-- Run this in your Supabase SQL editor.

CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id text NOT NULL,
  ride_id text NOT NULL,
  total_fare numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.20,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_earnings numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash', -- 'cash' | 'wallet'
  is_cash_debt_paid boolean NOT NULL DEFAULT false,
  settled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_earnings_driver_id_idx ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS driver_earnings_ride_id_idx ON driver_earnings(ride_id);
CREATE INDEX IF NOT EXISTS driver_earnings_settled_at_idx ON driver_earnings(settled_at DESC);

-- Prevent duplicate settlements for the same ride
CREATE UNIQUE INDEX IF NOT EXISTS driver_earnings_ride_unique_idx ON driver_earnings(ride_id);

-- Enable RLS (restrict access to service role via server-side API only)
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (server uses supabaseAdmin with service role key)
CREATE POLICY "Service role full access" ON driver_earnings
  USING (true)
  WITH CHECK (true);
