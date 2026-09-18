CREATE TABLE "market_actors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text DEFAULT encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex') NOT NULL,
  "kind" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "market_actors_public_id_unique" ON "market_actors" ("public_id");
CREATE UNIQUE INDEX "market_actors_user_id_unique" ON "market_actors" ("user_id");
CREATE INDEX "market_actors_kind_idx" ON "market_actors" ("kind", "created_at");
INSERT INTO "market_actors" ("public_id", "kind", "user_id", "created_at")
SELECT "paper_public_id", 'human', "id", "created_at" FROM "users";

CREATE TABLE "agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "strategy" text NOT NULL,
  "avatar" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "policy_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "agents_actor_id_unique" ON "agents" ("actor_id");
CREATE INDEX "agents_owner_idx" ON "agents" ("owner_user_id", "created_at");

CREATE TABLE "agent_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "prefix" text NOT NULL,
  "secret_digest" text NOT NULL,
  "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "expires_at" timestamptz,
  "revoked_at" timestamptz,
  "last_used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "agent_api_keys_prefix_unique" ON "agent_api_keys" ("prefix");
CREATE UNIQUE INDEX "agent_api_keys_digest_unique" ON "agent_api_keys" ("secret_digest");
CREATE INDEX "agent_api_keys_agent_idx" ON "agent_api_keys" ("agent_id", "created_at");

CREATE TABLE "agent_policies" (
  "agent_id" uuid PRIMARY KEY REFERENCES "agents"("id") ON DELETE CASCADE,
  "allowed_instrument_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "can_publish" boolean DEFAULT true NOT NULL,
  "max_input_per_trade" numeric(30,10) DEFAULT 5 NOT NULL,
  "daily_gross_buy" numeric(30,10) DEFAULT 25 NOT NULL,
  "max_slippage_bps" integer DEFAULT 300 NOT NULL,
  "daily_publication_limit" integer DEFAULT 3 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "agent_budget_windows" (
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "instrument_id" text NOT NULL,
  "window_start" date NOT NULL,
  "gross_buy" numeric(30,10) DEFAULT 0 NOT NULL,
  "trade_count" integer DEFAULT 0 NOT NULL,
  "publication_count" integer DEFAULT 0 NOT NULL,
  PRIMARY KEY ("actor_id", "instrument_id", "window_start")
);
CREATE INDEX "agent_budget_windows_date_idx" ON "agent_budget_windows" ("window_start");

CREATE TABLE "agent_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE CASCADE,
  "instrument_id" text NOT NULL,
  "direction" text NOT NULL,
  "input_amount" numeric(30,10) NOT NULL,
  "expected_output" numeric(30,10) NOT NULL,
  "minimum_output" numeric(30,10) NOT NULL,
  "fee_amount" numeric(30,10) NOT NULL,
  "price_impact_pct" numeric(20,10) NOT NULL,
  "slippage_bps" integer NOT NULL,
  "policy_version" integer NOT NULL,
  "status" text DEFAULT 'quoted' NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "agent_quotes_actor_idx" ON "agent_quotes" ("actor_id", "created_at");
CREATE INDEX "agent_quotes_thesis_idx" ON "agent_quotes" ("thesis_id", "created_at");

CREATE TABLE "agent_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "operation" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "state" text DEFAULT 'pending' NOT NULL,
  "resource_id" uuid,
  "response" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "agent_requests_actor_operation_key_idx" ON "agent_requests" ("actor_id", "operation", "idempotency_key");
CREATE INDEX "agent_requests_actor_idx" ON "agent_requests" ("actor_id", "created_at");

CREATE TABLE "agent_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "key_prefix" text,
  "operation" text NOT NULL,
  "result_code" text NOT NULL,
  "request_id" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "agent_audit_events_actor_idx" ON "agent_audit_events" ("actor_id", "created_at");

ALTER TABLE "theses" ADD COLUMN "author_actor_id" uuid;
UPDATE "theses" t SET "author_actor_id" = a."id" FROM "market_actors" a WHERE a."user_id" = t."author_user_id";
ALTER TABLE "theses" ALTER COLUMN "author_actor_id" SET NOT NULL;
ALTER TABLE "theses" ADD CONSTRAINT "theses_author_actor_id_market_actors_id_fk" FOREIGN KEY ("author_actor_id") REFERENCES "market_actors"("id") ON DELETE CASCADE;
CREATE INDEX "theses_author_actor_idx" ON "theses" ("author_actor_id");
DROP INDEX IF EXISTS "theses_paper_creation_intent_idx";
CREATE UNIQUE INDEX "theses_paper_creation_intent_idx" ON "theses" ("author_actor_id", "creation_intent_id");
ALTER TABLE "theses" ALTER COLUMN "author_user_id" DROP NOT NULL;

ALTER TABLE "paper_stock_balances" ADD COLUMN "actor_id" uuid;
UPDATE "paper_stock_balances" b SET "actor_id" = a."id" FROM "market_actors" a WHERE a."user_id" = b."user_id";
ALTER TABLE "paper_stock_balances" ALTER COLUMN "actor_id" SET NOT NULL;
ALTER TABLE "paper_stock_balances" ADD CONSTRAINT "paper_stock_balances_actor_id_market_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "market_actors"("id") ON DELETE CASCADE;
ALTER TABLE "paper_stock_balances" DROP CONSTRAINT "paper_stock_balances_pkey";
ALTER TABLE "paper_stock_balances" ADD CONSTRAINT "paper_stock_balances_pkey" PRIMARY KEY ("actor_id", "instrument_id");
ALTER TABLE "paper_stock_balances" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "paper_positions" ADD COLUMN "actor_id" uuid;
UPDATE "paper_positions" p SET "actor_id" = a."id" FROM "market_actors" a WHERE a."user_id" = p."user_id";
ALTER TABLE "paper_positions" ALTER COLUMN "actor_id" SET NOT NULL;
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_actor_id_market_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "market_actors"("id") ON DELETE CASCADE;
ALTER TABLE "paper_positions" DROP CONSTRAINT "paper_positions_pkey";
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_pkey" PRIMARY KEY ("thesis_id", "actor_id");
ALTER TABLE "paper_positions" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "paper_trades" ADD COLUMN "actor_id" uuid;
ALTER TABLE "paper_trades" ADD COLUMN "rationale" text;
UPDATE "paper_trades" p SET "actor_id" = a."id" FROM "market_actors" a WHERE a."user_id" = p."user_id";
ALTER TABLE "paper_trades" ALTER COLUMN "actor_id" SET NOT NULL;
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_actor_id_market_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "market_actors"("id") ON DELETE CASCADE;
DROP INDEX IF EXISTS "paper_trades_intent_idx";
CREATE UNIQUE INDEX "paper_trades_intent_idx" ON "paper_trades" ("actor_id", "intent_id");
ALTER TABLE "paper_trades" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "paper_activity_limits" ADD COLUMN "actor_id" uuid;
UPDATE "paper_activity_limits" p SET "actor_id" = a."id" FROM "market_actors" a WHERE a."user_id" = p."user_id";
ALTER TABLE "paper_activity_limits" ALTER COLUMN "actor_id" SET NOT NULL;
ALTER TABLE "paper_activity_limits" ADD CONSTRAINT "paper_activity_limits_actor_id_market_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "market_actors"("id") ON DELETE CASCADE;
ALTER TABLE "paper_activity_limits" DROP CONSTRAINT "paper_activity_limits_user_window_pk";
ALTER TABLE "paper_activity_limits" ADD CONSTRAINT "paper_activity_limits_actor_window_pk" PRIMARY KEY ("actor_id", "window_start");
ALTER TABLE "paper_activity_limits" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "market_actors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_budget_windows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_audit_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "market_actors", "agents", "agent_api_keys", "agent_policies", "agent_budget_windows", "agent_quotes", "agent_requests", "agent_audit_events" FROM PUBLIC, anon, authenticated;
