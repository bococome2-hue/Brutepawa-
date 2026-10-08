CREATE TABLE "chat_bot_metrics" (
	"group_id" integer NOT NULL,
	"day" date NOT NULL,
	"analyzed" integer DEFAULT 0 NOT NULL,
	"blocked" integer DEFAULT 0 NOT NULL,
	"spam" integer DEFAULT 0 NOT NULL,
	"links" integer DEFAULT 0 NOT NULL,
	"tracking_since" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_bot_metrics_group_id_day_pk" PRIMARY KEY("group_id","day")
);
--> statement-breakpoint
ALTER TABLE "chat_bot_logs" ADD COLUMN "message_id" integer;--> statement-breakpoint
ALTER TABLE "chat_bot_logs" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_bot_logs" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "chat_bot_logs" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_bot_sanctions" ADD COLUMN "verification_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_bot_metrics" ADD CONSTRAINT "chat_bot_metrics_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_bot_logs_request_idx" ON "chat_bot_logs" USING btree ("group_id","request_id");