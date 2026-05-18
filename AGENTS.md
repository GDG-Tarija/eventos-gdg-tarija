# AGENTS.md

> Instrucciones para agentes de IA (OpenCode, Claude Code, Cursor, Copilot) trabajando en este repositorio.

Este es el proyecto **GDG Events Platform**, una PWA en Angular 21 + Supabase para gestionar eventos de la comunidad Google Developer Groups.


---

## Comandos del proyecto

```bash
# Desarrollo
npm start                    # ng serve, http://localhost:4200
npm run build                # build de producción
npm run watch                # build en modo watch

# Calidad
npm run lint                 # ESLint
npm run test                 # Karma + Jasmine (unit tests)
npm run test:ci              # tests sin watch, para CI
npm run format               # Prettier sobre src/

# Supabase (local)
supabase start               # arranca stack local (Postgres, Auth, Storage)
supabase db reset            # reset + reaplica migraciones
supabase db diff -f <nombre> # genera nueva migración desde cambios
supabase gen types typescript --local > src/app/core/models/database.types.ts
```

> Si algún comando no existe aún en `package.json`, agrégalo antes de usarlo y documéntalo aquí.

---

## Reglas que el agente DEBE seguir

### Arquitectura
1. **Standalone components siempre.** Nada de `NgModule`. Angular 21 + signals.
2. **Signal Forms** para formularios nuevos (no `ReactiveFormsModule`).
3. **Lazy loading** por feature en `app.routes.ts` con `loadComponent` / `loadChildren`.
4. **No importar `@supabase/supabase-js` en componentes.** Todo acceso a Supabase pasa por un service en `core/supabase/` o `features/<feature>/data/`.
5. **Tipos de Supabase generados, nunca a mano.** Regenerar con `supabase gen types` tras cada migración.

### Seguridad
6. **RLS es la fuente de verdad de permisos.** El frontend usa guards para UX, pero la seguridad real está en políticas SQL (ver `entities.md` § 5).
7. **Nunca commitear `service_role` keys.** Solo `anon` key va al frontend. `.env.local` está en `.gitignore`.
8. **Validación doble:** cliente (UX rápido) + DB (constraints + RLS).

### Base de datos
9. **Antes de usar una columna, verifica que exista en `entities.md`.** Si no existe, propón una migración primero.
10. **Toda migración va a `supabase/migrations/`** con timestamp. Nada de cambios manuales en Studio sin migración.
11. **Cada FK declara `on delete` explícito.** Cada tabla tiene `id`, `created_at`, `updated_at`.

### Estilo de código
12. **TypeScript estricto.** `strict: true`, `noImplicitAny`, `strictNullChecks` activados.
13. **Nombres:** `PascalCase` para clases/componentes, `camelCase` para variables/métodos, `kebab-case` para archivos y selectores, `snake_case` para columnas/tablas SQL.
14. **Imports ordenados:** Angular core → librerías → `@/core` → `@/shared` → `@/features` → relativos.
15. **No `any`.** Si es inevitable, comenta el porqué. Preferir `unknown` + narrowing.
16. **No comentarios redundantes.** El nombre debe explicar; el comentario solo justifica el "por qué".

### Tests
17. **Al menos un test happy-path** por servicio que toque Supabase (usar mocks del cliente).
18. **No mockear lo que no es de terceros.** Mockea Supabase, HTTP, router. No mockees tus propios services planos.

### UI / UX
19. **Angular Material 3** como única librería de UI. No mezclar con Bootstrap, Tailwind, etc.
20. **Mobile-first** en vistas públicas (`/e/:slug`, `/login`). **Desktop-first** en `/dashboard`.
21. **Accesibilidad:** todos los iconos sin texto llevan `aria-label`. Navegable con teclado.

---

## Convenciones de commits

Conventional Commits en español o inglés (consistente por PR):

```
feat(events): agregar formulario de creación de evento
fix(registration): validar tamaño máximo de comprobante
chore(db): migración inicial de tablas MVP
docs(agents): actualizar comandos de Supabase
refactor(auth): extraer SupabaseAuthService a core/
test(events): cubrir caso de evento sin capacidad
```

Un PR = un hito o sub-tarea pequeña. No mezclar feat con refactor masivo.

---

## Estructura del repositorio

```
.
├── AGENTS.md                # este archivo
├── src/
│   ├── app/
│   │   ├── core/            # singletons: auth, supabase client, guards, interceptores
│   │   ├── shared/          # componentes/pipes/directivas reutilizables
│   │   ├── features/        # feature modules (lazy loaded)
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   └── public/
│   │   ├── layouts/        # Layouts containers (lazy loaded)
│   │   │   ├── admin-layout/
│   │   │   ├── auth-layout/
│   │   │   └── public-layout/
│   │   └── app.routes.ts
│   ├── environments/
│   └── styles/              # tema Material 3 (paleta GDG)
├── supabase/
│   ├── migrations/
│   └── seeds/
└── package.json
```

---

## Hoja de ruta — Etapa 1 (MVP)

Trabajamos en este orden. **No saltarse hitos** salvo justificación explícita.

- [ ] **Hito 1.1** — CRUD de eventos (panel del organizador)
- [ ] **Hito 1.2** — Registro público de asistentes en `/e/:slug` (8 campos + comprobante)
- [ ] **Hito 1.3** — Autenticación con magic link (Supabase Auth)

Módulos A–H se desarrollan en paralelo **después** del MVP. Ver `CONTEXT.md` § Hoja de ruta para el detalle de cada uno.

---

## Cuando recibas una tarea, sigue este flujo

1. **Lee** `CONTEXT.md` y `entities.md` si no los tienes en contexto.
2. **Identifica el hito** al que pertenece la tarea (1.1, 1.2, 1.3 o módulo A–H).
3. **Verifica el esquema:** ¿las tablas/columnas que necesitas existen en `entities.md`?
   - Si **no**, primero genera la migración SQL y actualiza `entities.md`.
4. **Genera tipos** (`supabase gen types`) si la migración afectó tablas.
5. **Escribe el código** siguiendo las reglas de arriba.
6. **Añade tests** (al menos happy-path).
7. **Verifica lint** (`npm run lint`).
8. **Resume los cambios** al usuario con: archivos tocados, comandos a correr, supuestos.

---

## Preguntas a hacer antes de codear (si hay ambigüedad)

- ¿Esta tarea es del MVP (Etapa 1) o de un módulo futuro?
- ¿Requiere cambio de esquema? Si sí, ¿hay migración?
- ¿Qué rol del usuario está involucrado (anonymous, attendee, organizer, super_admin)?
- ¿Existe ya un service para esta entidad o hay que crearlo?

No asumas en silencio: pregunta o documenta el supuesto en el código.
