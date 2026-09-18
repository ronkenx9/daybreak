ALTER TABLE "users" ADD COLUMN "paper_public_id" text;
UPDATE "users" SET "paper_public_id" = encode(sha256(convert_to('daybreak-paper:' || "id"::text, 'UTF8')), 'hex');
ALTER TABLE "users" ALTER COLUMN "paper_public_id" SET DEFAULT encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex');
ALTER TABLE "users" ALTER COLUMN "paper_public_id" SET NOT NULL;
CREATE UNIQUE INDEX "users_paper_public_id_unique" ON "users" ("paper_public_id");

ALTER TABLE "paper_positions" ADD COLUMN "public_id" text;
UPDATE "paper_positions" AS p SET "public_id" = u."paper_public_id" FROM "users" AS u WHERE p."user_id" = u."id";
ALTER TABLE "paper_positions" ALTER COLUMN "public_id" SET NOT NULL;
CREATE INDEX "paper_positions_thesis_public_idx" ON "paper_positions" ("thesis_id", "public_id");

ALTER TABLE "paper_stock_balances" ADD COLUMN "public_id" text;
UPDATE "paper_stock_balances" AS b SET "public_id" = u."paper_public_id" FROM "users" AS u WHERE b."user_id" = u."id";
ALTER TABLE "paper_stock_balances" ALTER COLUMN "public_id" SET NOT NULL;
CREATE INDEX "paper_stock_balances_instrument_public_idx" ON "paper_stock_balances" ("instrument_id", "public_id");

ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_positive_amounts" CHECK ("input_amount" > 0 AND "output_amount" > 0 AND "fee_amount" > 0) NOT VALID;
ALTER TABLE "paper_trades" VALIDATE CONSTRAINT "paper_trades_positive_amounts";

CREATE TABLE "paper_activity_limits" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "window_start" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  CONSTRAINT "paper_activity_limits_user_window_pk" PRIMARY KEY ("user_id", "window_start")
);
CREATE INDEX "paper_activity_limits_window_idx" ON "paper_activity_limits" ("window_start");

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_stock_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_trades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paper_activity_limits" ENABLE ROW LEVEL SECURITY;
