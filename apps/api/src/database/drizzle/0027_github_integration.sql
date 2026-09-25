CREATE TABLE "channel_github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"installation_id" bigint NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"connected_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"installation_id" bigint NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"installed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_pr_links" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_channel_id" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"pr_number" integer NOT NULL,
	"head_ref" text NOT NULL,
	"html_url" text NOT NULL,
	"state" text NOT NULL,
	"merged" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_connected_by_user_id_user_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_installed_by_user_id_user_id_fk" FOREIGN KEY ("installed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_pr_links" ADD CONSTRAINT "github_pr_links_ticket_channel_id_channels_id_fk" FOREIGN KEY ("ticket_channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_github_repos_channel_id_unq" ON "channel_github_repos" USING btree ("channel_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "channel_github_repos_workspace_owner_repo_unq" ON "channel_github_repos" USING btree ("workspace_id","owner","repo");
--> statement-breakpoint
CREATE INDEX "channel_github_repos_owner_repo_idx" ON "channel_github_repos" USING btree ("owner","repo");
--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_workspace_id_unq" ON "github_installations" USING btree ("workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_installation_id_unq" ON "github_installations" USING btree ("installation_id");
--> statement-breakpoint
CREATE INDEX "github_installations_installation_id_idx" ON "github_installations" USING btree ("installation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "github_pr_links_ticket_pr_unq" ON "github_pr_links" USING btree ("ticket_channel_id","owner","repo","pr_number");
