# Workspace — ORAKSER & OTC Super App

## Overview

Two products in one monorepo:
1. **ORAKSER** — Corporate website for Orakzai Services (intellectual property & legal). Midnight Gold luxury theme, full admin panel.
2. **OTC Super App** — Expo/React Native mobile Super App for Orakzai Transport Corporation. Phone/OTP auth, OTC Coins wallet, referral engine, Super App grid (Ride, Delivery, Rent-a-Car, Hotel).

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

## OTC Super App Details

- **Auth**: Phone + OTP (demo OTP: 1234). JWT stored in AsyncStorage.
- **OTC Wallet**: OTC Coins currency. New users get 10 welcome coins.
- **Referral Engine**: Referrer earns 5 OTC Coins, new user earns 10 on signup.
- **Service Grid**: Ride, Delivery, Rent-a-Car (active); Hotel (coming soon).
- **State**: AsyncStorage-based persistence. No backend required for mobile features.
- **Design**: Midnight Gold — #050505 bg, #FFD700 accents, glassmorphic cards.
- **Files**: `contexts/AuthContext.tsx`, `contexts/WalletContext.tsx`, `constants/colors.ts`

## Notes

- WhatsApp CTA links to: https://wa.me/923000091881
- HQ Address: Plot No.33/C2, Phase 2 Ext DHA, Karachi, Pakistan
- The `lib/api-spec/fix-zod-index.mjs` script fixes orval's duplicate export issue after codegen

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
