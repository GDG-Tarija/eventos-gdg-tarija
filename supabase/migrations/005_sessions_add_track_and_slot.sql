-- ============================================================
-- Eventos GDG Tarija
-- Agrega track_id y time_slot a sessions
-- Habilita RLS en session_registrations
-- ============================================================

-- 1. Columnas nuevas en sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS track_id    uuid        REFERENCES public.tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_slot   smallint    NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description text;

-- time_slot: número de orden del bloque horario (1 = primer bloque, 2 = segundo, etc.)
-- Dos sesiones con el mismo time_slot se ejecutan en paralelo y no se pueden elegir juntas.

COMMENT ON COLUMN public.sessions.time_slot IS
  'Bloque horario al que pertenece la sesión. Sesiones con el mismo time_slot son concurrentes.';


-- ============================================================
-- RLS en session_registrations
-- ============================================================
ALTER TABLE public.session_registrations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.session_registrations TO anon, authenticated;

-- Lectura pública: necesario para mostrar cupos disponibles en el checkout
DROP POLICY IF EXISTS "public_read_session_registrations" ON public.session_registrations;
CREATE POLICY "public_read_session_registrations"
  ON public.session_registrations FOR SELECT
  USING (true);

-- Inserción: el asistente puede inscribir sus propias sesiones
-- (permite anon también para coherencia con el resto del sistema durante MVP)
DROP POLICY IF EXISTS "attendee_insert_session_reg" ON public.session_registrations;
CREATE POLICY "attendee_insert_session_reg"
  ON public.session_registrations FOR INSERT
  WITH CHECK (true);

-- Eliminación: solo el propio usuario puede deshacer su inscripción a sesión
DROP POLICY IF EXISTS "attendee_delete_own_session_reg" ON public.session_registrations;
CREATE POLICY "attendee_delete_own_session_reg"
  ON public.session_registrations FOR DELETE
  USING (
    registration_id IN (
      SELECT id FROM public.registrations
      WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- REALTIME para session_registrations (conteo en vivo)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'session_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_registrations;
  END IF;
END $$;
