-- ============================================================
-- Eventos GDG Tarija — Read own profile via RPC (avoid 403)
-- ============================================================

-- Read profile via SECURITY DEFINER to avoid relying on direct table grants.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.users
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
