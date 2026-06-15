-- ============================================================
-- Eventos GDG Tarija
-- Habilita políticas de lectura pública RLS para las tablas
-- sessions y tracks, permitiendo su renderizado en el frontend.
-- ============================================================

-- 1. Permitir lectura pública de sesiones (necesario para el checkout)
DROP POLICY IF EXISTS "public_read_sessions" ON public.sessions;
CREATE POLICY "public_read_sessions"
  ON public.sessions FOR SELECT
  USING (true);

-- 2. Permitir lectura pública de tracks
DROP POLICY IF EXISTS "public_read_tracks" ON public.tracks;
CREATE POLICY "public_read_tracks"
  ON public.tracks FOR SELECT
  USING (true);
