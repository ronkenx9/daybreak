ALTER TABLE "paper_trades" ADD COLUMN "intent_id" uuid;
ALTER TABLE "paper_trades" ADD COLUMN "intent_hash" text;
CREATE UNIQUE INDEX "paper_trades_intent_idx" ON "paper_trades" ("user_id", "intent_id");
