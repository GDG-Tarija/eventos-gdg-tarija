-- ============================================================
-- Eventos GDG Tarija
-- Agrega campos de detalle a sessions:
--   start_time, end_time, speaker, city, level (enum), topic
-- ============================================================

-- 1. Tipo enum para nivel de dificultad
DO $$ BEGIN
  CREATE TYPE public.session_level AS ENUM ('Basico', 'Intermedio', 'Avanzado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Columnas nuevas en sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS date         date,
  ADD COLUMN IF NOT EXISTS start_time   time,
  ADD COLUMN IF NOT EXISTS end_time     time,
  ADD COLUMN IF NOT EXISTS speaker      text,
  ADD COLUMN IF NOT EXISTS city         text,
  ADD COLUMN IF NOT EXISTS level        public.session_level,
  ADD COLUMN IF NOT EXISTS topic        text;

-- Comentarios
COMMENT ON COLUMN public.sessions.date       IS 'Fecha en que se realiza la sesión (ej: 2025-09-20)';
COMMENT ON COLUMN public.sessions.start_time IS 'Hora de inicio de la sesión (ej: 09:00)';
COMMENT ON COLUMN public.sessions.end_time   IS 'Hora de fin de la sesión (ej: 10:00)';
COMMENT ON COLUMN public.sessions.speaker    IS 'Nombre del speaker / ponente';
COMMENT ON COLUMN public.sessions.city       IS 'Ciudad de origen del speaker';
COMMENT ON COLUMN public.sessions.level      IS 'Nivel de dificultad: Basico, Intermedio o Avanzado';
COMMENT ON COLUMN public.sessions.topic      IS 'Temas separados por comas (ej: "Kotlin,Android,Jetpack")';
