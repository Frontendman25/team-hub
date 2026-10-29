CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_one_owner_uidx"
ON "workspace_members" USING btree ("workspace_id")
WHERE "role" = 'owner';
