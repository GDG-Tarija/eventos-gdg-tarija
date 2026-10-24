---
name: create-seed
description: Generate a Supabase seed SQL script (15 rows) for a given entity, based on its migration schema. Use when the user asks to create/generate seed data for a table.
---

Crea un script SQL de seed para insertar datos de prueba en Supabase para la entidad `$ARGUMENTS`.

Usa razonamiento: adaptive thinking.

1. Analiza las columnas de la entidad `$ARGUMENTS` en `.opencode/skills/database-and-features/SKILL.md`. Si la entidad no está documentada ahí, revisa la migración correspondiente en `../back-office-gdg-tarija/supabase/migrations/` primero (la base vive allá).
2. Analiza la definición de la tabla en `../back-office-gdg-tarija/supabase/migrations/20261024032707_baseline.sql` (o la migración que la creó) y agrega una sección con 15 registros ficticios a `../back-office-gdg-tarija/supabase/seed.sql` (el único seed que carga `npm run db:reset`). Nunca uses datos reales.
3. Verifica que el script sea correcto y compatible con Supabase/Postgres (tipos de columna, FKs con `on delete`, defaults).
