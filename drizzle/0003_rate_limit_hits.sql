CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rate_key" text NOT NULL,
	"hit_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_key_time_idx" ON "rate_limit_hits" USING btree ("rate_key","hit_at");
--> statement-breakpoint
ALTER TABLE "rate_limit_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "rate_limit_hits" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);
