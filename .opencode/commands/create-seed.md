Crea script sql para crear un SEED para insertar datos Supabase para la entidad `$ARGUMENTS`

Utiliza un razonamiento: adaptive thinking

1. Analiza las propiedades de la entidad `$ARGUMENTS` definida en `.opencode\docs\entities.md`
2. Analiza la definición de la tabla en `../back-office-gdg-tarija/supabase/migrations/20261024032707_baseline.sql` (o la migración que la creó) y agrega una sección con 15 registros ficticios a `../back-office-gdg-tarija/supabase/seed.sql`. Nunca uses datos reales
3. Verifica si el script es correcto y compatible con supabase.
