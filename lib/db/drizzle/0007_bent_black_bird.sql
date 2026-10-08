CREATE TABLE "poll_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_id" integer NOT NULL,
	"option_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" integer NOT NULL,
	"question" text NOT NULL,
	"multiple_choice" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "poll_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_follows_poll_user_unique" ON "poll_follows" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_follows_user_idx" ON "poll_follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "poll_options_poll_position_idx" ON "poll_options" USING btree ("poll_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_views_poll_user_unique" ON "poll_views" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_views_poll_idx" ON "poll_views" USING btree ("poll_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_votes_poll_option_user_unique" ON "poll_votes" USING btree ("poll_id","option_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_user_idx" ON "poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_option_idx" ON "poll_votes" USING btree ("poll_id","option_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_voted_at_idx" ON "poll_votes" USING btree ("poll_id","voted_at","id");--> statement-breakpoint
CREATE INDEX "polls_creator_idx" ON "polls" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "polls_expires_idx" ON "polls" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "messages_poll_idx" ON "messages" USING btree ("poll_id");