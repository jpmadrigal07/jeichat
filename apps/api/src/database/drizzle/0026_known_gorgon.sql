CREATE TABLE "channel_labels" (
	"channel_id" text NOT NULL,
	"label_id" text NOT NULL,
	CONSTRAINT "channel_labels_channel_id_label_id_pk" PRIMARY KEY("channel_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_watchers" (
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "channel_watchers_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "channel_events" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"from_value" jsonb,
	"to_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"type" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"emoji" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pinned_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"pinned_by" text NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bots_user_id_unq" UNIQUE("user_id"),
	CONSTRAINT "bots_token_hash_unq" UNIQUE("token_hash")
);
--> statement-breakpoint
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
DROP INDEX "channels_workspace_id_name_unq";--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "done_ticket_archive_after_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "ticket_number" integer;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "ticket_key" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "channel_type" text DEFAULT 'channel' NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "dm_pair_key" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reply_to_id" text;--> statement-breakpoint
ALTER TABLE "channel_labels" ADD CONSTRAINT "channel_labels_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_labels" ADD CONSTRAINT "channel_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_watchers" ADD CONSTRAINT "channel_watchers_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_watchers" ADD CONSTRAINT "channel_watchers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_events" ADD CONSTRAINT "channel_events_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_events" ADD CONSTRAINT "channel_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinned_by_user_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bots" ADD CONSTRAINT "bots_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_github_repos" ADD CONSTRAINT "channel_github_repos_connected_by_user_id_user_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_installed_by_user_id_user_id_fk" FOREIGN KEY ("installed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pr_links" ADD CONSTRAINT "github_pr_links_ticket_channel_id_channels_id_fk" FOREIGN KEY ("ticket_channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_labels_label_id_idx" ON "channel_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "labels_workspace_id_idx" ON "labels" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_workspace_id_name_unq" ON "labels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "channel_watchers_user_id_idx" ON "channel_watchers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "channel_events_channel_id_created_at_idx" ON "channel_events" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_workspace_created_idx" ON "notifications" USING btree ("user_id","workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_mention_unq" ON "notifications" USING btree ("message_id","user_id") WHERE "notifications"."type" = 'mention' and "notifications"."message_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_reaction_unq" ON "notifications" USING btree ("message_id","user_id","actor_id","emoji") WHERE "notifications"."type" = 'reaction' and "notifications"."message_id" is not null and "notifications"."emoji" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "pinned_messages_channel_id_message_id_unq" ON "pinned_messages" USING btree ("channel_id","message_id");--> statement-breakpoint
CREATE INDEX "pinned_messages_channel_id_pinned_at_idx" ON "pinned_messages" USING btree ("channel_id","pinned_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reactions_message_user_emoji_unq" ON "message_reactions" USING btree ("message_id","user_id","emoji");--> statement-breakpoint
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_members_channel_id_user_id_unq" ON "channel_members" USING btree ("channel_id","user_id");--> statement-breakpoint
CREATE INDEX "channel_members_channel_id_idx" ON "channel_members" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "channel_members_user_id_idx" ON "channel_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bots_workspace_id_idx" ON "bots" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_github_repos_channel_id_unq" ON "channel_github_repos" USING btree ("channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_github_repos_workspace_owner_repo_unq" ON "channel_github_repos" USING btree ("workspace_id","owner","repo");--> statement-breakpoint
CREATE INDEX "channel_github_repos_owner_repo_idx" ON "channel_github_repos" USING btree ("owner","repo");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_workspace_id_unq" ON "github_installations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installations_installation_id_unq" ON "github_installations" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "github_installations_installation_id_idx" ON "github_installations" USING btree ("installation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_pr_links_ticket_pr_unq" ON "github_pr_links" USING btree ("ticket_channel_id","owner","repo","pr_number");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_parent_id_archived_at_idx" ON "channels" USING btree ("parent_id","archived_at");--> statement-breakpoint
CREATE INDEX "channels_done_auto_archive_idx" ON "channels" USING btree ("workspace_id","completed_at") WHERE "channels"."parent_id" is not null and "channels"."status" = 'done' and "channels"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_dm_pair_unq" ON "channels" USING btree ("workspace_id","dm_pair_key") WHERE "channels"."channel_type" = 'dm' and "channels"."dm_pair_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_parent_ticket_number_unq" ON "channels" USING btree ("parent_id","ticket_number") WHERE "channels"."parent_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_ticket_key_unq" ON "channels" USING btree ("workspace_id","ticket_key") WHERE "channels"."parent_id" is null and "channels"."ticket_key" is not null;--> statement-breakpoint
CREATE INDEX "messages_reply_to_id_idx" ON "messages" USING btree ("reply_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_id_name_unq" ON "channels" USING btree ("workspace_id","name") WHERE "channels"."parent_id" is null and "channels"."channel_type" = 'channel';