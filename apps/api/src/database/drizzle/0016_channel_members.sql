ALTER TABLE "channels" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_members_channel_id_user_id_unq" ON "channel_members" USING btree ("channel_id","user_id");
--> statement-breakpoint
CREATE INDEX "channel_members_channel_id_idx" ON "channel_members" USING btree ("channel_id");
--> statement-breakpoint
CREATE INDEX "channel_members_user_id_idx" ON "channel_members" USING btree ("user_id");
