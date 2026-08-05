-- Schema-per-service ownership boundaries (logical DB-per-service).
-- Tables stay in public for strangler compatibility; schemas + roles reserve ownership.
-- Future cutover: ALTER TABLE ... SET SCHEMA <domain>;

CREATE SCHEMA IF NOT EXISTS classes;
CREATE SCHEMA IF NOT EXISTS proposals;
CREATE SCHEMA IF NOT EXISTS feedback;
CREATE SCHEMA IF NOT EXISTS crystals;
CREATE SCHEMA IF NOT EXISTS relics;
CREATE SCHEMA IF NOT EXISTS hardening;
CREATE SCHEMA IF NOT EXISTS morphs;
CREATE SCHEMA IF NOT EXISTS combo;
CREATE SCHEMA IF NOT EXISTS buffs;
CREATE SCHEMA IF NOT EXISTS videos;
CREATE SCHEMA IF NOT EXISTS catalog_skills;

COMMENT ON SCHEMA crystals IS 'svc-crystals ownership zone';
COMMENT ON SCHEMA relics IS 'svc-relics ownership zone';
COMMENT ON SCHEMA hardening IS 'svc-hardening ownership zone';
COMMENT ON SCHEMA morphs IS 'svc-morphs ownership zone';
COMMENT ON SCHEMA combo IS 'svc-combo ownership zone';
COMMENT ON SCHEMA buffs IS 'svc-buffs ownership zone';
COMMENT ON SCHEMA videos IS 'svc-videos ownership zone';
COMMENT ON SCHEMA feedback IS 'svc-feedback ownership zone';
COMMENT ON SCHEMA proposals IS 'svc-proposals ownership zone';
COMMENT ON SCHEMA classes IS 'svc-classes ownership zone';
COMMENT ON SCHEMA catalog_skills IS 'shared read model for combo+morphs';

-- Per-service marker roles (NOLOGIN) — passwords/grants wired when schemas absorb tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_crystals') THEN
    CREATE ROLE bdokeep_crystals NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_relics') THEN
    CREATE ROLE bdokeep_relics NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_feedback') THEN
    CREATE ROLE bdokeep_feedback NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_proposals') THEN
    CREATE ROLE bdokeep_proposals NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bdokeep_classes') THEN
    CREATE ROLE bdokeep_classes NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA crystals TO bdokeep_app, bdokeep_crystals;
GRANT USAGE ON SCHEMA relics TO bdokeep_app, bdokeep_relics;
GRANT USAGE ON SCHEMA feedback TO bdokeep_app, bdokeep_feedback;
GRANT USAGE ON SCHEMA proposals TO bdokeep_app, bdokeep_proposals;
GRANT USAGE ON SCHEMA classes TO bdokeep_app, bdokeep_classes;
GRANT USAGE ON SCHEMA hardening, morphs, combo, buffs, videos, catalog_skills TO bdokeep_app;
