CREATE TABLE "chat_presence_sessions" (
	"user_id" integer NOT NULL,
	"session_id" uuid NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"typing_group_id" integer,
	"typing_until" timestamp with time zone,
	CONSTRAINT "chat_presence_sessions_user_id_session_id_pk" PRIMARY KEY("user_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "chat_presence_sessions" ADD CONSTRAINT "chat_presence_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_presence_sessions" ADD CONSTRAINT "chat_presence_sessions_typing_group_id_chat_groups_id_fk" FOREIGN KEY ("typing_group_id") REFERENCES "public"."chat_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_presence_last_seen_idx" ON "chat_presence_sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "chat_presence_typing_group_idx" ON "chat_presence_sessions" USING btree ("typing_group_id");