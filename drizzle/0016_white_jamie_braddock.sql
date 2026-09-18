ALTER TABLE "holding_eligibilities" ADD COLUMN "chain_namespace" text DEFAULT 'eip155:8453' NOT NULL;--> statement-breakpoint
ALTER TABLE "holding_eligibilities" DROP CONSTRAINT "holding_eligibilities_user_id_ticker_pk";--> statement-breakpoint
ALTER TABLE "holding_eligibilities" ADD CONSTRAINT "holding_eligibilities_user_id_ticker_wallet_address_chain_namespace_pk" PRIMARY KEY("user_id","ticker","wallet_address","chain_namespace");--> statement-breakpoint
UPDATE "circles"
SET "description" = 'A verified circle for people holding supported ' || ("tickers"->>0) || ' stock tokens.'
WHERE "kind" = 'stock' AND jsonb_array_length("tickers") = 1 AND "slug" = 'holders-' || lower("tickers"->>0);
