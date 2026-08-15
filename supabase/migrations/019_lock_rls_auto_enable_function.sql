-- rls_auto_enable() es la función del event trigger creado desde
-- Studio (Database > Policies > "Set up trigger") para forzar RLS
-- en tablas nuevas. No debe ser invocable directo vía /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
