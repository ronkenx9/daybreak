ALTER TABLE "theses" ADD COLUMN "creation_intent_id" uuid;
ALTER TABLE "theses" ADD COLUMN "creation_intent_hash" text;
CREATE UNIQUE INDEX "theses_paper_creation_intent_idx" ON "theses" ("author_user_id", "creation_intent_id");
