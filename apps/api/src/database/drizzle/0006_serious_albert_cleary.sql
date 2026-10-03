ALTER TABLE "channels" DROP CONSTRAINT "channels_workspace_id_name_unq";--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_parent_id_idx" ON "channels" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_id_name_unq" ON "channels" USING btree ("workspace_id","name") WHERE "channels"."parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_parent_id_name_unq" ON "channels" USING btree ("parent_id","name") WHERE "channels"."parent_id" is not null;