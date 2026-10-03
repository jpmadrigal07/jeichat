ALTER TABLE "channels" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "priority" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;