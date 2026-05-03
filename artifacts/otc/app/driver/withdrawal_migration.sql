-- withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    TEXT UNIQUE,
  user_id       TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('PKR', 'OKBOND')),
  payout_method TEXT NOT NULL,
  payout_details TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_driver     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status  ON withdrawal_requests(status);

-- prefers_ride / prefers_delivery columns on drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS prefers_ride     BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS prefers_delivery BOOLEAN NOT NULL DEFAULT FALSE;
