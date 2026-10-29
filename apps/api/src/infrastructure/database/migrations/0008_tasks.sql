CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" varchar(16) NOT NULL,
	"priority" varchar(16) DEFAULT 'medium' NOT NULL,
	"position" integer NOT NULL,
	"assignee_id" uuid,
	"due_date" date,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_title_len" CHECK (char_length(btrim("title")) >= 1),
	CONSTRAINT "tasks_status_check" CHECK ("status" IN ('todo', 'in_progress', 'done')),
	CONSTRAINT "tasks_priority_check" CHECK ("priority" IN ('low', 'medium', 'high')),
	CONSTRAINT "tasks_position_nonneg" CHECK ("position" >= 0),
	CONSTRAINT "tasks_version_positive" CHECK ("version" >= 1),
	CONSTRAINT "tasks_workspace_status_position_uidx" UNIQUE ("workspace_id", "status", "position") DEFERRABLE INITIALLY DEFERRED
);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_workspace_status_idx" ON "tasks" USING btree ("workspace_id","status","position");--> statement-breakpoint
CREATE INDEX "tasks_workspace_assignee_idx" ON "tasks" USING btree ("workspace_id","assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_workspace_created_idx" ON "tasks" USING btree ("workspace_id","created_at");
