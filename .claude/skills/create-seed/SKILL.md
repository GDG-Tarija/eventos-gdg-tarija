---
name: create-seed
description: Generate a Supabase seed SQL script (15 rows) for a given entity, based on its migration schema. Use when the user asks to create/generate seed data for a table.
---

Crea un script SQL de seed para insertar datos de prueba en Supabase para la entidad `$ARGUMENTS`.

Usa razonamiento: adaptive thinking.

1. Analiza las columnas de la entidad `$ARGUMENTS` en `.opencode/skills/database-and-features/SKILL.md`. Si la entidad no está documentada ahí, revisa la migración correspondiente en `supabase/migrations/` primero.
2. Analiza el script de la migración base en `supabase/migrations/$ARGUMENTS.sql` (o el nombre de migración correspondiente) y crea un script para insertar 15 registros en `supabase/seeds/$ARGUMENTS.sql`.
3. Verifica que el script sea correcto y compatible con Supabase/Postgres (tipos de columna, FKs con `on delete`, defaults).
