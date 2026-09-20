CREATE TABLE "economy_research_settings" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "daily_spend_cap_cents" integer NOT NULL DEFAULT 100 CHECK ("daily_spend_cap_cents" BETWEEN 0 AND 1000),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "economy_research_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "idempotency_key" text NOT NULL,
  "symbol" text NOT NULL,
  "cost_cents" integer NOT NULL CHECK ("cost_cents" BETWEEN 0 AND 25),
  "member_discount_cents" integer NOT NULL DEFAULT 0 CHECK ("member_discount_cents" IN (0,5)),
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','completed','failed')),
  "result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id","idempotency_key")
);
CREATE INDEX "economy_research_jobs_user_time_idx" ON "economy_research_jobs"("user_id","created_at");
CREATE INDEX "economy_research_jobs_member_time_idx" ON "economy_research_jobs"("created_at") WHERE "member_discount_cents" > 0 AND "status" <> 'failed';
CREATE TABLE "economy_refund_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "payment_tx_hash" text NOT NULL REFERENCES "economy_payments"("tx_hash"),
  "wallet" text NOT NULL,
  "amount_cents" integer NOT NULL CHECK ("amount_cents" > 0),
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','processing','fulfilled','denied','cancelled')),
  "refund_tx_hash" text UNIQUE,
  "reviewer_user_id" uuid REFERENCES "users"("id"),
  "resolution_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz
);
CREATE INDEX "economy_refunds_user_time_idx" ON "economy_refund_requests"("user_id","created_at");
CREATE UNIQUE INDEX "economy_refunds_one_pending_payment_idx" ON "economy_refund_requests"("payment_tx_hash") WHERE "status" IN ('pending','processing');
ALTER TABLE "economy_challenges" DROP CONSTRAINT "economy_challenges_status_check";
ALTER TABLE "economy_challenges" ADD CONSTRAINT "economy_challenges_status_check" CHECK ("status" IN ('open','disputed','awarded','cancelled'));
CREATE TABLE "economy_disputes" (
  "challenge_id" uuid PRIMARY KEY REFERENCES "economy_challenges"("id") ON DELETE CASCADE,
  "filed_by_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open','awarded','refunded')),
  "reviewer_user_id" uuid REFERENCES "users"("id"),
  "resolution_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz
);
ALTER TABLE "economy_research_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_research_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_refund_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_disputes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "economy_research_settings", "economy_research_jobs", "economy_refund_requests", "economy_disputes" FROM PUBLIC, anon, authenticated;
