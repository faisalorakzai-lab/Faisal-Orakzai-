CREATE TABLE IF NOT EXISTS micro_investments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  ride_id TEXT NOT NULL,
  fare NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'digital_asset',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ride_requests
  ADD COLUMN IF NOT EXISTS service_mode TEXT DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS trunk_space_liters INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shared_space_enabled BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_micro_investments_user_id ON micro_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_investments_ride_id ON micro_investments(ride_id);
