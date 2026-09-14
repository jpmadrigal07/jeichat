ALTER TABLE "channels" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_parent_id_archived_at_idx" ON "channels" USING btree ("parent_id","archived_at");
