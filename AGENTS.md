# AGENTS.md

> Instrucciones para agentes de IA (OpenCode, Claude Code, Cursor, Copilot) trabajando en este repositorio.

Este es el proyecto **GDG Events Platform**, una PWA en Angular 21 + Supabase para gestionar eventos de la comunidad Google Developer Groups.


---

## Ramas (obligatorio)

- **`main` no se toca.** Nunca hagas commit, push, merge ni rebase directo a `main`. `main` es producción (Vercel publica desde ahí): solo recibe PRs de release `dev → main`, que mergea un organizador.
- Todo trabajo va en una rama creada desde `dev` (`feat/…`, `fix/…`, `chore/…`) y entra por PR **contra `dev`**.
- Antes de empezar: `git checkout dev && git pull` en este repo y en back-office, y `npm run db:migrate --prefix ../back-office-gdg-tarija` para tener la base local al día.

---

## Levantar el proyecto en local

Requisitos: Docker corriendo (≥ 4 GB de RAM), Node 22, y `eventos-gdg-tarija` y `back-office-gdg-tarija` clonados en la misma carpeta, en la rama `dev`.

```bash
# 1. Base de datos local (vive en back-office)
cd ../back-office-gdg-tarija
npm install                                   # incluye el CLI de Supabase (versión fijada)
cp supabase/.env.example supabase/.env        # client ID + secret de Google: pedirlos a un organizador
npm run db:start                              # Supabase local: migraciones + seed ficticio

# 2. Esta app
cd ../eventos-gdg-tarija
npm install
cp src/environments/environment.eg.ts src/environments/environment.ts
npm start                                     # http://localhost:4200
```

- Studio local: http://127.0.0.1:54323. El back-office corre en http://localhost:4300 (ver su `AGENTS.md`).
- Al terminar: `npm run db:stop --prefix ../back-office-gdg-tarija`.
- Detalle completo (flujo de migraciones, releases, backups): `back-office-gdg-tarija/docs/entornos-supabase.md`.

---

## Comandos del proyecto

```bash
# Desarrollo
npm start                    # ng serve, http://localhost:4200
npm run build                # build de producción
npm run watch                # build en modo watch

# Calidad
npm run lint                 # ESLint
npm test                     # Vitest (vía @angular/build:unit-test), no Karma/Jasmine

# Supabase local (vive en ../back-office-gdg-tarija, requiere Docker)
npm run db:start --prefix ../back-office-gdg-tarija   # Supabase local: http://127.0.0.1:54321, Studio :54323
npm run db:reset --prefix ../back-office-gdg-tarija   # recrea la base local: migraciones + seed ficticio
npm run db:migrate --prefix ../back-office-gdg-tarija # aplica solo las migraciones nuevas (tras git pull de dev)
(cd ../back-office-gdg-tarija && npx supabase gen types typescript --local)   # pegar el tipo Database en src/app/core/supabase/supabase.client.ts
```

> No existen `test:ci` ni `format` en `package.json`. Si necesitas un comando nuevo, agrégalo y documéntalo aquí.
>
> **Migraciones:** `supabase/` (migraciones, `config.toml`, seed) vive solo en `back-office-gdg-tarija`; este repo no guarda copia. Crea las migraciones allá.
>
> **Entornos:** `src/environments/environment.ts` (ignorado por git) apunta al Supabase local (copia `environment.eg.ts`), **nunca a producción**. Solo hay dos entornos: local y prod. Ver `back-office-gdg-tarija/docs/entornos-supabase.md`.

---

## Reglas que el agente DEBE seguir

### Arquitectura
1. **Standalone components siempre.** Nada de `NgModule`. Angular 21 + signals.
2. **Signal Forms** para formularios nuevos (no `ReactiveFormsModule`).
3. **Lazy loading** por feature en `app.routes.ts` con `loadComponent` / `loadChildren`.
4. **No importar `@supabase/supabase-js` en componentes.** Todo acceso a Supabase pasa por un service en `core/services/supabase/` o `features/<feature>/data/`.
5. **Tipos de Supabase generados, nunca a mano.** El tipo `Database` vive en `core/supabase/supabase.client.ts`; regenerarlo (o copiarlo desde back-office-gdg-tarija) tras cada migración.

### Seguridad
6. **RLS es la fuente de verdad de permisos.** El frontend usa guards para UX, pero la seguridad real está en políticas SQL (ver `.opencode/skills/database-and-features/SKILL.md`).
7. **Nunca commitear `service_role` keys.** Solo `anon` key va al frontend. `.env.local` está en `.gitignore`.
8. **Validación doble:** cliente (UX rápido) + DB (constraints + RLS).

### Base de datos
9. **Antes de usar una columna, verifica que exista en `.opencode/skills/database-and-features/SKILL.md`.** Si no existe, propón una migración primero.
10. **Toda migración va a `back-office-gdg-tarija/supabase/migrations/`** (`npm run db:new` allá) y llega a prod solo con el release `dev → main` de back-office, con aprobación manual. **La base va primero:** este repo se publica en Vercel con su propio release `dev → main`, así que se libera después de back-office, con la migración ya aplicada en prod. Nada de cambios manuales en prod (Studio, SQL Editor, escrituras vía MCP).
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
19. **Angular Material 3** como librería de componentes de UI + **Tailwind CSS** para layout, utilities y diseño visual. No mezclar con Bootstrap u otros frameworks.
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
│   │   ├── core/            # auth (guards, services), supabase client, services/supabase/sb-*.ts, models, config
│   │   ├── shared/          # componentes reutilizables (dialog-frame, footer, nav-menu)
│   │   ├── features/        # feature modules (lazy loaded)
│   │   │   ├── auth/        # login, callback, register
│   │   │   ├── admin/       # sponsor (CRUD de referencia), users
│   │   │   ├── dashboard/
│   │   │   └── public/      # home, events (detail, registration), certificates
│   │   ├── layouts/        # Layouts containers (lazy loaded)
│   │   │   ├── admin-layout/
│   │   │   ├── auth-layout/
│   │   │   └── public-layout/
│   │   └── app.routes.ts
│   └── environments/
├── supabase/            # solo README: la base vive en back-office-gdg-tarija/supabase/
└── package.json
```

---

## Hoja de ruta — Etapa 1 (MVP)

Trabajamos en este orden. **No saltarse hitos** salvo justificación explícita.

- [ ] **Hito 1.1** — CRUD de eventos (panel del organizador)
- [ ] **Hito 1.2** — Registro público de asistentes en `/e/:slug` (8 campos + comprobante)
- [ ] **Hito 1.3** — Autenticación con magic link (Supabase Auth)

Módulos A–H se desarrollan en paralelo **después** del MVP. 

---

## Cuando recibas una tarea, sigue este flujo

1. **Lee** `CLAUDE.md` y `.opencode/skills/database-and-features/SKILL.md` si no los tienes en contexto.
2. **Identifica el hito** al que pertenece la tarea (1.1, 1.2, 1.3 o módulo A–H).
3. **Verifica el esquema:** ¿las tablas/columnas que necesitas existen en `database-and-features/SKILL.md`?
   - Si **no**, primero genera la migración SQL (en back-office-gdg-tarija) y actualiza el SKILL.
4. **Genera tipos** desde el Supabase local (`npx supabase gen types typescript --local` en back-office) si la migración afectó tablas.
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
