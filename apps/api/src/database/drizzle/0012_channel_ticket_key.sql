ALTER TABLE "channels" ADD COLUMN "ticket_key" text;--> statement-breakpoint
UPDATE "channels"
SET "ticket_key" = CASE
	WHEN length(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')) >= 3
		THEN upper(substr(regexp_replace(name, '[^A-Za-z0-9]', '', 'g'), 1, 3))
	WHEN length(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')) >= 2
		THEN upper(regexp_replace(name, '[^A-Za-z0-9]', '', 'g'))
	WHEN length(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')) = 1
		THEN rpad(upper(regexp_replace(name, '[^A-Za-z0-9]', '', 'g')), 3, 'X')
	ELSE 'TCK'
END
WHERE "parent_id" IS NULL;--> statement-breakpoint
WITH ranked AS (
	SELECT
		id,
		ticket_key,
		row_number() OVER (
			PARTITION BY workspace_id, ticket_key
			ORDER BY created_at, id
		) AS rn
	FROM "channels"
	WHERE "parent_id" IS NULL AND "ticket_key" IS NOT NULL
)
UPDATE "channels" AS c
SET "ticket_key" = left(r.ticket_key, 4) || r.rn::text
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_ticket_key_unq"
	ON "channels" USING btree ("workspace_id","ticket_key")
	WHERE "parent_id" IS NULL AND "ticket_key" IS NOT NULL;
