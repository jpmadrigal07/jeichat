ALTER TABLE "channels" ADD COLUMN "ticket_number" integer;--> statement-breakpoint
WITH numbered AS (
	SELECT
		id,
		row_number() OVER (
			PARTITION BY workspace_id
			ORDER BY created_at, id
		) AS ticket_number
	FROM "channels"
	WHERE parent_id IS NOT NULL
)
UPDATE "channels"
SET "ticket_number" = numbered.ticket_number
FROM numbered
WHERE "channels".id = numbered.id;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_ticket_number_unq" ON "channels" USING btree ("workspace_id","ticket_number") WHERE "parent_id" IS NOT NULL;