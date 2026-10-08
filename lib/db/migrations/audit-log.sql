DO $$ BEGIN
  CREATE TYPE "chat_group_audit_event" AS ENUM ('member_added','member_left','member_kicked','role_changed','group_updated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chat_group_audit_log" (
  "id" serial PRIMARY KEY,
  "group_id" integer NOT NULL,
  "actor_id" integer NOT NULL,
  "target_id" integer,
  "event" "chat_group_audit_event" NOT NULL,
  "detail" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_group_audit_log_group_idx" ON "chat_group_audit_log" ("group_id");
