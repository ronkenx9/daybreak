CREATE TABLE "community_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain" text DEFAULT 'base' NOT NULL,
	"address" text NOT NULL,
	"stock_address" text,
	"company_id" text,
	"circle_id" uuid,
	"source" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"launch_id" uuid NOT NULL,
	"recipient" text NOT NULL,
	"amount_raw" text NOT NULL,
	"asset" text,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimable_raw" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"intent_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"provider_ref" text,
	"tx_hash" text,
	"error_class" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid,
	"creator_user_id" uuid NOT NULL,
	"circle_id" uuid,
	"quote_asset" text,
	"supply" text,
	"allocation" text,
	"fee_recipient" text,
	"simulation_fingerprint" text,
	"token_address" text,
	"pool_ref" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain" text DEFAULT 'base' NOT NULL,
	"protocol" text NOT NULL,
	"pool_ref" text NOT NULL,
	"token0" text NOT NULL,
	"token1" text NOT NULL,
	"liquidity_usd" text,
	"observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"sell_token" text NOT NULL,
	"buy_token" text NOT NULL,
	"sell_amount_raw" text NOT NULL,
	"buy_amount_raw" text NOT NULL,
	"sell_decimals" integer NOT NULL,
	"buy_decimals" integer NOT NULL,
	"min_buy_amount_raw" text NOT NULL,
	"fee_bps" integer,
	"provider_ref" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"chain" text DEFAULT 'base' NOT NULL,
	"address" text NOT NULL,
	"provider_wallet_ref" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_tokens" ADD CONSTRAINT "community_tokens_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_observations" ADD CONSTRAINT "fee_observations_launch_id_token_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."token_launches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_launches" ADD CONSTRAINT "token_launches_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_quotes" ADD CONSTRAINT "trade_quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_connections" ADD CONSTRAINT "wallet_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_tokens_chain_address" ON "community_tokens" USING btree ("chain","address");--> statement-breakpoint
CREATE UNIQUE INDEX "operations_user_idempotency" ON "operations" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "token_pools_chain_protocol_ref" ON "token_pools" USING btree ("chain","protocol","pool_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_connections_provider_chain_address" ON "wallet_connections" USING btree ("provider","chain","address");