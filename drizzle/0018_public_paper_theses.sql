ALTER TABLE "theses" ADD COLUMN "mode" text DEFAULT 'live' NOT NULL;
--> statement-breakpoint
CREATE TABLE "paper_thesis_markets" (
  "thesis_id" uuid PRIMARY KEY NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "base_reserve" numeric(30,10) NOT NULL,
  "quote_reserve" numeric(30,10) NOT NULL,
  "trade_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_stock_balances" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "instrument_id" text NOT NULL,
  "balance" numeric(30,10) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "instrument_id")
);
--> statement-breakpoint
CREATE TABLE "paper_positions" (
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "quantity" numeric(30,10) DEFAULT 0 NOT NULL,
  "cost_basis_quote" numeric(30,10) DEFAULT 0 NOT NULL,
  "realized_pnl_quote" numeric(30,10) DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("thesis_id", "user_id")
);
CREATE INDEX "paper_positions_thesis_idx" ON "paper_positions" ("thesis_id", "updated_at");
--> statement-breakpoint
CREATE TABLE "paper_trades" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thesis_id" uuid NOT NULL REFERENCES "theses"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "direction" text NOT NULL,
  "input_amount" numeric(30,10) NOT NULL,
  "output_amount" numeric(30,10) NOT NULL,
  "fee_amount" numeric(30,10) NOT NULL,
  "price_impact_pct" numeric(20,10) NOT NULL,
  "executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "paper_trades_thesis_idx" ON "paper_trades" ("thesis_id", "executed_at");
CREATE INDEX "paper_trades_user_idx" ON "paper_trades" ("user_id", "executed_at");
--> statement-breakpoint
ALTER TABLE "paper_thesis_markets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_stock_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_trades" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "paper_thesis_markets", "paper_stock_balances", "paper_positions", "paper_trades" FROM PUBLIC, anon, authenticated;
