-- ============================================================
-- Eventos GDG Tarija — Auth setup for public.users
-- RLS policies + auto-create trigger (no FK to avoid orphans)
-- ============================================================

-- Enable RLS (idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant base table permissions needed by Supabase REST API
GRANT ALL ON TABLE public.users TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;


-- RLS policies (drop first to avoid duplicates on re-run)
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;

CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow unauthenticated inserts during OAuth callback setup
DROP POLICY IF EXISTS users_insert_temp ON public.users;
CREATE POLICY users_insert_temp ON public.users
  FOR INSERT WITH CHECK (true);


-- Auto-create public.user row when a new auth user signs up
-- NOTE: exceptions are caught internally so that a profile insert failure
-- never prevents the auth user from being created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- RPC function for frontend: upsert user profile (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_avatar_url text DEFAULT null
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- If a row with this email exists under a different id (e.g. re-registration),
  -- update it to use the new auth id
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

  -- Normal upsert by id
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


-- RPC function for frontend: update own profile fields (SECURITY DEFINER = bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_first_name text,
  p_last_name text,
  p_phone text
)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(text, text, text) TO anon, authenticated;

-- Refresh PostgREST schema cache (helps avoid 404 on /rpc/* after creating functions)
NOTIFY pgrst, 'reload schema';
