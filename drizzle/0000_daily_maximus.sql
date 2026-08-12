-- Baseline schema from drizzle-kit pull (CREATE only; no DROP/TRUNCATE).
CREATE TYPE "public"."item_type" AS ENUM('relic', 'lightstone', 'crystal', 'essence', 'other');--> statement-breakpoint
CREATE TABLE "class_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"youtube_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" text DEFAULT 'awakening' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"status_since" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_videos_mode_check" CHECK (mode = ANY (ARRAY['awakening'::text, 'succession'::text])),
	CONSTRAINT "class_videos_status_check" CHECK (status = ANY (ARRAY['ready'::text, 'processing'::text]))
);
--> statement-breakpoint
ALTER TABLE "class_videos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "class_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"section_updates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"combo_awakening" text,
	"combo_succession" text,
	"summary_pvp_awakening" text,
	"summary_pvp_succession" text,
	"summary_pve_awakening" text,
	"summary_pve_succession" text,
	CONSTRAINT "class_guides_class_id_key" UNIQUE("class_id")
);
--> statement-breakpoint
ALTER TABLE "class_guides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_essence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"item_id" uuid,
	"slot" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preset" text DEFAULT 't1' NOT NULL,
	CONSTRAINT "guide_essence_guide_preset_slot_key" UNIQUE("guide_id","slot","preset"),
	CONSTRAINT "guide_essence_preset_check" CHECK (preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_essence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skill_addon_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_ru" text NOT NULL,
	"effect_group" text NOT NULL,
	"tier_labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_addon_effects_key_key" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "skill_addon_effects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_ru" text NOT NULL,
	"icon_url" text,
	"portrait_url" text,
	"awakening_name" text,
	"succession_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tier_pvp_awakening" smallint,
	"tier_pvp_succession" smallint,
	"tier_pve_awakening" smallint,
	"tier_pve_succession" smallint,
	CONSTRAINT "classes_slug_key" UNIQUE("slug"),
	CONSTRAINT "classes_tier_pvp_awakening_check" CHECK ((tier_pvp_awakening IS NULL) OR ((tier_pvp_awakening >= 1) AND (tier_pvp_awakening <= 5))),
	CONSTRAINT "classes_tier_pvp_succession_check" CHECK ((tier_pvp_succession IS NULL) OR ((tier_pvp_succession >= 1) AND (tier_pvp_succession <= 5))),
	CONSTRAINT "classes_tier_pve_awakening_check" CHECK ((tier_pve_awakening IS NULL) OR ((tier_pve_awakening >= 1) AND (tier_pve_awakening <= 5))),
	CONSTRAINT "classes_tier_pve_succession_check" CHECK ((tier_pve_succession IS NULL) OR ((tier_pve_succession >= 1) AND (tier_pve_succession <= 5)))
);
--> statement-breakpoint
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codex_id" text,
	"name_ru" text NOT NULL,
	"icon_url" text,
	"description" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buffs_codex_id_key" UNIQUE("codex_id")
);
--> statement-breakpoint
ALTER TABLE "buffs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_crystals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"item_id" uuid,
	"slot" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preset" text DEFAULT 't1' NOT NULL,
	CONSTRAINT "guide_crystals_preset_check" CHECK (preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_crystals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codex_id" text,
	"name_ru" text NOT NULL,
	"icon_url" text,
	"class_slug" text,
	"skill_type" text,
	"level_req" integer,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supports_addon" boolean DEFAULT false NOT NULL,
	"addon_tier" smallint DEFAULT 2 NOT NULL,
	"addon_effect_keys" text[] DEFAULT '{""}' NOT NULL,
	CONSTRAINT "skills_codex_id_key" UNIQUE("codex_id"),
	CONSTRAINT "skills_addon_tier_check" CHECK (addon_tier = ANY (ARRAY[1, 2, 3]))
);
--> statement-breakpoint
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_combo_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"combo_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guide_combo_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codex_id" text,
	"name_ru" text NOT NULL,
	"icon_url" text,
	"item_type" "item_type" DEFAULT 'other' NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_codex_id_key" UNIQUE("codex_id")
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_relics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"item_id" uuid,
	"slot" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preset" text DEFAULT 't1' NOT NULL,
	CONSTRAINT "guide_relics_preset_check" CHECK (preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_relics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_buffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"buff_id" uuid,
	"slot" text,
	"group_name" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preset" text DEFAULT 't1' NOT NULL,
	CONSTRAINT "guide_buffs_preset_check" CHECK (preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_buffs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_lightstones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"item_id" uuid,
	"slot" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"preset" text DEFAULT 't1' NOT NULL,
	CONSTRAINT "guide_lightstones_preset_check" CHECK (preset = ANY (ARRAY['t1'::text, 't2'::text, 'besp'::text, 'sub'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_lightstones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_morphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"preset" text NOT NULL,
	"slot_level" integer NOT NULL,
	"skill_id" uuid NOT NULL,
	"effect_id_1" uuid,
	"effect_id_2" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "guide_morphs_guide_id_preset_slot_level_key" UNIQUE("guide_id","preset","slot_level"),
	CONSTRAINT "guide_morphs_slot_level_check" CHECK (slot_level = ANY (ARRAY[50, 52, 54, 56, 58, 60])),
	CONSTRAINT "guide_morphs_preset_check" CHECK (preset = ANY (ARRAY['aw_t1'::text, 'aw_t2'::text, 'aw_besp'::text, 'aw_sub'::text, 'aw_pve'::text, 'succ_t1'::text, 'succ_t2'::text, 'succ_besp'::text, 'succ_sub'::text, 'succ_pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_morphs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guild_recruit_banner" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"icon_mime" text,
	"icon_bytes" "bytea",
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_recruit_banner_id_check" CHECK (id),
	CONSTRAINT "guild_recruit_banner_body_len" CHECK ((char_length(body) >= 0) AND (char_length(body) <= 280)),
	CONSTRAINT "guild_recruit_banner_links_array" CHECK (jsonb_typeof(links) = 'array'::text)
);
--> statement-breakpoint
ALTER TABLE "guild_recruit_banner" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid,
	"class_slug" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_feedback_body_len" CHECK ((char_length(body) >= 1) AND (char_length(body) <= 2000))
);
--> statement-breakpoint
ALTER TABLE "guide_feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guide_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"class_slug" text NOT NULL,
	"section" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"author_label" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	CONSTRAINT "guide_proposals_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
	CONSTRAINT "guide_proposals_section_check" CHECK (section = ANY (ARRAY['summary_awakening'::text, 'summary_succession'::text, 'buffs'::text, 'combo_awakening'::text, 'combo_succession'::text, 'crystals'::text, 'relics'::text, 'hardening'::text, 'videos_awakening'::text, 'videos_succession'::text, 'morphs'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lightstone_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ru" text NOT NULL,
	"name_en" text,
	"category" text NOT NULL,
	"bonuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"normal_codex_ids" text[] NOT NULL,
	"enhanced_codex_ids" text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lightstone_sets_category_check" CHECK (category = ANY (ARRAY['combat'::text, 'lifeskill'::text]))
);
--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"filename" text PRIMARY KEY NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text,
	"notes" text,
	"kind" text DEFAULT 'pvp' NOT NULL,
	CONSTRAINT "guide_combos_mode_check" CHECK (mode = ANY (ARRAY['awakening'::text, 'succession'::text])),
	CONSTRAINT "guide_combos_title_len" CHECK ((title IS NULL) OR (char_length(title) <= 60)),
	CONSTRAINT "guide_combos_notes_len" CHECK ((notes IS NULL) OR (char_length(notes) <= 500)),
	CONSTRAINT "guide_combos_kind_check" CHECK (kind = ANY (ARRAY['pvp'::text, 'pve'::text]))
);
--> statement-breakpoint
ALTER TABLE "guide_combos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "class_videos" ADD CONSTRAINT "class_videos_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_guides" ADD CONSTRAINT "class_guides_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_essence" ADD CONSTRAINT "guide_essence_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_essence" ADD CONSTRAINT "guide_essence_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_crystals" ADD CONSTRAINT "guide_crystals_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_crystals" ADD CONSTRAINT "guide_crystals_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_combo_steps" ADD CONSTRAINT "guide_combo_steps_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_combo_steps" ADD CONSTRAINT "guide_combo_steps_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_combo_steps" ADD CONSTRAINT "guide_combo_steps_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "public"."guide_combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_relics" ADD CONSTRAINT "guide_relics_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_relics" ADD CONSTRAINT "guide_relics_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_buffs" ADD CONSTRAINT "guide_buffs_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_buffs" ADD CONSTRAINT "guide_buffs_buff_id_fkey" FOREIGN KEY ("buff_id") REFERENCES "public"."buffs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_lightstones" ADD CONSTRAINT "guide_lightstones_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_lightstones" ADD CONSTRAINT "guide_lightstones_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_morphs" ADD CONSTRAINT "guide_morphs_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_morphs" ADD CONSTRAINT "guide_morphs_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_morphs" ADD CONSTRAINT "guide_morphs_effect_id_1_fkey" FOREIGN KEY ("effect_id_1") REFERENCES "public"."skill_addon_effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_morphs" ADD CONSTRAINT "guide_morphs_effect_id_2_fkey" FOREIGN KEY ("effect_id_2") REFERENCES "public"."skill_addon_effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_feedback" ADD CONSTRAINT "guide_feedback_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_proposals" ADD CONSTRAINT "guide_proposals_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_combos" ADD CONSTRAINT "guide_combos_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "public"."class_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_videos_class_idx" ON "class_videos" USING btree ("class_id","sort_order");--> statement-breakpoint
CREATE INDEX "class_videos_processing_idx" ON "class_videos" USING btree ("status_since") WHERE (status = 'processing'::text);--> statement-breakpoint
CREATE INDEX "guide_essence_guide_idx" ON "guide_essence" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_essence_guide_preset_idx" ON "guide_essence" USING btree ("guide_id","preset","sort_order");--> statement-breakpoint
CREATE INDEX "skill_addon_effects_sort_idx" ON "skill_addon_effects" USING btree ("sort_order","name_ru");--> statement-breakpoint
CREATE INDEX "classes_published_sort_idx" ON "classes" USING btree ("published","sort_order");--> statement-breakpoint
CREATE INDEX "guide_crystals_guide_idx" ON "guide_crystals" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_crystals_guide_preset_idx" ON "guide_crystals" USING btree ("guide_id","preset","sort_order");--> statement-breakpoint
CREATE INDEX "skills_class_slug_idx" ON "skills" USING btree ("class_slug");--> statement-breakpoint
CREATE INDEX "guide_combo_steps_combo_idx" ON "guide_combo_steps" USING btree ("combo_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_combo_steps_guide_idx" ON "guide_combo_steps" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "items_type_idx" ON "items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "guide_relics_guide_idx" ON "guide_relics" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_relics_guide_preset_idx" ON "guide_relics" USING btree ("guide_id","preset","sort_order");--> statement-breakpoint
CREATE INDEX "guide_buffs_guide_idx" ON "guide_buffs" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_buffs_guide_preset_idx" ON "guide_buffs" USING btree ("guide_id","preset","sort_order");--> statement-breakpoint
CREATE INDEX "guide_lightstones_guide_idx" ON "guide_lightstones" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE INDEX "guide_lightstones_guide_preset_idx" ON "guide_lightstones" USING btree ("guide_id","preset","sort_order");--> statement-breakpoint
CREATE INDEX "guide_morphs_guide_preset_idx" ON "guide_morphs" USING btree ("guide_id","preset","slot_level");--> statement-breakpoint
CREATE INDEX "guide_feedback_class_idx" ON "guide_feedback" USING btree ("class_slug","created_at");--> statement-breakpoint
CREATE INDEX "guide_feedback_created_idx" ON "guide_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "guide_proposals_class_idx" ON "guide_proposals" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "guide_proposals_status_idx" ON "guide_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "guide_combos_guide_mode_kind_idx" ON "guide_combos" USING btree ("guide_id","mode","kind","sort_order");--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "class_videos" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read videos of published classes" ON "class_videos" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "class_guides" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guides of published classes" ON "class_guides" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_essence" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_essence" ON "guide_essence" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "skill_addon_effects" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read skill_addon_effects" ON "skill_addon_effects" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "classes" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read published classes" ON "classes" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "buffs" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read buffs" ON "buffs" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_crystals" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_crystals" ON "guide_crystals" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "skills" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read skills" ON "skills" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_combo_steps" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_combo_steps" ON "guide_combo_steps" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "items" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read items" ON "items" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_relics" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_relics" ON "guide_relics" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_buffs" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_buffs" ON "guide_buffs" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_lightstones" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_lightstones" ON "guide_lightstones" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_morphs" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_morphs" ON "guide_morphs" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guild_recruit_banner" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_feedback" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_proposals" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "bdokeep_app_all" ON "guide_combos" AS PERMISSIVE FOR ALL TO "bdokeep_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Public read guide_combos" ON "guide_combos" AS PERMISSIVE FOR SELECT TO "anon", "authenticated";
