DROP INDEX IF EXISTS "channels_workspace_ticket_number_unq";--> statement-breakpoint
WITH numbered AS (
	SELECT
		id,
		row_number() OVER (
			PARTITION BY parent_id
			ORDER BY ticket_number, created_at, id
		) AS ticket_number
	FROM "channels"
	WHERE parent_id IS NOT NULL
)
UPDATE "channels"
SET "ticket_number" = numbered.ticket_number
FROM numbered
WHERE "channels".id = numbered.id;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_parent_ticket_number_unq" ON "channels" USING btree ("parent_id","ticket_number") WHERE "parent_id" IS NOT NULL;
