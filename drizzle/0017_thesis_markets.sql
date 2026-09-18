CREATE TABLE "theses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "author_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "instrument_id" text NOT NULL,
  "company_id" text NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "body" text NOT NULL,
  "invalidation" text NOT NULL,
  "horizon" text,
  "sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "token_name" text NOT NULL,
  "token_symbol" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "theses_author_idx" ON "theses" ("author_user_id");
CREATE INDEX "theses_company_idx" ON "theses" ("company_id");
CREATE INDEX "theses_status_idx" ON "theses" ("status", "published_at");
--> statement-breakpoint
CREATE TABLE "thesis_markets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "operation_id" uuid REFERENCES "operations"("id") ON DELETE set null,
  "chain_namespace" text DEFAULT 'solana:mainnet' NOT NULL,
  "creator_wallet" text NOT NULL,
  "quote_mint" text NOT NULL,
  "quote_decimals" integer NOT NULL,
  "base_mint" text NOT NULL,
  "token_badge" text NOT NULL,
  "config_address" text NOT NULL,
  "pool_address" text NOT NULL,
  "config_version" text NOT NULL,
  "terms" jsonb NOT NULL,
  "transaction_message_hash" text NOT NULL,
  "recent_blockhash" text NOT NULL,
  "last_valid_block_height" integer NOT NULL,
  "tx_signature" text,
  "status" text DEFAULT 'preview' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "thesis_markets_thesis_idx" ON "thesis_markets" ("thesis_id");
CREATE UNIQUE INDEX "thesis_markets_pool_idx" ON "thesis_markets" ("chain_namespace", "pool_address");
CREATE INDEX "thesis_markets_operation_idx" ON "thesis_markets" ("operation_id");
CREATE INDEX "thesis_markets_status_idx" ON "thesis_markets" ("status", "updated_at");
--> statement-breakpoint
CREATE TABLE "thesis_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "author_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "thesis_updates_thesis_idx" ON "thesis_updates" ("thesis_id", "created_at");
--> statement-breakpoint
CREATE TABLE "thesis_follows" (
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("thesis_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE "thesis_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "thesis_comments_thesis_idx" ON "thesis_comments" ("thesis_id", "created_at");
--> statement-breakpoint
CREATE TABLE "thesis_trade_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thesis_market_id" uuid NOT NULL REFERENCES "thesis_markets"("id") ON DELETE cascade,
  "operation_id" uuid NOT NULL REFERENCES "operations"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "wallet_address" text NOT NULL,
  "direction" text NOT NULL,
  "input_mint" text NOT NULL,
  "output_mint" text NOT NULL,
  "input_amount_raw" text NOT NULL,
  "expected_output_raw" text NOT NULL,
  "minimum_output_raw" text NOT NULL,
  "slippage_bps" integer NOT NULL,
  "transaction_message_hash" text NOT NULL,
  "recent_blockhash" text NOT NULL,
  "last_valid_block_height" integer NOT NULL,
  "status" text DEFAULT 'quoted' NOT NULL,
  "tx_signature" text,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "thesis_trade_quotes_operation_idx" ON "thesis_trade_quotes" ("operation_id");
CREATE INDEX "thesis_trade_quotes_market_idx" ON "thesis_trade_quotes" ("thesis_market_id", "created_at");
CREATE INDEX "thesis_trade_quotes_user_idx" ON "thesis_trade_quotes" ("user_id", "created_at");
CREATE INDEX "thesis_trade_quotes_status_idx" ON "thesis_trade_quotes" ("status", "expires_at");
--> statement-breakpoint
ALTER TABLE "theses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thesis_markets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thesis_updates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thesis_follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thesis_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "thesis_trade_quotes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "theses", "thesis_markets", "thesis_updates", "thesis_follows", "thesis_comments", "thesis_trade_quotes" FROM PUBLIC, anon, authenticated;
