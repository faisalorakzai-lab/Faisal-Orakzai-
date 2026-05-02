-- ── Referral & Milestone System Migration ────────────────────────────────────
-- Run this in Supabase SQL Editor

-- Extend profiles with referral columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code       TEXT,
  ADD COLUMN IF NOT EXISTS referred_by         TEXT,
  ADD COLUMN IF NOT EXISTS successful_referrals INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_ride_done      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS milestone_claimed    BOOLEAN DEFAULT FALSE;

-- Index for fast lookup by referral code
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by   ON profiles(referred_by);

-- Device registry: anti-spam — one device_id can only register N accounts
CREATE TABLE IF NOT EXISTS device_registry (
  device_id  TEXT        NOT NULL,
  user_id    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (device_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_device_registry_device_id ON device_registry(device_id);
