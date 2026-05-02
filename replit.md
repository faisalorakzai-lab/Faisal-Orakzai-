# Workspace — ORAKSER & OTC Super App

## Overview

Two products in one monorepo:
1. **ORAKSER** — Corporate website for Orakzai Services (intellectual property & legal). Midnight Gold luxury theme, full admin panel.
2. **OTC Super App** — Expo/React Native mobile Super App for Orakzai Transport Corporation. Phone/OTP auth, OTC Coins wallet, referral engine, Super App grid (Ride, Delivery, Rent-a-Car, Hotel). Full Sovereign Mobility Ecosystem with real-time integrations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Web frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Mobile**: Expo SDK 54 + Expo Router v6 + React Native
- **GitHub repos**: https://github.com/faisalorakzai-lab/OrakzaiServices, https://github.com/faisalorakzai-lab/otc

## Key Artifacts

- `artifacts/orakser` — ORAKSER corporate website (preview: `/`)
- `artifacts/api-server` — Express API server (preview: `/api`)
- `artifacts/otc` — OTC Super App (Expo mobile, preview: `/otc/`)

## Pages

- `/` — Corporate landing page (Hero, Services Grid, Trust Section, Regional Network, Contact Form)
- `/admin` — Admin panel (manage services, offices, view contact submissions)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Schema

- `services` — Service offerings with name, description, price, icon, category, featured
- `offices` — Office locations with city, address, phone, isHeadquarters, lat, lng
- `contacts` — Contact form submissions

## API Routes

- `GET/POST /api/services` — List and create services
- `GET/PUT/DELETE /api/services/:id` — Get, update, delete a service
- `GET/POST /api/offices` — List and create offices
- `PUT/DELETE /api/offices/:id` — Update, delete an office
- `POST /api/contact` — Submit contact form
- `GET /api/contact/submissions` — List all contact submissions (admin)
- `POST /api/otc/parse-voice` — Gemini AI NLP for ride booking voice commands
- `GET /api/otc/health` — OTC integration health check (Supabase, Gemini status)

## OTC Super App Details

- **Auth**: Phone + OTP (demo OTP: 123456). JWT (header.payload.sig base64) stored in AsyncStorage.
- **OTC Wallet**: OTC Coins currency. New users get 10 welcome coins. Synced to Supabase (`otc_wallet_data` table).
- **Referral Engine**: Referrer earns 5 OTC Coins, new user earns 10 on signup.
- **Service Grid**: Ride, Delivery, Rent-a-Car (active); Hotel (coming soon).
- **Character Credits**: Reputation tier system (Pioneer/Elite/Sovereign/Apex). Synced to Supabase (`otc_character_profiles` table).
- **Design**: Midnight Gold — #050505 bg, #FFD700 accents, glassmorphic cards.

## OTC Sovereign Mobility Ecosystem

- **Ride booking screen**: `app/services/ride.tsx` — Mapbox dark map background, class selector, dynamic pricing, driver search.
- **Sovereign Mode screen**: `app/services/sovereign-mode.tsx` — In-ride interface with Ably real-time channel, live driver heartbeat events, elapsed timer, tabs (Status/Wallet/Updates/Proof).
- **Key components**: `SovereignMap` (Mapbox static image + gold animation overlay), `VoiceCommandPanel` (Gemini AI NLP with local fallback), `VehicleClassSelector`, `DriverEquityCard`, `ProofOfRideCard`.
- **Key contexts**: `CharacterContext` (CC tier + Supabase sync), `WalletContext` (OTC Coins + Supabase sync), `RideContext` (ride state machine), `AuthContext` (phone OTP).

## Live Integrations (OTC)

| Service | Key | Status | Usage |
|---------|-----|--------|-------|
| Mapbox | `MAPBOX_TOKEN` | Active | Static dark map tiles in SovereignMap |
| Ably | `ABLY_API_KEY` | Active | Real-time driver channel in sovereign-mode |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Active | Wallet + CharacterProfile persistence |
| Gemini | `GEMINI_API_KEY` | Server-only (not exposed to client) | Reserved for future server-side NLP; voice commands use local keyword parsing |

### Supabase Tables Required

Run these in your Supabase SQL editor to enable cloud persistence:
```sql
CREATE TABLE IF NOT EXISTS otc_character_profiles (
  user_id TEXT PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 12,
  tier TEXT NOT NULL DEFAULT 'Pioneer',
  total_rides INTEGER NOT NULL DEFAULT 0,
  avg_rating FLOAT NOT NULL DEFAULT 5.0,
  equity_points INTEGER NOT NULL DEFAULT 0,
  discount_rate FLOAT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otc_wallet_data (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  transactions JSONB NOT NULL DEFAULT '[]',
  has_claimed_welcome BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Expo Config (app.config.js)

Env vars exposed to the Expo app via `Constants.expoConfig.extra`:
- `extra.supabaseUrl` — `SUPABASE_URL`
- `extra.supabaseAnonKey` — `SUPABASE_ANON_KEY`
- `extra.mapboxToken` — `MAPBOX_TOKEN`
- `extra.ablyApiKey` — `ABLY_API_KEY`

## Notes

- WhatsApp CTA links to: https://wa.me/923000091881
- HQ Address: Plot No.33/C2, Phase 2 Ext DHA, Karachi, Pakistan
- The `lib/api-spec/fix-zod-index.mjs` script fixes orval's duplicate export issue after codegen
- Gemini NLP fallback: if Gemini quota exceeded, VoiceCommandPanel falls back to keyword-based local parsing seamlessly

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
