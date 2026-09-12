CREATE TABLE "agent_moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "free_pull_days" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "free_pull_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "muse_creations" ADD COLUMN "free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "free_pull_days" ADD CONSTRAINT "free_pull_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_moments_ticker_idx" ON "agent_moments" USING btree ("ticker","created_at");
--> statement-breakpoint
ALTER TABLE "agent_moments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "free_pull_days" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON "agent_moments", "free_pull_days" FROM anon, authenticated;