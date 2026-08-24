-- ============================================================
-- Eventos GDG Tarija
-- Restaura la política RLS que permite a un usuario leer sus
-- propios scan_logs (necesaria para el listado de certificados
-- en src/app/features/public/certificates/data/certificates.service.ts,
-- que hace un select anidado registrations -> scan_logs sujeto a RLS,
-- a diferencia del detalle que usa el RPC get_public_certificate
-- (SECURITY DEFINER, evade RLS).
--
-- La política existía en 015_certificates_scan_logs_policy.sql pero
-- no está presente en el proyecto remoto: solo quedan las políticas
-- de staff (staff_select_scan_logs, staff_insert_scan_logs), por lo
-- que un asistente normal recibe scan_logs: [] al consultar su lista
-- de certificados y el certificado se descarta silenciosamente en
-- el cliente aunque sí haya asistido.
-- ============================================================

DROP POLICY IF EXISTS "user_select_own_scan_logs" ON public.scan_logs;
CREATE POLICY "user_select_own_scan_logs"
  ON public.scan_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      WHERE r.id = scan_logs.registration_id
        AND r.user_id = auth.uid()
    )
  );
