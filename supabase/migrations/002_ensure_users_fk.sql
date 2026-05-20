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
