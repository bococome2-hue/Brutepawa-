CREATE TABLE "chat_group_invite_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"created_by_id" integer NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "hide_members" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "anti_spam" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "topics_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_send_msgs" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_send_media" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_add_users" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_pin_msgs" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_mod_titles" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "perm_mod_exchange" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "charge_tokens" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "token_price" integer DEFAULT 190 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "react_mode" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_groups" ADD COLUMN "react_emojis" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_group_invite_links_code_unique" ON "chat_group_invite_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX "chat_group_invite_links_group_idx" ON "chat_group_invite_links" USING btree ("group_id");