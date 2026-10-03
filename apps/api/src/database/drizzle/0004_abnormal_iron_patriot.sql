CREATE TABLE "workspace_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#99aab5' NOT NULL,
	"permissions" text DEFAULT '[]' NOT NULL,
	"is_administrator" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_role_members" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "workspace_role_members_role_id_user_id_unq" UNIQUE("role_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "role_channel_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"allow_permissions" text DEFAULT '[]' NOT NULL,
	"deny_permissions" text DEFAULT '[]' NOT NULL,
	CONSTRAINT "role_channel_permissions_role_id_channel_id_unq" UNIQUE("role_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "workspace_roles" ADD CONSTRAINT "workspace_roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_role_members" ADD CONSTRAINT "workspace_role_members_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_role_members" ADD CONSTRAINT "workspace_role_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_channel_permissions" ADD CONSTRAINT "role_channel_permissions_role_id_workspace_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."workspace_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_channel_permissions" ADD CONSTRAINT "role_channel_permissions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_roles_workspace_id_idx" ON "workspace_roles" USING btree ("workspace_id");