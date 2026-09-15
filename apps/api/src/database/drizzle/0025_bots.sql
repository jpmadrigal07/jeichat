CREATE TABLE "bots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"owner_id" text,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "bots_user_id_unq" ON "bots" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bots_token_hash_unq" ON "bots" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "bots_workspace_id_idx" ON "bots" USING btree ("workspace_id");
