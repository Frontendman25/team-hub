ALTER TABLE "profiles" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, coalesce(display_name, '') || ' ' || coalesce(job_title, '') || ' ' || coalesce(bio, ''))) STORED;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, coalesce(content, ''))) STORED;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  CASE
    WHEN type = 'channel' THEN to_tsvector('simple'::regconfig, coalesce(name, '') || ' ' || coalesce(topic, ''))
    ELSE ''::tsvector
  END
) STORED;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  CASE
    WHEN deleted_at IS NULL THEN to_tsvector('simple'::regconfig, coalesce(content, ''))
    ELSE ''::tsvector
  END
) STORED;--> statement-breakpoint
CREATE INDEX "profiles_search_idx" ON "profiles" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "posts_search_idx" ON "posts" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "conversations_search_idx" ON "conversations" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "messages_search_idx" ON "messages" USING gin ("search_vector");
