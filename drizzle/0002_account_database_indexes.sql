CREATE INDEX "circle_memberships_user_idx" ON "circle_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_tokens_circle_idx" ON "community_tokens" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "community_tokens_company_idx" ON "community_tokens" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "fee_observations_launch_idx" ON "fee_observations" USING btree ("launch_id");--> statement-breakpoint
CREATE INDEX "linked_wallets_user_idx" ON "linked_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "token_launches_operation_idx" ON "token_launches" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "token_launches_creator_idx" ON "token_launches" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "token_launches_circle_idx" ON "token_launches" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "token_pools_token0_idx" ON "token_pools" USING btree ("token0");--> statement-breakpoint
CREATE INDEX "token_pools_token1_idx" ON "token_pools" USING btree ("token1");--> statement-breakpoint
CREATE INDEX "wallet_connections_user_idx" ON "wallet_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watchlists_owner_user_idx" ON "watchlists" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "watchlists_circle_idx" ON "watchlists" USING btree ("circle_id");