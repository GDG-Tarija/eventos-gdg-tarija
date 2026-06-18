-- ============================================================
-- Eventos GDG Tarija
-- Corrige las políticas de RLS para el bucket payment-proofs
-- para permitir la subida flexible a usuarios anon y authenticated.
-- ============================================================

-- Eliminar la política anterior restrictiva
DROP POLICY IF EXISTS "payment_proofs_insert_own" ON storage.objects;

-- Crear una política de inserción robusta y flexible
CREATE POLICY "payment_proofs_insert"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Asegurar políticas de lectura para el bucket público
DROP POLICY IF EXISTS "payment_proofs_select" ON storage.objects;
CREATE POLICY "payment_proofs_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'payment-proofs');
