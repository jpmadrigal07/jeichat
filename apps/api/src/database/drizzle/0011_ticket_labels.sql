CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_labels" (
	"channel_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "channel_labels_channel_id_label_id_pk" PRIMARY KEY("channel_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_labels" ADD CONSTRAINT "channel_labels_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_labels" ADD CONSTRAINT "channel_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "labels_workspace_id_idx" ON "labels" USING btree ("workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "labels_workspace_id_name_unq" ON "labels" USING btree ("workspace_id","name");
--> statement-breakpoint
CREATE INDEX "channel_labels_label_id_idx" ON "channel_labels" USING btree ("label_id");
