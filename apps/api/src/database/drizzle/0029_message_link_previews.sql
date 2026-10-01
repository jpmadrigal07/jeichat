CREATE TABLE "message_link_previews" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text,
	"description" text,
	"site_name" text,
	"image_url" text,
	"image_width" integer,
	"image_height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_link_previews" ADD CONSTRAINT "message_link_previews_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_link_previews_message_url_unq" ON "message_link_previews" USING btree ("message_id","url");--> statement-breakpoint
CREATE INDEX "message_link_previews_message_id_idx" ON "message_link_previews" USING btree ("message_id");