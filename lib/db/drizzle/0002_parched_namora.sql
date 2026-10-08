CREATE TABLE "user_hidden_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"hider_id" integer NOT NULL,
	"hidden_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_delivered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_reports" ADD COLUMN "description" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_hidden_profiles_pair_idx" ON "user_hidden_profiles" USING btree ("hider_id","hidden_id");