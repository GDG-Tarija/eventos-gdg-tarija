-- ============================================================
-- Eventos GDG Tarija
-- Agrega el campo speaker_avatar_url a la tabla sessions
-- para almacenar la URL de la foto de perfil del ponente.
-- ============================================================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS speaker_avatar_url text;

COMMENT ON COLUMN public.sessions.speaker_avatar_url IS 'URL de la imagen de perfil / avatar del speaker';
