ALTER TABLE "muse_creations" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'pfp' NOT NULL;
--> statement-breakpoint
ALTER TABLE "muse_creations" ADD COLUMN IF NOT EXISTS "pull_group" text;
--> statement-breakpoint
ALTER TABLE "muse_creations" ADD COLUMN IF NOT EXISTS "moment_lane" text;
--> statement-breakpoint
ALTER TABLE "muse_creations" ADD COLUMN IF NOT EXISTS "moment_text" text;
