# BrutePawa

Réseau social moderne avec marketplace, messagerie, live streaming et système de cadeaux/tokens.

## Run & Operate

- `artifacts/fblite: web` workflow — main React frontend (port 3000, served at `/`)
- `artifacts/fblite: api-server` workflow — Express API server (port 8080, proxy at `/api`)
- `artifacts/creator-pro: web` workflow — Creator Pro frontend (port 19530, served at `/creator-pro/`)
- `artifacts/brute-pawa-mobile: expo` workflow — Expo mobile app (port 22245, served at `/mobile/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — rebuild lib declarations (run after changing lib/db or lib/api-spec)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — apply current schema to Replit development DB only

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- **Main frontend (fblite)**: React 19 + Vite, wouter, TanStack Query, Tailwind CSS
- **Mobile (brute-pawa-mobile)**: Expo / React Native
- **Creator Pro**: React 19 + Vite
- **API**: Express 5, Zod validation, JWT auth (jsonwebtoken + bcryptjs)
- **DB**: PostgreSQL (Replit temporarily; Supabase disconnected) + Drizzle ORM
- **Storage**: Cloudflare R2 (object storage)
- **Video**: Cloudflare Stream (live streaming)
- **Push notifications**: Web Push (VAPID)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schemas
- `lib/api-zod/` — Zod schemas
- `lib/api-client-react/` — React Query hooks
- `lib/api-spec/` — OpenAPI spec
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — Auth, R2, Cloudflare Stream helpers
- `artifacts/fblite/src/pages/` — Main app React pages
- `artifacts/fblite/src/components/` — Shared UI components
- `artifacts/brute-pawa-mobile/app/` — Expo screens and navigation

## Required Environment Variables

All already set in Replit Secrets / env:

- `DB_PROVIDER=replit` — explicitly select Replit PostgreSQL for the temporary database
- `DATABASE_URL` — Replit-managed connection, injected separately in dev and production
- `APP_DATABASE_URL` — removed from active configuration at the user's request; only needed for an explicitly authorized return to Supabase
- `SESSION_SECRET` — JWT signing secret
- `CF_ACCOUNT_ID`, `CF_STREAM_TOKEN` — Cloudflare Stream for live video
- `CF_TURN_API_TOKEN`, `CF_TURN_KEY_ID` — Cloudflare TURN for WebRTC
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_ACCOUNT_ID` — Cloudflare R2 storage
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — Web push notifications

## Architecture decisions

- JWT auth stored in cookies/localStorage; server signs with SESSION_SECRET
- Token system: `tokenBalance` on `walletsTable`, 1 token = 5 XOF, min withdrawal = 1000 tokens
- Live streaming: SSE at `GET /api/stream/live/:id/events` polls DB every 2s
- MoneyFusion webhook uses HMAC via `MONEYFUSION_SECRET` env (open in dev if unset)
- User requested temporarily switching to Replit PostgreSQL while retaining Cloudflare services because Supabase refuses connections.
- No Supabase data transfer has been performed. Existing Supabase accounts/content are unavailable in the temporary database.
- For Replit production schema changes: use Publish, never direct DDL, startup migrations, or deployment-build migrations.
- Returning to Supabase requires explicit user approval and a data-reconciliation plan; do not silently switch providers.
- Auth tokens are scoped to the selected database and environment; old sessions must sign in again after the switch.
- The R2 bucket is shared with Supabase media: orphan cleanup is disabled while Replit is selected. Do not re-enable without reconciling all media references.

## User Preferences

- **DB temporaire**: Utiliser la base Replit et conserver Cloudflare R2/Stream. Retirer la connexion Supabase sans supprimer le projet Supabase ni ses données.
- **Push to GitHub après chaque finition** : `git push origin main` (remote déjà configuré avec GITHUB_PERSONAL_ACCESS_TOKEN)

## Gotchas

- After changing `lib/db` or `lib/api-spec`, always run `pnpm run typecheck:libs` before leaf package checks
- `pnpm install` needs `tar` override (`^7.5.22`) in `pnpm-workspace.yaml` — Replit firewall blocks `tar@7.5.16`
- Messages.tsx exceeds Babel's 500KB deopt threshold — expected, not an error
- AWS SDK v3 warns about Node.js <22 — harmless, app works on Node 20
