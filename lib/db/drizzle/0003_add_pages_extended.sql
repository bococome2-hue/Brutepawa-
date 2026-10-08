ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "username" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "website" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "address" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT '(GMT+01:00) Afrique de l''Ouest';
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "action_button" text DEFAULT 'Aucun';
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "cover_video_url" text;
--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "role" text NOT NULL DEFAULT 'editor',
  "added_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "page_id" integer NOT NULL,
  "invited_by" integer NOT NULL,
  "invited_user_id" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "invited_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pages_username_idx" ON "pages" ("username");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "page_followers_pair_idx" ON "page_followers" ("page_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_followers_page_idx" ON "page_followers" ("page_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "page_roles_pair_idx" ON "page_roles" ("page_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_roles_page_idx" ON "page_roles" ("page_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "page_invitations_pair_idx" ON "page_invitations" ("page_id", "invited_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_invitations_page_idx" ON "page_invitations" ("page_id");
