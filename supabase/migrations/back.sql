-- DROP TYPE public."state_enum";

CREATE TYPE public."state_enum" AS ENUM (
	'ACTIVE',
	'INACTIVE');

-- =============================================
-- FUNCIONES DE TRIGGER (deben ir antes de las tablas)
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO public;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO postgres;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

ALTER FUNCTION public.set_updated_at() OWNER TO postgres;
GRANT ALL ON FUNCTION public.set_updated_at() TO public;
GRANT ALL ON FUNCTION public.set_updated_at() TO postgres;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

-- =============================================
-- TABLAS
-- =============================================

-- public.events definition

CREATE TABLE public.events ( id uuid DEFAULT gen_random_uuid() NOT NULL, title varchar(255) NOT NULL, slug varchar(255) NOT NULL, event_type varchar(20) NOT NULL, capacity int4 NOT NULL, date_start timestamptz NOT NULL, date_end timestamptz NULL, is_published bool DEFAULT false NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, description text NULL, image_url text NULL, banner_url text NULL, location_type varchar DEFAULT 'PHYSICAL'::character varying NULL, location_name text NULL, address_link text NULL, category varchar NULL, extra_info jsonb DEFAULT '{}'::jsonb NULL, CONSTRAINT check_location_type CHECK (((location_type)::text = ANY ((ARRAY['PHYSICAL'::character varying, 'VIRTUAL'::character varying, 'HYBRID'::character varying])::text[]))), CONSTRAINT events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['MEETUP'::character varying, 'CONFERENCE'::character varying, 'HACKATHON'::character varying, 'WORKSHOP'::character varying])::text[]))), CONSTRAINT events_pkey PRIMARY KEY (id), CONSTRAINT events_slug_key UNIQUE (slug));

create trigger update_events_updated_at before
update
    on
    public.events for each row execute function update_updated_at_column();

ALTER TABLE public.events OWNER TO postgres;
GRANT ALL ON TABLE public.events TO postgres;
GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;


-- public.sponsors definition

CREATE TABLE public.sponsors ( id uuid DEFAULT gen_random_uuid() NOT NULL, "name" text NULL, description text NULL, score text NULL, state public."state_enum" DEFAULT 'ACTIVE'::state_enum NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT sponsors_pkey PRIMARY KEY (id));

create trigger trg_set_updated_at before
update
    on
    public.sponsors for each row execute function set_updated_at();
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_select_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR SELECT
 TO authenticated
 USING (true);
CREATE POLICY auth_insert_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK (true);
CREATE POLICY auth_update_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING (true)
 WITH CHECK (true);
CREATE POLICY auth_delete_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR DELETE
 TO authenticated
 USING (true);
CREATE POLICY anon_select_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR SELECT
 TO anon
 USING (true);
CREATE POLICY anon_insert_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR INSERT
 TO anon
 WITH CHECK (true);
CREATE POLICY anon_update_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR UPDATE
 TO anon
 USING (true)
 WITH CHECK (true);
CREATE POLICY anon_delete_sponsors ON public.sponsors
 AS PERMISSIVE
 FOR DELETE
 TO anon
 USING (true);

ALTER TABLE public.sponsors OWNER TO postgres;
GRANT ALL ON TABLE public.sponsors TO postgres;
GRANT ALL ON TABLE public.sponsors TO anon;
GRANT ALL ON TABLE public.sponsors TO authenticated;
GRANT ALL ON TABLE public.sponsors TO service_role;


-- public.staff_whitelist definition

CREATE TABLE public.staff_whitelist ( id uuid DEFAULT gen_random_uuid() NOT NULL, email varchar(255) NOT NULL, "role" varchar(20) NOT NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT staff_whitelist_email_key UNIQUE (email), CONSTRAINT staff_whitelist_pkey PRIMARY KEY (id), CONSTRAINT staff_whitelist_role_check CHECK (((role)::text = ANY ((ARRAY['SUPERADMIN'::character varying, 'STAFF'::character varying])::text[]))));

create trigger update_staff_whitelist_updated_at before
update
    on
    public.staff_whitelist for each row execute function update_updated_at_column();

ALTER TABLE public.staff_whitelist OWNER TO postgres;
GRANT ALL ON TABLE public.staff_whitelist TO postgres;
GRANT ALL ON TABLE public.staff_whitelist TO anon;
GRANT ALL ON TABLE public.staff_whitelist TO authenticated;
GRANT ALL ON TABLE public.staff_whitelist TO service_role;


-- public.tracks definition

CREATE TABLE public.tracks ( id uuid DEFAULT gen_random_uuid() NOT NULL, evento_id uuid NOT NULL, nombre text NOT NULL, descripcion text NULL, created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL, CONSTRAINT tracks_pkey PRIMARY KEY (id));
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tracks OWNER TO postgres;
GRANT ALL ON TABLE public.tracks TO postgres;
GRANT ALL ON TABLE public.tracks TO anon;
GRANT ALL ON TABLE public.tracks TO authenticated;
GRANT ALL ON TABLE public.tracks TO service_role;


-- public.users definition

CREATE TABLE public.users ( id uuid NOT NULL, email varchar(255) NOT NULL, first_name varchar(100) NOT NULL, last_name varchar(100) NOT NULL, avatar_url text NULL, phone varchar(20) NULL, extra_info jsonb NULL, is_staff bool DEFAULT false NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (id));

create trigger update_users_updated_at before
update
    on
    public.users for each row execute function update_updated_at_column();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total a usuarios autenticados" ON public.users
 AS PERMISSIVE
 FOR ALL
 USING ((auth.uid() = id))
 WITH CHECK ((auth.uid() = id));
CREATE POLICY "Staff full access" ON public.users
 AS PERMISSIVE
 FOR ALL
 USING ((EXISTS ( SELECT 1
   FROM staff_whitelist
  WHERE ((staff_whitelist.email)::text = (( SELECT users_1.email
           FROM auth.users users_1
          WHERE (users_1.id = auth.uid())))::text))));
CREATE POLICY "Users can view own profile" ON public.users
 AS PERMISSIVE
 FOR SELECT
 USING ((auth.uid() = id));
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.users
 AS PERMISSIVE
 FOR UPDATE
 TO authenticated
 USING ((auth.uid() = id))
 WITH CHECK ((auth.uid() = id));
CREATE POLICY "Usuarios pueden insertar su propio perfil" ON public.users
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK ((auth.uid() = id));
CREATE POLICY "Usuarios pueden leer su propio perfil" ON public.users
 AS PERMISSIVE
 FOR SELECT
 USING ((auth.uid() = id));
CREATE POLICY users_insert_own ON public.users
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK ((id = auth.uid()));
CREATE POLICY users_insert_temp ON public.users
 AS PERMISSIVE
 FOR INSERT
 WITH CHECK (true);
CREATE POLICY users_select_own ON public.users
 AS PERMISSIVE
 FOR SELECT
 USING ((id = auth.uid()));
CREATE POLICY users_update_own ON public.users
 AS PERMISSIVE
 FOR UPDATE
 USING ((id = auth.uid()))
 WITH CHECK ((id = auth.uid()));

ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON TABLE public.users TO postgres;
GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


-- public.sessions definition

CREATE TABLE public.sessions ( id uuid DEFAULT gen_random_uuid() NOT NULL, event_id uuid NOT NULL, title varchar(255) NOT NULL, capacity int4 NOT NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT sessions_pkey PRIMARY KEY (id), CONSTRAINT sessions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE);

create trigger update_sessions_updated_at before
update
    on
    public.sessions for each row execute function update_updated_at_column();
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sessions OWNER TO postgres;
GRANT ALL ON TABLE public.sessions TO postgres;
GRANT ALL ON TABLE public.sessions TO anon;
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.sessions TO service_role;


-- public.ticket_types definition

CREATE TABLE public.ticket_types ( id uuid DEFAULT gen_random_uuid() NOT NULL, event_id uuid NOT NULL, "name" varchar(100) NOT NULL, price numeric(10, 2) DEFAULT 0.00 NOT NULL, ticket_capacity int4 NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, payment_qr_url text NULL, description text NULL, image_url text NULL, CONSTRAINT check_qr_for_paid_tickets CHECK ((((price = 0.00) AND (payment_qr_url IS NULL)) OR ((price > 0.00) AND (payment_qr_url IS NOT NULL) AND (payment_qr_url <> ''::text)))), CONSTRAINT ticket_types_event_id_name_key UNIQUE (event_id, name), CONSTRAINT ticket_types_pkey PRIMARY KEY (id), CONSTRAINT ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE);

create trigger update_ticket_types_updated_at before
update
    on
    public.ticket_types for each row execute function update_updated_at_column();

ALTER TABLE public.ticket_types OWNER TO postgres;
GRANT ALL ON TABLE public.ticket_types TO postgres;
GRANT ALL ON TABLE public.ticket_types TO anon;
GRANT ALL ON TABLE public.ticket_types TO authenticated;
GRANT ALL ON TABLE public.ticket_types TO service_role;


-- public.inscripciones_sessions definition

CREATE TABLE public.inscripciones_sessions ( id uuid DEFAULT gen_random_uuid() NOT NULL, usuario_id uuid NOT NULL, session_id uuid NOT NULL, inscrito_en timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL, asistio bool DEFAULT false NOT NULL, checked_in_at timestamptz NULL, CONSTRAINT inscripciones_sessions_pkey PRIMARY KEY (id), CONSTRAINT unique_usuario_session UNIQUE (usuario_id, session_id), CONSTRAINT inscripciones_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE);
ALTER TABLE public.inscripciones_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.inscripciones_sessions OWNER TO postgres;
GRANT ALL ON TABLE public.inscripciones_sessions TO postgres;
GRANT ALL ON TABLE public.inscripciones_sessions TO anon;
GRANT ALL ON TABLE public.inscripciones_sessions TO authenticated;
GRANT ALL ON TABLE public.inscripciones_sessions TO service_role;


-- public.registrations definition

CREATE TABLE public.registrations ( id uuid DEFAULT gen_random_uuid() NOT NULL, event_id uuid NOT NULL, user_id uuid NULL, ticket_type_id uuid NOT NULL, event_role varchar(20) DEFAULT 'ATTENDEE'::character varying NOT NULL, status varchar(20) DEFAULT 'REGISTERED'::character varying NOT NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, custom_responses jsonb DEFAULT '{}'::jsonb NULL, payment_proof_url text NULL, CONSTRAINT registrations_event_id_user_id_key UNIQUE (event_id, user_id), CONSTRAINT registrations_event_role_check CHECK (((event_role)::text = ANY ((ARRAY['ATTENDEE'::character varying, 'SPEAKER'::character varying, 'SPONSOR'::character varying, 'STAFF'::character varying])::text[]))), CONSTRAINT registrations_pkey PRIMARY KEY (id), CONSTRAINT registrations_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying])::text[]))), CONSTRAINT registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE, CONSTRAINT registrations_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.ticket_types(id) ON DELETE RESTRICT, CONSTRAINT registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL);

create trigger update_registrations_updated_at before
update
    on
    public.registrations for each row execute function update_updated_at_column();

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations" ON public.registrations
 AS PERMISSIVE
 FOR SELECT
 USING ((auth.uid() = user_id));
CREATE POLICY "Usuarios pueden inscribirse a eventos" ON public.registrations
 AS PERMISSIVE
 FOR INSERT
 TO authenticated
 WITH CHECK ((auth.uid() = user_id));

ALTER TABLE public.registrations OWNER TO postgres;
GRANT ALL ON TABLE public.registrations TO postgres;
GRANT ALL ON TABLE public.registrations TO anon;
GRANT ALL ON TABLE public.registrations TO authenticated;
GRANT ALL ON TABLE public.registrations TO service_role;


-- public.scan_logs definition

CREATE TABLE public.scan_logs ( id uuid DEFAULT gen_random_uuid() NOT NULL, registration_id uuid NOT NULL, scanned_by uuid NULL, scan_type varchar(30) NOT NULL, scanned_at timestamptz DEFAULT now() NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT scan_logs_pkey PRIMARY KEY (id), CONSTRAINT scan_logs_scan_type_check CHECK (((scan_type)::text = ANY ((ARRAY['CHECK_IN_DOOR'::character varying, 'SNACK_DAY_1'::character varying, 'LUNCH_DAY_2'::character varying, 'SWAG_DELIVERY'::character varying, 'SESSION_IN'::character varying])::text[]))), CONSTRAINT scan_logs_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE, CONSTRAINT scan_logs_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(id) ON DELETE SET NULL);

create trigger update_scan_logs_updated_at before
update
    on
    public.scan_logs for each row execute function update_updated_at_column();
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scan_logs OWNER TO postgres;
GRANT ALL ON TABLE public.scan_logs TO postgres;
GRANT ALL ON TABLE public.scan_logs TO anon;
GRANT ALL ON TABLE public.scan_logs TO authenticated;
GRANT ALL ON TABLE public.scan_logs TO service_role;


-- public.session_registrations definition

CREATE TABLE public.session_registrations ( registration_id uuid NOT NULL, session_id uuid NOT NULL, registered_at timestamptz DEFAULT now() NULL, CONSTRAINT session_registrations_pkey PRIMARY KEY (registration_id, session_id), CONSTRAINT session_registrations_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id) ON DELETE CASCADE, CONSTRAINT session_registrations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE);
ALTER TABLE public.session_registrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.session_registrations OWNER TO postgres;
GRANT ALL ON TABLE public.session_registrations TO postgres;
GRANT ALL ON TABLE public.session_registrations TO anon;
GRANT ALL ON TABLE public.session_registrations TO authenticated;
GRANT ALL ON TABLE public.session_registrations TO service_role;


-- =============================================
-- FUNCIONES DE NEGOCIO
-- =============================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS SETOF users
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.users
  WHERE id = auth.uid();
$function$
;

ALTER FUNCTION public.get_my_profile() OWNER TO postgres;
GRANT ALL ON FUNCTION public.get_my_profile() TO public;
GRANT ALL ON FUNCTION public.get_my_profile() TO postgres;
GRANT ALL ON FUNCTION public.get_my_profile() TO anon;
GRANT ALL ON FUNCTION public.get_my_profile() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_profile() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data ->> 'given_name',
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(NEW.raw_user_meta_data ->> 'family_name', ''),
      COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture'
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: could not auto-create profile for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$
;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT ALL ON FUNCTION public.handle_new_user() TO public;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE OR REPLACE FUNCTION public.registrar_asistencia_qr(p_usuario_id uuid, p_session_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_existe_inscripcion INT;
BEGIN
    SELECT COUNT(*) INTO v_existe_inscripcion
    FROM public.inscripciones_sessions
    WHERE usuario_id = p_usuario_id AND session_id = p_session_id;

    IF v_existe_inscripcion = 0 THEN
        RETURN 'ERROR_NO_INSCRITO_EN_SESION';
    END IF;

    UPDATE public.inscripciones_sessions
    SET asistio = TRUE,
        checked_in_at = timezone('utc'::text, now())
    WHERE usuario_id = p_usuario_id AND session_id = p_session_id;

    RETURN 'OK';
END;
$function$
;

ALTER FUNCTION public.registrar_asistencia_qr(uuid, uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) TO public;
GRANT ALL ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) TO postgres;
GRANT ALL ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) TO anon;
GRANT ALL ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.registrar_asistencia_qr(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_first_name text, p_last_name text, p_phone text)
 RETURNS SETOF users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.users
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    phone = p_phone
  WHERE id = auth.uid()
  RETURNING *;
END;
$function$
;

ALTER FUNCTION public.update_user_profile(text, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.update_user_profile(text, text, text) TO public;
GRANT ALL ON FUNCTION public.update_user_profile(text, text, text) TO postgres;
GRANT ALL ON FUNCTION public.update_user_profile(text, text, text) TO anon;
GRANT ALL ON FUNCTION public.update_user_profile(text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.update_user_profile(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.update_user_profile(user_id uuid, first_name text, last_name text, phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.users
  SET
    first_name = update_user_profile.first_name,
    last_name = update_user_profile.last_name,
    phone = update_user_profile.phone
  WHERE id = user_id;
END;
$function$
;

ALTER FUNCTION public.update_user_profile(uuid, text, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.update_user_profile(uuid, text, text, text) TO public;
GRANT ALL ON FUNCTION public.update_user_profile(uuid, text, text, text) TO postgres;
GRANT ALL ON FUNCTION public.update_user_profile(uuid, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.update_user_profile(uuid, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.update_user_profile(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_user_profile(p_id uuid, p_email text, p_first_name text, p_last_name text, p_avatar_url text DEFAULT NULL::text)
 RETURNS SETOF users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
$function$
;

ALTER FUNCTION public.upsert_user_profile(uuid, text, text, text, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.upsert_user_profile(uuid, text, text, text, text) TO public;
GRANT ALL ON FUNCTION public.upsert_user_profile(uuid, text, text, text, text) TO postgres;
GRANT ALL ON FUNCTION public.upsert_user_profile(uuid, text, text, text, text) TO anon;
GRANT ALL ON FUNCTION public.upsert_user_profile(uuid, text, text, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.upsert_user_profile(uuid, text, text, text, text) TO service_role;
