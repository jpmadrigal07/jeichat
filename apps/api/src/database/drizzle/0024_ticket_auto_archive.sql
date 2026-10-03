ALTER TABLE "workspaces" ADD COLUMN "done_ticket_archive_after_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channel_events" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "channels"
SET "completed_at" = "updated_at"
WHERE "parent_id" IS NOT NULL
  AND "status" = 'done'
  AND "archived_at" IS NULL
  AND "completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_done_auto_archive_idx" ON "channels" USING btree ("workspace_id","completed_at") WHERE "parent_id" IS NOT NULL AND "status" = 'done' AND "archived_at" IS NULL;
