-- ============================================================
-- Eventos GDG Tarija
-- Crear la función RPC get_public_certificate para permitir
-- consultar de forma segura los certificados válidos sin RLS restrictivo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_certificate(p_registration_id uuid)
RETURNS TABLE (
  registration_id uuid,
  event_id uuid,
  event_title varchar,
  event_slug varchar,
  event_banner_url text,
  event_date_start timestamptz,
  event_date_end timestamptz,
  event_role varchar,
  ticket_name varchar,
  check_in_date timestamptz,
  user_first_name varchar,
  user_last_name varchar,
  user_email varchar,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios elevados para saltar RLS de consulta directa
AS $$
BEGIN
  -- Validamos de forma estricta que la inscripción cuente con registro de asistencia (check-in)
  IF NOT EXISTS (
    SELECT 1 FROM public.scan_logs
    WHERE registration_id = p_registration_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id AS registration_id,
    r.event_id,
    e.title AS event_title,
    e.slug AS event_slug,
    e.banner_url AS event_banner_url,
    e.date_start AS event_date_start,
    e.date_end AS event_date_end,
    r.event_role AS event_role,
    t.name AS ticket_name,
    COALESCE(s.scanned_at, r.created_at) AS check_in_date,
    u.first_name AS user_first_name,
    u.last_name AS user_last_name,
    u.email AS user_email,
    r.user_id
  FROM public.registrations r
  INNER JOIN public.events e ON e.id = r.event_id
  LEFT JOIN public.ticket_types t ON t.id = r.ticket_type_id
  LEFT JOIN public.users u ON u.id = r.user_id
  LEFT JOIN LATERAL (
    SELECT scanned_at FROM public.scan_logs
    WHERE registration_id = r.id
    ORDER BY scanned_at ASC
    LIMIT 1
  ) s ON true
  WHERE r.id = p_registration_id;
END;
$$;

COMMENT ON FUNCTION public.get_public_certificate(uuid) IS
  'Obtiene de forma pública los datos consolidados de un certificado válido (con asistencia registrada) sin comprometer las políticas generales RLS.';

-- Otorgar permisos de ejecución pública
GRANT EXECUTE ON FUNCTION public.get_public_certificate(uuid) TO anon, authenticated, service_role;
