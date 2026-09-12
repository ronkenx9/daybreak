CREATE TABLE "holding_eligibilities" (
	"user_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"wallet_address" text NOT NULL,
	"token_address" text NOT NULL,
	"chain_id" integer DEFAULT 8453 NOT NULL,
	"block_number" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "holding_eligibilities_user_id_ticker_pk" PRIMARY KEY("user_id","ticker")
);
--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "creator_user_id" uuid;--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "kind" text DEFAULT 'interest' NOT NULL;--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "gate_mode" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "tickers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "holding_eligibilities" ADD CONSTRAINT "holding_eligibilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "holding_eligibilities_expiry_idx" ON "holding_eligibilities" USING btree ("user_id","expires_at");--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "holding_eligibilities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "holding_eligibilities" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
UPDATE "circles" SET "tickers"='["AAPL","AMZN"]'::jsonb WHERE "slug"='the-everyday-club';
--> statement-breakpoint
UPDATE "circles" SET "tickers"='["NVDA","AAPL"]'::jsonb WHERE "slug"='built-for-tomorrow';
--> statement-breakpoint
UPDATE "circles" SET "tickers"='["META"]'::jsonb WHERE "slug"='after-hours-people';
--> statement-breakpoint
INSERT INTO "circles" ("slug","name","description","kind","gate_mode","tickers") VALUES
('holders-googl','Alphabet holders','A verified circle for people holding GOOGLc on Base.','stock','any_stock','["GOOGL"]'::jsonb)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
UPDATE "token_launches" SET "circle_id"=(SELECT "id" FROM "circles" WHERE "slug"='holders-googl')
WHERE "status"='confirmed' AND lower("quote_asset")='0xb2000000000000000000002d0ba3164cc74f58b7';
--> statement-breakpoint
INSERT INTO "community_tokens" ("chain","address","stock_address","company_id","circle_id","source","verification_status","observed_at")
SELECT 'base',lower("token_address"),lower("quote_asset"),'GOOGL',(SELECT "id" FROM "circles" WHERE "slug"='holders-googl'),'bankr','verified',"updated_at"
FROM "token_launches" WHERE "status"='confirmed' AND "token_address" IS NOT NULL AND lower("quote_asset")='0xb2000000000000000000002d0ba3164cc74f58b7'
ON CONFLICT ("chain","address") DO UPDATE SET "circle_id"=EXCLUDED."circle_id","company_id"=EXCLUDED."company_id","verification_status"='verified',"observed_at"=EXCLUDED."observed_at";
