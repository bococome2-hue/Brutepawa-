#!/bin/bash
set -e

# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Generate migration SQL from current schema (non-interactive, idempotent)
pnpm --filter @workspace/db exec drizzle-kit generate --config ./drizzle.config.ts

# 3. Managed development DB uses the current schema, not the external SQL history.
if [ "${DB_PROVIDER:-supabase}" = "replit" ]; then
  pnpm --filter @workspace/db run push
else
  pnpm --filter @workspace/db run apply-all-migrations
fi
