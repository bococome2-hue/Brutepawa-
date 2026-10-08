CREATE TYPE "public"."chat_group_audit_event" AS ENUM('member_added', 'member_left', 'member_kicked', 'role_changed', 'group_updated');
--> statement-breakpoint
CREATE TABLE "chat_group_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"target_id" integer,
	"event" "chat_group_audit_event" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_group_audit_log_group_idx" ON "chat_group_audit_log" USING btree ("group_id");
