-- ============================================================
-- Eventos GDG Tarija
-- Database: Supabase (PostgreSQL)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TYPES (enums)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE state_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- TABLES
-- ============================================================

-- 1. sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,
  description TEXT,
  score       TEXT,
  state       state_enum  NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at ON sponsors;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES — authenticated role
-- ============================================================

-- sponsors
CREATE POLICY "auth_select_sponsors"
  ON sponsors FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sponsors"
  ON sponsors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sponsors"
  ON sponsors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_sponsors"
  ON sponsors FOR DELETE TO authenticated USING (true);


-- ============================================================
-- RLS POLICIES — anon role (desarrollo sin auth activo)
-- Remover estas políticas cuando se active el sistema de auth.
-- ============================================================

-- sponsors
CREATE POLICY "anon_select_sponsors"
  ON sponsors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sponsors"
  ON sponsors FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_sponsors"
  ON sponsors FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_sponsors"
  ON sponsors FOR DELETE TO anon USING (true);


-- ============================================================
-- REALTIME — enable publications for live listening
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sponsors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sponsors;
  END IF;
END $$;
