ALTER TABLE "agent_policies" ADD COLUMN "live_flash_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "agent_policies" ADD COLUMN "live_flash_wallet" text;
ALTER TABLE "agent_policies" ADD COLUMN "live_flash_max_usdc_per_order" numeric(18,6) NOT NULL DEFAULT 5;
ALTER TABLE "agent_policies" ADD COLUMN "live_flash_daily_usdc" numeric(18,6) NOT NULL DEFAULT 25;

CREATE TABLE "agent_flash_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "market_actors"("id") ON DELETE CASCADE,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id"),
  "instrument_id" text NOT NULL,
  "wallet" text NOT NULL,
  "quote_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "amount_usdc" numeric(18,6) NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "flash_order_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "agent_flash_orders_amount_positive" CHECK ("amount_usdc" > 0)
);
CREATE UNIQUE INDEX "agent_flash_orders_actor_key_idx" ON "agent_flash_orders" ("actor_id", "idempotency_key");
CREATE UNIQUE INDEX "agent_flash_orders_actor_quote_idx" ON "agent_flash_orders" ("actor_id", "quote_id");
CREATE INDEX "agent_flash_orders_actor_created_idx" ON "agent_flash_orders" ("actor_id", "created_at");
ALTER TABLE "agent_flash_orders" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "agent_flash_orders" FROM PUBLIC, anon, authenticated;
