# Supabase

La base de datos (migraciones, `config.toml`, seed) vive en el repo hermano
[back-office-gdg-tarija](https://github.com/GDG-Tarija/back-office-gdg-tarija) → `supabase/`.
Este repo ya no guarda migraciones: crea las nuevas allá, vía PR.

Para desarrollar esta app con una base local, clona back-office al lado de este repo y sigue
su sección "Entorno local" del README:

```bash
cd ../back-office-gdg-tarija
npm install
npm run db:start      # levanta Supabase local en http://127.0.0.1:54321
```

Luego, en este repo: `cp src/environments/environment.eg.ts src/environments/environment.ts`
y `npm start`.

Las migraciones históricas que vivían aquí (002–021, `back.sql`, `sponsors.sql`) se eliminaron: la
línea base `20261024032707_baseline.sql` de back-office las reemplaza. Siguen disponibles en el
historial de git de eventos-gdg-tarija (antes del 2026-10-24).
