# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**GDG Events Platform** — Angular 21 PWA + Supabase BaaS for managing Google Developer Groups community events in Tarija, Bolivia. Public attendees register at `/e/:slug`; organizers manage events at `/dashboard`.

---

## Commands

```bash
# Development
npm start            # ng serve → http://localhost:4200
npm run build        # production build
npm run watch        # build --watch (development)
npm run vercel-build # set-env.js + ng build (CI/CD)

# Tests
npm test             # Vitest (not Karma — the test runner is Vitest)

# Supabase local stack
supabase start
supabase db reset
supabase db diff -f <nombre>
supabase gen types typescript --local > src/app/core/supabase/supabase.client.ts
```

> `lint` and `test:ci` are not in `package.json` yet — add them before use and document in `AGENTS.md`.

---

## Architecture

### Folder layout (actual)

```
src/app/
├── core/
│   ├── auth/
│   │   ├── guards/auth.guard.ts
│   │   └── services/auth.service.ts
│   ├── supabase/supabase.client.ts   ← SUPABASE token + Database type (hand-written; goal is generated)
│   ├── services/
│   │   ├── theme.ts
│   │   └── supabase/sb-<entity>.ts   ← one service per entity
│   ├── models/<entity>.model.ts
│   └── config/logos.ts
├── shared/
│   └── components/
│       ├── dialog-frame/             ← reusable resizable/maximizable modal shell
│       ├── footer/
│       └── nav-menu/
├── layouts/
│   ├── public-layout/               ← mobile-first, navbar + footer
│   ├── admin-layout/                ← sidenav, desktop-first
│   └── auth-layout/
└── features/
    ├── auth/login/, auth/callback/, auth/register/
    ├── public/home/                 ← event listing landing
    ├── public/events/detail/        ← /e/:slug
    ├── public/events/registration/  ← checkout + ticket flow
    ├── dashboard/                   ← /dashboard home
    └── admin/sponsor/               ← canonical CRUD example
```

### Routing

Two layout trees share the root path — one for `PublicLayout`, one for `AdminLayout` — both defined in [src/app/app.routes.ts](src/app/app.routes.ts). All routes use `loadComponent` (lazy). `authGuard` exists but is currently commented out in the dashboard route.

### Supabase client

The `SUPABASE` `InjectionToken` is declared in [src/app/core/supabase/supabase.client.ts](src/app/core/supabase/supabase.client.ts). Components must never import `@supabase/supabase-js` directly — all DB access goes through services in `core/services/supabase/`.

The `Database` type is currently hand-written in `supabase.client.ts`. After any migration, regenerate it with `supabase gen types` and replace that section.

### Service pattern

Admin/CRUD services (`sb-<entity>.ts`) use **RxJS Observables** and `BehaviorSubject` for real-time via `supabase.channel()`. Public read services (`public-events.service.ts`, `registrations.service.ts`) use `async/await`. Match the pattern of the feature you're working in.

### CRUD template

The sponsor feature (`src/app/features/admin/sponsor/`) is the canonical CRUD reference. New admin CRUDs must follow its structure:
- `<entity>-dashboard.ts` — host page with search + table + add button
- `components/<entity>-table/` — paginated, sortable `MatTable`
- `components/<entity>-form-modal/` — create/edit, uses `dialog-frame` for resize/maximize
- `components/<entity>-detail-modal/` — read-only view with print button
- `components/<entity>-delete-confirm-modal/`
- Service: `core/services/supabase/sb-<entity>.ts`
- Model: `core/models/<entity>.model.ts`

Use `.opencode/commands/create-crud.md` as a prompt template for generating a new CRUD.

---

## Key rules (summary from AGENTS.md + skills)

**Angular**
- Standalone components only — no `NgModule`.
- Signals for UI state; RxJS only for async flows where it adds value (e.g. debounce, real-time channels).
- Signal Forms (`@angular/forms/signals`) for new forms — not `ReactiveFormsModule`.
- `@if` / `@for` / `@switch` control flow — not structural directives.
- Subscriptions must use `takeUntilDestroyed()` or `async` pipe.

**Database**
- Never use a column that isn't in `.opencode/skills/database-and-features/SKILL.md`. If it doesn't exist, write the migration first, then update the skill doc.
- All migrations go to `supabase/migrations/` with a timestamp prefix. No manual Studio edits without a migration.
- Every FK must declare `on delete`. Every table needs `id`, `created_at`, `updated_at`.
- RLS policies are the real security layer. Guards are UX-only.

**TypeScript**
- `strict: true`, `noImplicitAny`, `strictNullChecks`. No `any` without a justifying comment.
- Naming: `PascalCase` components/classes, `camelCase` methods/vars, `kebab-case` files/selectors, `snake_case` SQL.
- Import order: Angular core → third-party → `@/core` → `@/shared` → `@/features` → relative.

**UI**
- Angular Material 3 for interactive components; Tailwind for layout/utilities. No Bootstrap, no PrimeNG.
- Tailwind `preflight: false` to avoid breaking Material styles.
- GDG color tokens: `google-blue` `#4285F4`, `google-red` `#EA4335`, `google-yellow` `#FBBC05`, `google-green` `#34A853`.
- Global component classes in `src/styles.scss`: `.gdg-btn-filled`, `.gdg-btn-outlined`, `.gdg-btn-ghost`, `.gdg-card`, `.gdg-container`, `.gdg-page`, `.gdg-h1`, `.gdg-h2`, `.gdg-body`.
- Cards: `rounded-3xl shadow-sm`. Buttons: `rounded-full`. No hard drop-shadows, no gradients on containers.
- Logos served from Cloudinary via constants in `src/app/core/config/logos.ts`.
- Icons without text must have `aria-label`.

---

## Extended context (skill files)

| Topic | File |
|---|---|
| Angular patterns, Supabase client setup, code examples | [.opencode/skills/project-architecture/SKILL.md](.opencode/skills/project-architecture/SKILL.md) |
| DB schema (all tables/columns) + feature route map | [.opencode/skills/database-and-features/SKILL.md](.opencode/skills/database-and-features/SKILL.md) |
| Design system, color tokens, component classes | [.opencode/skills/design-system/SKILL.md](.opencode/skills/design-system/SKILL.md) |
| CRUD generation prompt template | [.opencode/commands/create-crud.md](.opencode/commands/create-crud.md) |
| Seed script generation prompt template | [.opencode/commands/create-seed.md](.opencode/commands/create-seed.md) |

**Workflow for any task:**
1. Check the DB schema in `database-and-features/SKILL.md` before referencing any table/column.
2. If the column doesn't exist, write the migration first and update the skill doc.
3. Run `supabase gen types` after migrations.
4. Run `npm test` and `npm run build` before marking done.
