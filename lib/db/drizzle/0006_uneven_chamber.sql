ALTER TABLE "chat_group_invite_links" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "type" text DEFAULT 'unlimited' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "max_uses" integer;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "uses_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "clicks_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_group_invite_links" ADD COLUMN "revoked_at" timestamp with time zone;