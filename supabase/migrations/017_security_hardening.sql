-- ============================================================
-- Eventos GDG Tarija — Hardening de seguridad
-- Corrige: RLS deshabilitado en staff_whitelist/users/events/
-- ticket_types/registrations (escritura pública total), policies
-- anon de escritura en sponsors, IDOR en update_user_profile /
-- upsert_user_profile, y exposición pública de event_coupons.
--
-- Contexto: staff_whitelist está vacía en producción; el flag real
-- que usa la app hoy es users.is_staff (3 usuarios). is_staff()
-- reconoce ambos mecanismos para no romper accesos existentes.
-- ============================================================

-- 1. Helper: identifica si el usuario autenticado es staff.
--    SECURITY DEFINER para poder leer users/staff_whitelist sin
--    quedar bloqueado por las policies de esas mismas tablas.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_staff FROM public.users WHERE id = auth.uid()), false)
     OR EXISTS (
       SELECT 1 FROM public.staff_whitelist sw
       JOIN auth.users au ON au.email = sw.email
       WHERE au.id = auth.uid()
     );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- 2. Habilitar RLS en las tablas expuestas sin protección.
ALTER TABLE public.staff_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 3. staff_whitelist: sin policies -> solo accesible por
--    postgres/service_role (dueño de la tabla). Ni anon ni
--    authenticated pueden leer ni escribir esta tabla.

-- 4. events: lectura pública solo de eventos publicados;
--    escritura solo para staff.
DROP POLICY IF EXISTS "public_read_published_events" ON public.events;
CREATE POLICY "public_read_published_events"
  ON public.events FOR SELECT
  USING (is_published = true OR public.is_staff());

DROP POLICY IF EXISTS "staff_write_events" ON public.events;
CREATE POLICY "staff_write_events"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 5. ticket_types: lectura pública (necesaria para checkout),
--    escritura solo staff.
DROP POLICY IF EXISTS "public_read_ticket_types" ON public.ticket_types;
CREATE POLICY "public_read_ticket_types"
  ON public.ticket_types FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "staff_write_ticket_types" ON public.ticket_types;
CREATE POLICY "staff_write_ticket_types"
  ON public.ticket_types FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 6. registrations: cada quien ve/crea la suya; staff ve/gestiona todas.
--    (las policies de "Users can view own..." / "...inscribirse..." ya
--    existían pero nunca se aplicaron porque RLS estaba deshabilitado)
DROP POLICY IF EXISTS "Users can view own registrations" ON public.registrations;
DROP POLICY IF EXISTS "staff_select_all_registrations" ON public.registrations;
CREATE POLICY "select_own_or_staff_registrations"
  ON public.registrations FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "Usuarios pueden inscribirse a eventos" ON public.registrations;
CREATE POLICY "insert_own_registrations"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_update_registrations" ON public.registrations;
CREATE POLICY "staff_update_registrations"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 7. users: limpiar policies duplicadas/inseguras y dejar un set claro.
--    users_insert_temp permitía insertar cualquier fila sin validar
--    auth.uid() = id — es la más peligrosa, se elimina.
DROP POLICY IF EXISTS "users_insert_temp" ON public.users;
DROP POLICY IF EXISTS "Acceso total a usuarios autenticados" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuarios pueden leer su propio perfil" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Staff full access" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "staff_full_access_users"
  ON public.users FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 8. sponsors: quitar escritura anónima; escritura de authenticated
--    pasa a requerir staff (antes era USING(true), cualquier sesión
--    autenticada podía borrar/editar sponsors).
DROP POLICY IF EXISTS "anon_insert_sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "anon_update_sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "anon_delete_sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "auth_insert_sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "auth_update_sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "auth_delete_sponsors" ON public.sponsors;

CREATE POLICY "staff_insert_sponsors"
  ON public.sponsors FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());
CREATE POLICY "staff_update_sponsors"
  ON public.sponsors FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY "staff_delete_sponsors"
  ON public.sponsors FOR DELETE
  TO authenticated
  USING (public.is_staff());
-- anon_select_sponsors / auth_select_sponsors (lectura) se mantienen igual.

-- 9. event_coupons: la tabla completa de códigos ya no es legible por
--    el rol anon (evita listar/harvestear cupones SPEAKER/STAFF sin
--    login). El checkout siempre corre autenticado, así que esto no
--    rompe la validación de cupones existente.
DROP POLICY IF EXISTS "public_read_event_coupons" ON public.event_coupons;
CREATE POLICY "authenticated_read_event_coupons"
  ON public.event_coupons FOR SELECT
  TO authenticated
  USING (true);

-- 10. update_user_profile(user_id uuid, ...): overload insegura (IDOR),
--     no se usa desde el frontend (solo se llama la variante de 3
--     argumentos que usa auth.uid() internamente). Se elimina.
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text);

-- 11. upsert_user_profile: agregar verificación de propiedad para
--     evitar que cualquiera sobreescriba el perfil de otro usuario
--     pasando un p_id/p_email ajeno.
CREATE OR REPLACE FUNCTION public.upsert_user_profile(p_id uuid, p_email text, p_first_name text, p_last_name text, p_avatar_url text DEFAULT NULL::text)
 RETURNS SETOF users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF p_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado para modificar este perfil' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email AND id <> p_id) THEN
    UPDATE public.users SET
      id = p_id,
      first_name = p_first_name,
      last_name = p_last_name,
      avatar_url = COALESCE(p_avatar_url, avatar_url)
    WHERE email = p_email;
    RETURN QUERY SELECT * FROM public.users WHERE id = p_id;
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (p_id, p_email, p_first_name, p_last_name, p_avatar_url)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url)
  RETURNING *;
END;
$$;

-- 12. registrar_asistencia_qr: no se usa desde el frontend (apunta a
--     la tabla legacy inscripciones_sessions, vacía). Se revoca
--     ejecución pública en vez de mantenerla abierta sin uso.
REVOKE EXECUTE ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) FROM anon, authenticated, public;
