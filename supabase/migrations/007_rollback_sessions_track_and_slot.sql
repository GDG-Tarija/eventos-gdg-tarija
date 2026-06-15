-- ============================================================
-- Eventos GDG Tarija
-- ROLLBACK de 005_sessions_add_track_and_slot.sql
--           y 006_session_slot_conflict_trigger.sql
-- ============================================================


-- ============================================================
-- 1. Revertir 006: eliminar trigger y función de conflicto
-- ============================================================
DROP TRIGGER IF EXISTS trg_session_slot_conflict ON public.session_registrations;

DROP FUNCTION IF EXISTS public.check_session_time_slot_conflict();


-- ============================================================
-- 2. Revertir 005: eliminar políticas RLS de session_registrations
-- ============================================================
DROP POLICY IF EXISTS "public_read_session_registrations"  ON public.session_registrations;
DROP POLICY IF EXISTS "attendee_insert_session_reg"        ON public.session_registrations;
DROP POLICY IF EXISTS "attendee_delete_own_session_reg"    ON public.session_registrations;

-- Quitar la tabla de la publicación de realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'session_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE session_registrations;
  END IF;
END $$;

-- Deshabilitar RLS (estaba desactivado antes de la migración 005)
ALTER TABLE public.session_registrations DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. Revertir 005: eliminar columnas de sessions
-- ============================================================
COMMENT ON COLUMN public.sessions.time_slot IS NULL;

ALTER TABLE public.sessions
  DROP COLUMN IF EXISTS track_id,
  DROP COLUMN IF EXISTS time_slot,
  DROP COLUMN IF EXISTS description;
