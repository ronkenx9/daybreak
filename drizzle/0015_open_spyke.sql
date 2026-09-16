CREATE TABLE "circle_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tx_hash" text NOT NULL,
	"amount_raw" text NOT NULL,
	"pinned_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_pins_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
ALTER TABLE "circles" ADD COLUMN "pinned_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "circle_pins" ADD CONSTRAINT "circle_pins_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_pins" ADD CONSTRAINT "circle_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circle_pins_circle_idx" ON "circle_pins" USING btree ("circle_id");