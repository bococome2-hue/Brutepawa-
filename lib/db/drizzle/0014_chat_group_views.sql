CREATE TABLE "chat_group_views" (
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"visit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_group_views_group_id_user_id_visit_id_pk" PRIMARY KEY("group_id","user_id","visit_id")
);
--> statement-breakpoint
ALTER TABLE "chat_group_views" ADD CONSTRAINT "chat_group_views_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_group_views" ADD CONSTRAINT "chat_group_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_group_views_group_created_idx" ON "chat_group_views" USING btree ("group_id","created_at");