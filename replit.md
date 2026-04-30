# Workspace — ORAKSER (Orakzai Services)

## Overview

Corporate website for ORAKSER — Pakistan's premier intellectual property and legal services firm. Features a Midnight Gold luxury theme with full admin panel.

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
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **GitHub repo**: https://github.com/faisalorakzai-lab/OrakzaiServices

## Key Artifacts

- `artifacts/orakser` — Main corporate website (preview: `/`)
- `artifacts/api-server` — Express API server (preview: `/api`)

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

## Notes

- WhatsApp CTA links to: https://wa.me/923000091881
- HQ Address: Plot No.33/C2, Phase 2 Ext DHA, Karachi, Pakistan
- The `lib/api-spec/fix-zod-index.mjs` script fixes orval's duplicate export issue after codegen

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
