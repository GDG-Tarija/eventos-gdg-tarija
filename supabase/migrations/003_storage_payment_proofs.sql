-- ============================================================
-- Storage policies for payment proofs uploads
-- Bucket: payment-proofs
-- Path convention: <event_id>/<user_id>/<timestamp>.<ext>
-- ============================================================

-- Ensure RLS is enabled on storage.objects (Supabase default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop policy if re-running
DROP POLICY IF EXISTS "payment_proofs_insert_own" ON storage.objects;

-- Allow authenticated users to upload only into their own user_id folder
CREATE POLICY "payment_proofs_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND split_part(name, '/', 2) = auth.uid()::text
  );
