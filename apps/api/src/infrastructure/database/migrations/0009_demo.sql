ALTER TABLE "users" ADD COLUMN "account_kind" varchar(16) DEFAULT 'registered' NOT NULL;
ALTER TABLE "users" ADD COLUMN "guest_expires_at" timestamp with time zone;
ALTER TABLE "workspaces" ADD COLUMN "kind" varchar(16) DEFAULT 'private' NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_account_kind_check"
  CHECK ("account_kind" IN ('registered', 'guest', 'demo_persona'));
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_kind_check"
  CHECK ("kind" IN ('private', 'demo'));

CREATE INDEX "users_guest_expires_idx"
  ON "users" ("guest_expires_at")
  WHERE "account_kind" = 'guest';

UPDATE "workspaces" SET "kind" = 'demo' WHERE "id" = '88888888-8888-4888-8888-888888888888';
UPDATE "users" SET "account_kind" = 'demo_persona'
  WHERE "email" LIKE '%@teamhub.local';
