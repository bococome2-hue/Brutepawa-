CREATE TABLE "chat_bot_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"actor_id" integer,
	"target_user_id" integer,
	"action" text NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_bot_sanctions" (
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"warnings" integer DEFAULT 0 NOT NULL,
	"muted_until" timestamp with time zone,
	"banned" boolean DEFAULT false NOT NULL,
	"recent_messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "chat_bot_sanctions_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_bot_settings" (
	"group_id" integer PRIMARY KEY NOT NULL,
	"settings" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_bot_logs" ADD CONSTRAINT "chat_bot_logs_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_sanctions" ADD CONSTRAINT "chat_bot_sanctions_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_sanctions" ADD CONSTRAINT "chat_bot_sanctions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_bot_settings" ADD CONSTRAINT "chat_bot_settings_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_bot_logs_group_idx" ON "chat_bot_logs" USING btree ("group_id","created_at");