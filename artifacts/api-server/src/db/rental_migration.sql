-- ── Rent-a-Car Module Migration ──────────────────────────────────────────────
-- Run this in Supabase SQL Editor

-- Premium car fleet catalog
CREATE TABLE IF NOT EXISTS cars (
  id            TEXT PRIMARY KEY,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL,  -- 'Luxury Sedan' | 'Executive SUV' | 'Elite SUV' | 'Premium Sedan' | 'Economy'
  fuel_type     TEXT        NOT NULL DEFAULT 'Petrol',
  transmission  TEXT        NOT NULL DEFAULT 'Automatic',
  seats         INTEGER     NOT NULL DEFAULT 5,
  base_rate     INTEGER     NOT NULL, -- PKR per day
  image_url     TEXT,
  features      JSONB       NOT NULL DEFAULT '[]',
  available     BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the fleet
INSERT INTO cars (id, name, category, fuel_type, transmission, seats, base_rate, image_url, features, sort_order) VALUES
(
  'land-cruiser-v8',
  'Toyota Land Cruiser V8',
  'Flagship SUV',
  'Diesel',
  'Automatic',
  8,
  45000,
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  '["Full AC", "8-Seat Capacity", "4WD", "GPS Tracking", "Leather Interior", "Sunroof", "Dash Cam", "Insurance Included"]',
  1
),
(
  'prado-tx',
  'Toyota Land Prado TX',
  'Executive SUV',
  'Petrol',
  'Automatic',
  7,
  28000,
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  '["Full AC", "7-Seat Capacity", "4WD", "GPS Tracking", "Leather Interior", "Insurance Included", "Dash Cam"]',
  2
),
(
  'fortuner-sigma',
  'Toyota Fortuner Sigma 4',
  'Premium SUV',
  'Petrol',
  'Automatic',
  7,
  22000,
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  '["Full AC", "7-Seat Capacity", "GPS Tracking", "Leather Seats", "Music System", "Insurance Included"]',
  3
),
(
  'civic-rs',
  'Honda Civic RS Turbo',
  'Premium Sedan',
  'Petrol',
  'CVT Automatic',
  5,
  12000,
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
  '["Full AC", "GPS Tracking", "Apple CarPlay", "Sunroof", "Dash Cam", "Insurance Included"]',
  4
),
(
  'corolla-altis',
  'Toyota Corolla Altis',
  'Executive Sedan',
  'Petrol',
  'Automatic',
  5,
  9000,
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  '["Full AC", "GPS Tracking", "Music System", "Insurance Included", "Dash Cam"]',
  5
),
(
  'cultus-vxl',
  'Suzuki Cultus VXL',
  'Economy Hatchback',
  'Petrol',
  'Manual',
  5,
  5500,
  'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80',
  '["Full AC", "GPS Tracking", "Insurance Included", "Fuel Efficient"]',
  6
)
ON CONFLICT (id) DO NOTHING;

-- Rental booking requests
CREATE TABLE IF NOT EXISTS rental_requests (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT        NOT NULL,
  car_id        TEXT        NOT NULL REFERENCES cars(id),
  start_date    TEXT        NOT NULL,  -- ISO date string 'YYYY-MM-DD'
  end_date      TEXT        NOT NULL,
  days          INTEGER     NOT NULL,
  base_rate     INTEGER     NOT NULL,  -- official daily rate at time of booking
  proposed_rate INTEGER,               -- user's counter-offer (nullable = accept base rate)
  total_cost    INTEGER     NOT NULL,  -- days × (proposed_rate ?? base_rate)
  status        TEXT        NOT NULL DEFAULT 'pending_approval',
  -- 'pending_approval' | 'confirmed' | 'negotiating' | 'cancelled'
  admin_note    TEXT,                  -- admin message to user on negotiate/cancel
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_requests_user_id  ON rental_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status   ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_requests_car_id   ON rental_requests(car_id);
