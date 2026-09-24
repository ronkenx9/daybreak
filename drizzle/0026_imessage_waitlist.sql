CREATE TABLE IF NOT EXISTS "imessage_waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone_e164" text NOT NULL,
  "status" text DEFAULT 'waiting' NOT NULL,
  "source" text DEFAULT 'web' NOT NULL,
  "consent_at" timestamp with time zone NOT NULL,
  "invited_at" timestamp with time zone,
  "activated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "imessage_waitlist_phone_e164_unique" UNIQUE("phone_e164"),
  CONSTRAINT "imessage_waitlist_status_check" CHECK ("status" IN ('waiting', 'invited', 'active', 'opted_out'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "imessage_waitlist_status_created_idx" ON "imessage_waitlist" USING btree ("status", "created_at");
