-- ── Step 1: Create drivers table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drivers (
  id             TEXT PRIMARY KEY,
  name           TEXT             NOT NULL,
  phone          TEXT,
  vehicle_model  TEXT             DEFAULT 'Toyota Corolla',
  plate_number   TEXT,
  lat            DOUBLE PRECISION NOT NULL,
  lng            DOUBLE PRECISION NOT NULL,
  status         TEXT             NOT NULL DEFAULT 'active',
  is_online      BOOLEAN          NOT NULL DEFAULT true,
  ride_type      TEXT             NOT NULL DEFAULT 'autonomous',
  rating         FLOAT            NOT NULL DEFAULT 4.8,
  total_rides    INTEGER          NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read drivers"
  ON public.drivers FOR SELECT TO anon, authenticated USING (true);

-- ── Step 2: Seed mock drivers across Karachi ─────────────────────────────────
INSERT INTO public.drivers
  (id, name, phone, vehicle_model, plate_number, lat, lng, status, is_online, ride_type, rating, total_rides)
VALUES
  ('drv-001','Tariq Mehmood',   '+923001234567','Honda CB150F',           'KHA-2023',24.8550,67.0085,'active',true,'community',4.9,1243),
  ('drv-002','Asad Ali Khan',   '+923002345678','Toyota Corolla 2021',    'KHI-1122',24.8650,67.0200,'active',true,'autonomous',4.8, 876),
  ('drv-003','Samiullah Baig',  '+923003456789','Honda Civic Oriel',      'KHI-0099',24.8700,66.9950,'active',true,'autonomous',5.0,2108),
  ('drv-004','Fawad Iqbal',     '+923004567890','Toyota Camry 2022',      'KHI-0456',24.8500,67.0100,'active',true,'sovereign', 4.7, 534),
  ('drv-005','Rizwan Ahmed',    '+923005678901','Yamaha YBR 125G',        'KHI-3344',24.8620,67.0030,'active',true,'community', 4.6, 899),
  ('drv-006','Usman Malik',     '+923006789012','Toyota Land Cruiser 200','KHI-7788',24.8580,67.0150,'active',true,'sovereign', 4.9, 312),
  ('drv-007','Bilal Hussain',   '+923007890123','Suzuki Alto VXR',        'KHB-4422',24.8450,67.0250,'active',true,'community', 4.5, 645),
  ('drv-008','Kamran Sheikh',   '+923008901234','Honda Accord 2020',      'KHI-9901',24.8720,67.0080,'active',true,'sovereign', 4.8, 412)
ON CONFLICT (id) DO NOTHING;

-- ── Step 3: Add driver assignment columns to ride_requests ────────────────────
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS driver_id           TEXT,
  ADD COLUMN IF NOT EXISTS driver_name         TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone        TEXT,
  ADD COLUMN IF NOT EXISTS driver_vehicle_model TEXT,
  ADD COLUMN IF NOT EXISTS driver_plate        TEXT,
  ADD COLUMN IF NOT EXISTS driver_rating       FLOAT,
  ADD COLUMN IF NOT EXISTS driver_eta          INTEGER,
  ADD COLUMN IF NOT EXISTS total_fare          INTEGER;

-- ── Step 4: Enable Supabase Realtime on ride_requests ────────────────────────
-- Run this in the Supabase Dashboard > Database > Replication
-- OR execute as SQL (requires superuser):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
