-- ============================================================
-- Eventos GDG Tarija
-- Crear la tabla event_coupons y añadir soporte para cupones
-- de invitación en las inscripciones de los eventos.
-- ============================================================

-- 1. Crear tabla de cupones
CREATE TABLE IF NOT EXISTS public.event_coupons (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  code varchar(50) NOT NULL,
  role varchar(20) DEFAULT 'ATTENDEE'::character varying NOT NULL,
  max_uses integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NULL,
  updated_at timestamptz DEFAULT now() NULL,
  CONSTRAINT event_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT event_coupons_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_coupons_event_id_code_key UNIQUE (event_id, code),
  CONSTRAINT event_coupons_role_check CHECK (((role)::text = ANY ((ARRAY['ATTENDEE'::character varying, 'SPEAKER'::character varying, 'SPONSOR'::character varying, 'STAFF'::character varying])::text[])))
);

-- 2. Habilitar RLS en event_coupons
ALTER TABLE public.event_coupons ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.event_coupons TO anon, authenticated, service_role;

-- 3. Crear política de lectura pública para validación
DROP POLICY IF EXISTS "public_read_event_coupons" ON public.event_coupons;
CREATE POLICY "public_read_event_coupons"
  ON public.event_coupons FOR SELECT
  USING (true);

-- 4. Agregar columna coupon_id a registrations si no existe
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.event_coupons(id) ON DELETE SET NULL;

-- 5. Crear función y trigger para procesar cupones de invitación
CREATE OR REPLACE FUNCTION public.process_registration_coupon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ejecutar con privilegios elevados para contar registros saltando RLS restrictivo
AS $$
DECLARE
  v_coupon_role       varchar(20);
  v_coupon_max_uses   integer;
  v_coupon_used       integer;
BEGIN
  -- Si no se suministró un cupón, no hay nada que validar
  IF NEW.coupon_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener datos del cupón y validar que pertenezca al evento
  SELECT role, max_uses
    INTO v_coupon_role, v_coupon_max_uses
    FROM public.event_coupons
   WHERE id = NEW.coupon_id
     AND event_id = NEW.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El código de invitación o cupón no es válido para este evento.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Validar que no se haya superado el límite de usos
  SELECT count(*)
    INTO v_coupon_used
    FROM public.registrations
   WHERE coupon_id = NEW.coupon_id;

  IF v_coupon_used >= v_coupon_max_uses THEN
    RAISE EXCEPTION 'El código de invitación ya ha superado el número máximo de usos permitidos.'
      USING ERRCODE = 'P0003';
  END IF;

  -- Forzar el rol e inscripción confirmada si es un cupón de invitación (Speaker/Staff/Sponsor)
  IF v_coupon_role <> 'ATTENDEE' THEN
    NEW.event_role := v_coupon_role;
    NEW.status     := 'CONFIRMED';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.process_registration_coupon() IS
  'Valida las restricciones del cupón/código de invitación de forma atómica y configura el rol y estado del asistente.';

DROP TRIGGER IF EXISTS trg_process_registration_coupon ON public.registrations;
CREATE TRIGGER trg_process_registration_coupon
  BEFORE INSERT ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.process_registration_coupon();

-- 6. Función de utilidad para obtener el conteo de usos de un cupón de forma segura (saltando RLS)
CREATE OR REPLACE FUNCTION public.get_coupon_uses(p_coupon_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)
    INTO v_count
    FROM public.registrations
   WHERE coupon_id = p_coupon_id;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.get_coupon_uses(uuid) IS
  'Obtiene el conteo real de usos de un cupón determinado, saltándose las restricciones de RLS de registrations.';

