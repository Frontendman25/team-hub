CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"content_type" varchar(127) NOT NULL,
	"byte_size" integer NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"message_id" uuid,
	"post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "files_byte_size_positive" CHECK ("byte_size" > 0),
	CONSTRAINT "files_one_parent" CHECK (NOT ("message_id" IS NOT NULL AND "post_id" IS NOT NULL))
);--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "files_object_key_uidx" ON "files" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "files_workspace_created_idx" ON "files" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "files_message_idx" ON "files" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "files_post_idx" ON "files" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "files_uploader_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_workspace_ready_idx" ON "files" USING btree ("workspace_id","created_at" DESC) WHERE "status" = 'ready' AND "deleted_at" IS NULL;
