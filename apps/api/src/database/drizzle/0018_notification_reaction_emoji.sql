ALTER TABLE "notifications" ADD COLUMN "emoji" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_reaction_unq" ON "notifications" USING btree ("message_id","user_id","actor_id","emoji") WHERE "notifications"."type" = 'reaction' and "notifications"."message_id" is not null and "notifications"."emoji" is not null;
