-- ============================================================
-- Eventos GDG Tarija
-- Rehabilita RLS en session_registrations
-- + Trigger de conflicto horario basado en date + start_time
-- (reemplaza el trigger de time_slot eliminado en migración 007)
-- ============================================================


-- ============================================================
-- 1. RLS en session_registrations
-- ============================================================
ALTER TABLE public.session_registrations ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.session_registrations TO anon, authenticated;

-- Lectura pública: necesaria para mostrar cupos disponibles en el checkout
DROP POLICY IF EXISTS "public_read_session_registrations" ON public.session_registrations;
CREATE POLICY "public_read_session_registrations"
  ON public.session_registrations FOR SELECT
  USING (true);

-- Inserción: cualquier usuario autenticado puede inscribirse a sesiones
DROP POLICY IF EXISTS "attendee_insert_session_reg" ON public.session_registrations;
CREATE POLICY "attendee_insert_session_reg"
  ON public.session_registrations FOR INSERT
  WITH CHECK (true);

-- Eliminación: solo el propio asistente puede quitar su inscripción
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
-- 2. Realtime para conteo de cupos en tiempo real
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


-- ============================================================
-- 3. Función y trigger de conflicto horario
--    Regla: un mismo registration_id no puede tener dos sesiones
--           con la misma date Y el mismo start_time.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_session_datetime_conflict()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_date        date;
  v_start_time  time;
BEGIN
  -- Obtener fecha y hora de inicio de la sesión a registrar
  SELECT s.date, s.start_time
    INTO v_date, v_start_time
    FROM public.sessions s
   WHERE s.id = NEW.session_id;

  -- Solo validar cuando la sesión tiene fecha Y hora definidas.
  -- Si alguno es NULL no hay certeza de conflicto → se permite y el
  -- organizador debe completar los datos.
  IF v_date IS NOT NULL AND v_start_time IS NOT NULL THEN

    IF EXISTS (
      SELECT 1
        FROM public.session_registrations sr
        JOIN public.sessions s ON s.id = sr.session_id
       WHERE sr.registration_id = NEW.registration_id
         AND sr.session_id     <> NEW.session_id
         AND s.date             = v_date
         AND s.start_time       = v_start_time
    ) THEN
      RAISE EXCEPTION
        'Conflicto de horario: ya estás inscrito en otra sesión a las % del %.',
        to_char(v_start_time, 'HH24:MI'),
        to_char(v_date, 'DD/MM/YYYY')
        USING ERRCODE = 'P0001';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_session_datetime_conflict() IS
  'Impide que un mismo asistente se inscriba en dos sesiones con la misma fecha y hora de inicio.';

DROP TRIGGER IF EXISTS trg_session_datetime_conflict ON public.session_registrations;
CREATE TRIGGER trg_session_datetime_conflict
  BEFORE INSERT ON public.session_registrations
  FOR EACH ROW EXECUTE FUNCTION public.check_session_datetime_conflict();
