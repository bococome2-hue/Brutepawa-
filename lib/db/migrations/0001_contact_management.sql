CREATE TABLE IF NOT EXISTS "muted_conversations" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "other_user_id" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "muted_conversations_pair_unique" UNIQUE("user_id","other_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pinned_conversations" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "other_user_id" INTEGER NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "pinned_conversations_pair_unique" UNIQUE("user_id","other_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorite_contacts" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "contact_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "favorite_contacts_pair_unique" UNIQUE("user_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deleted_conversations" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "other_user_id" INTEGER NOT NULL,
  "deleted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "deleted_conversations_pair_unique" UNIQUE("user_id","other_user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "muted_convos_user_idx" ON "muted_conversations"("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pinned_convos_user_idx" ON "pinned_conversations"("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorite_contacts_user_idx" ON "favorite_contacts"("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deleted_convos_user_idx" ON "deleted_conversations"("user_id");
