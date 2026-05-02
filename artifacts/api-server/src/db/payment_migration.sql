-- Payment Settlement: add payment_method to ride_requests
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Transactions ledger
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  ride_id       TEXT,
  amount        INTEGER     NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('credit', 'debit')),
  payment_method TEXT       NOT NULL CHECK (payment_method IN ('cash', 'wallet')),
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions (ride_id);
