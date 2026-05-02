-- ── Hotel & Residency Module Migration ───────────────────────────────────────
-- Run this in Supabase SQL Editor

DROP TABLE IF EXISTS hotel_bookings;
DROP TABLE IF EXISTS hotels;

-- Hotel / residency catalog
CREATE TABLE hotels (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  city             TEXT        NOT NULL,
  stars            INTEGER     NOT NULL DEFAULT 5,
  description      TEXT        NOT NULL DEFAULT '',
  cover_image_url  TEXT,
  images           JSONB       NOT NULL DEFAULT '[]',   -- array of image URLs
  starting_rate    INTEGER     NOT NULL,                -- PKR per night (cheapest room)
  room_types       JSONB       NOT NULL DEFAULT '[]',   -- array of RoomType objects
  amenities        JSONB       NOT NULL DEFAULT '[]',   -- array of amenity strings
  available        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the portfolio
INSERT INTO hotels
  (id, name, city, stars, description, cover_image_url, images, starting_rate, room_types, amenities, sort_order)
VALUES
(
  'serena-islamabad',
  'Islamabad Serena Hotel',
  'Islamabad',
  5,
  'Pakistan''s most iconic luxury retreat — nestled in the heart of the capital with impeccable Mughal-inspired architecture, lush gardens, and world-class service.',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85"
  ]',
  16000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":35000,"description":"Panoramic city views, king bed, private lounge","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":22000,"description":"Elegant interiors with premium king or twin beds","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":16000,"description":"Compact luxury for solo travelers & executives","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Spa","Restaurant","24/7 Security","Concierge","Valet"]',
  1
),
(
  'pc-lahore',
  'Pearl Continental Lahore',
  'Lahore',
  5,
  'Lahore''s crown jewel of hospitality. A landmark of elegance since 1976, offering timeless luxury with legendary banquets and breathtaking rooftop views.',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85"
  ]',
  13000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":28000,"description":"Floor-to-ceiling windows, premium amenities","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":18000,"description":"Spacious rooms with stunning skyline views","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":13000,"description":"Smart workspace with high-speed business suite","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Restaurant","24/7 Security","Business Center","Concierge"]',
  2
),
(
  'marriott-islamabad',
  'Islamabad Marriott Hotel',
  'Islamabad',
  5,
  'Diplomatic quarter''s finest — synonymous with elegance, security, and world-class dining. The preferred address of heads of state and global executives.',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85"
  ]',
  18000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":40000,"description":"Presidential-level comfort, private butler","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":25000,"description":"Diplomatic-grade privacy and luxury","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":18000,"description":"Executive studio with boardroom access","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Spa","Restaurant","24/7 Security","Business Center","Butler"]',
  3
),
(
  'avari-lahore',
  'Avari Towers Lahore',
  'Lahore',
  4,
  'Where contemporary meets classic. Avari Towers commands the Lahore skyline with sophisticated interiors, award-winning cuisine, and seamless business facilities.',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=85"
  ]',
  9000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":20000,"description":"Premium suite with exclusive lounge access","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":13000,"description":"Comfortable rooms with modern amenities","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":9000, "description":"Efficient studio for the modern executive","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Restaurant","24/7 Security","Business Center"]',
  4
),
(
  'pc-peshawar',
  'Pearl Continental Peshawar',
  'Peshawar',
  5,
  'The gateway to the Khyber — a fortress of luxury in the ancient city. Unmatched security, warm Pashtun hospitality, and contemporary five-star amenities.',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85"
  ]',
  10000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":25000,"description":"Regal suite with mountain-view terrace","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":16000,"description":"Refined comfort in the heart of the ancient city","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":10000,"description":"Focused workspace for visiting executives","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Restaurant","24/7 Security","Concierge"]',
  5
),
(
  'movenpick-karachi',
  'Mövenpick Hotel Karachi',
  'Karachi',
  5,
  'Swiss luxury on the Arabian Sea. Contemporary design, rooftop pool, and the finest Swiss-curated dining experience on Karachi''s prestigious Clifton corridor.',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85',
  '[
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&q=85",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=85",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=85"
  ]',
  15000,
  '[
    {"id":"executive-suite",  "name":"Executive Suite",  "rate":35000,"description":"Sea-view suite with Swiss butler service","max_guests":2},
    {"id":"deluxe-room",      "name":"Deluxe Room",       "rate":22000,"description":"Arabian Sea panorama from your private terrace","max_guests":2},
    {"id":"business-studio",  "name":"Business Studio",  "rate":15000,"description":"Rooftop-adjacent studio with city & sea views","max_guests":1}
  ]',
  '["Wi-Fi","Pool","Gym","Spa","Restaurant","24/7 Security","Sea View","Valet"]',
  6
)
ON CONFLICT (id) DO NOTHING;

-- Hotel booking requests
CREATE TABLE hotel_bookings (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT        NOT NULL,
  hotel_id      TEXT        NOT NULL REFERENCES hotels(id),
  room_type     TEXT        NOT NULL,
  check_in      TEXT        NOT NULL,   -- YYYY-MM-DD
  check_out     TEXT        NOT NULL,
  nights        INTEGER     NOT NULL,
  room_rate     INTEGER     NOT NULL,   -- official rate at booking time
  proposed_rate INTEGER,                -- user counter-offer (NULL = accept rate)
  total_cost    INTEGER     NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending_approval',
  -- 'pending_approval' | 'confirmed' | 'negotiating' | 'cancelled'
  admin_note    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hotel_bookings_user_id  ON hotel_bookings(user_id);
CREATE INDEX idx_hotel_bookings_status   ON hotel_bookings(status);
CREATE INDEX idx_hotel_bookings_hotel_id ON hotel_bookings(hotel_id);
