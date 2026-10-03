CREATE TABLE IF NOT EXISTS "channel_watchers" (
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "channel_watchers_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_watchers" ADD CONSTRAINT "channel_watchers_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_watchers" ADD CONSTRAINT "channel_watchers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_watchers_user_id_idx" ON "channel_watchers" USING btree ("user_id");
