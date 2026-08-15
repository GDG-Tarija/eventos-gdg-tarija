-- ============================================================
-- Eventos GDG Tarija — Hardening de seguridad (parte 2)
-- Cierra huecos en tablas que YA tenían RLS activo pero con
-- policies demasiado permisivas, y limpia warnings del advisor.
-- ============================================================

-- 1. scan_logs: solo staff puede insertar check-ins (antes
--    cualquier usuario autenticado podía auto-marcarse asistencia
--    y obtener certificado sin haber sido escaneado por staff).
DROP POLICY IF EXISTS "Permitir inserción de logs de escaneo a usuarios autenticados" ON public.scan_logs;
CREATE POLICY "staff_insert_scan_logs"
  ON public.scan_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- La policy de lectura "Permitir lectura de logs de escaneo a
-- usuarios autenticados" (USING true) exponía TODOS los scan_logs
-- de TODOS los asistentes a cualquier usuario logueado. Se elimina;
-- queda user_select_own_scan_logs (propios) + acceso staff.
DROP POLICY IF EXISTS "Permitir lectura de logs de escaneo a usuarios autenticados" ON public.scan_logs;
DROP POLICY IF EXISTS "staff_select_scan_logs" ON public.scan_logs;
CREATE POLICY "staff_select_scan_logs"
  ON public.scan_logs FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- 2. session_registrations: insertar solo para la propia
--    registration_id (antes WITH CHECK(true) para el rol "public",
--    permitía a cualquiera -incluido anon- crear inscripciones a
--    sesiones apuntando a cualquier registration_id ajena).
DROP POLICY IF EXISTS "attendee_insert_session_reg" ON public.session_registrations;
CREATE POLICY "attendee_insert_own_session_reg"
  ON public.session_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    registration_id IN (SELECT id FROM public.registrations WHERE user_id = auth.uid())
  );

-- 3. inscripciones_sessions (tabla legacy, actualmente vacía y sin
--    escritores en el frontend): la policy de UPDATE permitía a
--    cualquier autenticado marcar asistencia de cualquier otro
--    usuario. Se restringe a staff por higiene, sin romper nada
--    (no hay filas ni llamadas activas).
DROP POLICY IF EXISTS "Permitir actualización de inscripciones a usuarios autenticado" ON public.inscripciones_sessions;
CREATE POLICY "staff_update_inscripciones_sessions"
  ON public.inscripciones_sessions FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4. search_path mutable (advisor WARN): fija search_path en las
--    funciones que lo tenían sin definir, sin tocar su lógica.
ALTER FUNCTION public.get_coupon_uses(uuid) SET search_path = public;
ALTER FUNCTION public.get_public_certificate(uuid) SET search_path = public;
ALTER FUNCTION public.check_session_datetime_conflict() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.process_registration_coupon() SET search_path = public;
ALTER FUNCTION public.registrar_asistencia_qr(uuid, uuid) SET search_path = public;

-- 5. handle_new_user() es un trigger function (on auth.users insert),
--    no debería ser invocable directamente vía RPC pública.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
