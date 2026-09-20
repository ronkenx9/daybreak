CREATE TABLE "economy_accounts" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "balance_cents" integer NOT NULL DEFAULT 0 CHECK ("balance_cents" >= 0),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "economy_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "wallet" text NOT NULL,
  "credits_cents" integer NOT NULL CHECK ("credits_cents" IN (500, 1000, 2500)),
  "amount_raw" numeric(38,0) NOT NULL CHECK ("amount_raw" > 0),
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "economy_quotes_user_idx" ON "economy_quotes"("user_id", "created_at");
CREATE TABLE "economy_payments" (
  "tx_hash" text PRIMARY KEY,
  "quote_id" uuid NOT NULL UNIQUE REFERENCES "economy_quotes"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL DEFAULT 'USDC',
  "amount_raw" numeric(38,0) NOT NULL,
  "credits_cents" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "economy_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "delta_cents" integer NOT NULL CHECK ("delta_cents" <> 0),
  "kind" text NOT NULL,
  "reference" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("kind", "reference")
);
CREATE INDEX "economy_entries_user_idx" ON "economy_entries"("user_id", "created_at");
CREATE TABLE "economy_service_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "idempotency_key" text NOT NULL,
  "service" text NOT NULL,
  "target" text NOT NULL,
  "cost_cents" integer NOT NULL CHECK ("cost_cents" > 0),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "idempotency_key")
);
CREATE TABLE "economy_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "circle_id" uuid NOT NULL REFERENCES "circles"("id"),
  "sponsor_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "idempotency_key" text NOT NULL,
  "title" text NOT NULL,
  "brief" text NOT NULL,
  "criteria" text NOT NULL,
  "budget_cents" integer NOT NULL CHECK ("budget_cents" BETWEEN 100 AND 25000),
  "status" text NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'awarded', 'cancelled')),
  "deadline" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "economy_challenges_sponsor_key_idx" ON "economy_challenges"("sponsor_user_id", "idempotency_key");
CREATE INDEX "economy_challenges_circle_idx" ON "economy_challenges"("circle_id", "created_at");
CREATE TABLE "economy_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_id" uuid NOT NULL REFERENCES "economy_challenges"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "work_url" text NOT NULL,
  "summary" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("challenge_id", "user_id")
);
CREATE TABLE "economy_awards" (
  "challenge_id" uuid PRIMARY KEY REFERENCES "economy_challenges"("id") ON DELETE CASCADE,
  "submission_id" uuid NOT NULL UNIQUE REFERENCES "economy_submissions"("id"),
  "recipient_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "credits_cents" integer NOT NULL,
  "awarded_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "economy_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_service_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy_awards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "economy_accounts", "economy_quotes", "economy_payments", "economy_entries", "economy_service_orders", "economy_challenges", "economy_submissions", "economy_awards" FROM PUBLIC, anon, authenticated;
