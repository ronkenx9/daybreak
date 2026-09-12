CREATE TABLE "feed_snapshots" (
	"key" text PRIMARY KEY NOT NULL,
	"items" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "feed_snapshots" FROM anon, authenticated;
