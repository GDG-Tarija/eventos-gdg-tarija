---
name: create-crud
description: Scaffold a new admin CRUD feature (dashboard + table + form modal + detail modal + delete confirm + service + migration) following the sponsor reference pattern. Use when the user asks to create/scaffold a new admin CRUD for an entity.
---

Crea un nuevo CRUD para la entidad `$ARGUMENTS`.

Usa razonamiento: adaptive thinking.

1. Toma como ejemplo el CRUD de sponsor en `src/app/features/admin/sponsor` y analízalo para mantener el estilo, con las siguientes consideraciones.
2. Analiza y crea la migración en `../back-office-gdg-tarija/supabase/migrations/` (repo dueño de la base) compatible con Supabase, con todas las configuraciones necesarias (RLS, `on delete`, `id`/`created_at`/`updated_at`). Toma como ejemplo la definición de `sponsors` en `../back-office-gdg-tarija/supabase/migrations/20261024032707_baseline.sql` y crea el archivo con `npm run db:new -- $ARGUMENTS` en back-office-gdg-tarija; pruébalo con `npm run db:reset` allá.
3. Todos los componentes, clases de estilo y variables deben estar en inglés; solo los labels y textos de UI en español. No agregues iconos innecesarios y conserva el estilo base.
4. Ruta base para todo el CRUD: `src/app/features/admin/$ARGUMENTS/`.
5. Usa las columnas/entidades definidas en `.opencode/skills/database-and-features/SKILL.md` y agrega el modelo en `src/app/core/models/$ARGUMENTS.model.ts`. Si la entidad no existe ahí, escribe la migración primero y actualiza ese SKILL.md.
6. El CRUD debe constar de los siguientes componentes, usando Angular Material en modo standalone:
   - `<entity>-dashboard.ts`: página host con búsqueda, tabla y botón de agregar.
     - Tabla (`components/<entity>-table/`) paginada, ordenable (`MatTable`), con columna de acciones: editar, ver, eliminar (con diálogo de confirmación).
   - `components/<entity>-form-modal/`: crear/editar, usa `dialog-frame` para redimensionar/maximizar, labels en ES, validaciones con Signal Forms.
   - `components/<entity>-detail-modal/`: vista de solo lectura con botón de imprimir.
   - `components/<entity>-delete-confirm-modal/`.
7. Crea el servicio `core/services/supabase/sb-$ARGUMENTS.ts` (patrón RxJS + `BehaviorSubject` + `supabase.channel()` para real-time, como los demás servicios admin/CRUD).
8. Registra la ruta lazy (`loadComponent`) bajo `AdminLayout` en `src/app/app.routes.ts`.
9. Ajusta el menú de navegación (`shared/components/nav-menu/`) si corresponde a un nuevo módulo.
10. Reutiliza componentes/directivas/pipes compartidos en `src/app/shared/` cuando sea pertinente.
11. Sigue las reglas de CLAUDE.md: standalone components, signals, Signal Forms, `@if`/`@for`/`@switch`, sin `any` sin justificar, nunca importar `@supabase/supabase-js` en componentes.
12. Corre `npm test` y `npm run build` antes de dar por terminado.
