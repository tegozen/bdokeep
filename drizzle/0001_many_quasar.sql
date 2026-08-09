CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_role_check" CHECK (role = ANY (ARRAY['superadmin'::text, 'admin'::text])),
	CONSTRAINT "admin_users_username_len" CHECK ((char_length(username) >= 2) AND (char_length(username) <= 64)),
	CONSTRAINT "admin_users_password_hash_len" CHECK (char_length(password_hash) >= 20)
);
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guild_recruit_banner" DROP CONSTRAINT "guild_recruit_banner_id_check";--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_username_lower_uidx" ON "admin_users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "admin_users_role_idx" ON "admin_users" USING btree ("role" text_ops);--> statement-breakpoint
ALTER TABLE "guild_recruit_banner" ADD CONSTRAINT "guild_recruit_banner_id_check" CHECK (id);--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "admin_users" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);