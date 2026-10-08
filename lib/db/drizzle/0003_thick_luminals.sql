CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"primary_color" text DEFAULT '#22C55E' NOT NULL,
	"font_size" text DEFAULT 'medium' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"profession" text NOT NULL,
	"description" text,
	"price" numeric(15, 2),
	"currency" text DEFAULT 'XOF' NOT NULL,
	"country" text,
	"city" text,
	"rating" numeric(3, 1) DEFAULT '5.0',
	"reviews_count" integer DEFAULT 0,
	"avatar_url" text,
	"cover_color" text DEFAULT '#22C55E',
	"is_verified" boolean DEFAULT true,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hidden_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction_type" text DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"export_type" text NOT NULL,
	"file_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#22C55E' NOT NULL,
	"emoji" text DEFAULT '📢' NOT NULL,
	"cover_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"media_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"vibration_enabled" boolean DEFAULT true NOT NULL,
	"high_priority" boolean DEFAULT true NOT NULL,
	"mute_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "broadcast_message_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"seen" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"flag_url" text
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"friend_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"inviter_id" integer NOT NULL,
	"invited_id" integer,
	"invite_key" text NOT NULL,
	"method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"suggested_user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"friends_points" integer DEFAULT 0 NOT NULL,
	"followers_points" integer DEFAULT 0 NOT NULL,
	"posts_points" integer DEFAULT 0 NOT NULL,
	"engagement_points" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "badge_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "followers_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "friends_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "views_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "condition" text DEFAULT 'Neuf';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_pct" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "country_code" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_avatar_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message_count" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "music_likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "comments_disabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "audience" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "bg_color" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "mood" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tagged_user_ids" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "music_track_name" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "music_artist" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "music_url" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "music_artwork_url" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "cover_video_url" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "timezone" text DEFAULT '(GMT+01:00) Afrique de l''Ouest';--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "action_button" text DEFAULT 'Aucun';--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "mp_fav_unique" ON "marketplace_favorites" USING btree ("user_id","item_type","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hidden_posts_pair_idx" ON "hidden_posts" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_invitations_pair_idx" ON "page_invitations" USING btree ("page_id","invited_user_id");--> statement-breakpoint
CREATE INDEX "page_invitations_page_idx" ON "page_invitations" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_roles_pair_idx" ON "page_roles" USING btree ("page_id","user_id");--> statement-breakpoint
CREATE INDEX "page_roles_page_idx" ON "page_roles" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bc_member" ON "broadcast_members" USING btree ("broadcast_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_bc_members_bid" ON "broadcast_members" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "idx_bc_messages_bid" ON "broadcast_messages" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "idx_bc_messages_ts" ON "broadcast_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bc_notif" ON "broadcast_notifications" USING btree ("broadcast_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bc_receipt" ON "broadcast_message_receipts" USING btree ("message_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_code_idx" ON "countries" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_idx" ON "friendships" USING btree ("user_id","friend_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_key_idx" ON "referrals" USING btree ("invite_key");--> statement-breakpoint
CREATE INDEX "referrals_inviter_idx" ON "referrals" USING btree ("inviter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suggestions_pair_idx" ON "suggestions" USING btree ("user_id","suggested_user_id");--> statement-breakpoint
CREATE INDEX "suggestions_user_idx" ON "suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_scores_user_idx" ON "user_scores" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_followers_pair_idx" ON "page_followers" USING btree ("page_id","user_id");--> statement-breakpoint
CREATE INDEX "page_followers_page_idx" ON "page_followers" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_username_idx" ON "pages" USING btree ("username");