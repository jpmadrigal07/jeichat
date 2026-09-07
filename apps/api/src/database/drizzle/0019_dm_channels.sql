ALTER TABLE "channels" ADD COLUMN "channel_type" text DEFAULT 'channel' NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "dm_pair_key" text;--> statement-breakpoint
DROP INDEX IF EXISTS "channels_workspace_id_name_unq";--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_id_name_unq" ON "channels" ("workspace_id","name") WHERE "parent_id" IS NULL AND "channel_type" = 'channel';--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_dm_pair_unq" ON "channels" ("workspace_id","dm_pair_key") WHERE "channel_type" = 'dm' AND "dm_pair_key" IS NOT NULL;
