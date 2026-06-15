-- ============================================================
-- Eventos GDG Tarija
-- Trigger: impide inscribirse a dos sesiones concurrentes
-- (mismo time_slot dentro de la misma registration)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_session_time_slot_conflict()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_time_slot smallint;
BEGIN
  -- Obtener el time_slot de la sesión que se quiere inscribir
  SELECT s.time_slot INTO v_time_slot
  FROM public.sessions s
  WHERE s.id = NEW.session_id;

  -- Verificar que no exista ya una sesión del mismo bloque para esta registration
  IF EXISTS (
    SELECT 1
    FROM public.session_registrations sr
    JOIN public.sessions s ON s.id = sr.session_id
    WHERE sr.registration_id = NEW.registration_id
      AND s.time_slot = v_time_slot
      AND sr.session_id <> NEW.session_id
  ) THEN
    RAISE EXCEPTION
      'Conflicto de horario: ya estás inscrito en otra sesión del bloque %.', v_time_slot
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_slot_conflict ON public.session_registrations;
CREATE TRIGGER trg_session_slot_conflict
  BEFORE INSERT ON public.session_registrations
  FOR EACH ROW EXECUTE FUNCTION public.check_session_time_slot_conflict();
