-- ============================================================
-- Eventos GDG Tarija
-- RLS policy para permitir a los usuarios consultar sus propios
-- registros de asistencia (scan_logs) para certificados.
-- ============================================================

ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.scan_logs TO authenticated;

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
