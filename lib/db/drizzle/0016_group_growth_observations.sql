CREATE TABLE "chat_group_growth_samples" (
	"group_id" integer NOT NULL,
	"sample_hour" timestamp with time zone NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"members" integer NOT NULL,
	CONSTRAINT "chat_group_growth_samples_group_id_sample_hour_pk" PRIMARY KEY("group_id","sample_hour")
);
--> statement-breakpoint
ALTER TABLE "chat_group_growth_samples" ADD CONSTRAINT "chat_group_growth_samples_group_id_chat_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_group_growth_samples_group_observed_idx" ON "chat_group_growth_samples" USING btree ("group_id","observed_at");