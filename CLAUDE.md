# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**GDG Events Platform** — Angular 21 PWA + Supabase BaaS for managing Google Developer Groups community events in Tarija, Bolivia. Public attendees register at `/e/:slug`; organizers manage events at `/dashboard`.

---

## Branches — `main` is off-limits

- **Never touch `main`.** Do not commit, push, merge, rebase, or open PRs that target `main` (except release PRs `dev → main`, which only organizers create and merge). `main` is production: Vercel deploys from it.
- Every change goes on a branch created from `dev` (`feat/…`, `fix/…`, `chore/…`) and its PR targets `dev`.
- Before starting: `git checkout dev && git pull` (here and in `../back-office-gdg-tarija`), then `npm run db:migrate --prefix ../back-office-gdg-tarija`.

---

## Running locally

Full step-by-step (local Supabase + both apps) is in `AGENTS.md` → "Levantar el proyecto en local". Short version:

```bash
(cd ../back-office-gdg-tarija && npm install && cp -n supabase/.env.example supabase/.env && npm run db:start)
npm install && cp -n src/environments/environment.eg.ts src/environments/environment.ts && npm start   # http://localhost:4200
```

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

# Supabase local stack — lives in ../back-office-gdg-tarija (requires Docker)
npm run db:start --prefix ../back-office-gdg-tarija   # http://127.0.0.1:54321, Studio :54323
npm run db:reset --prefix ../back-office-gdg-tarija   # rebuild local DB: migrations + fake seed
npm run db:migrate --prefix ../back-office-gdg-tarija # apply only new migrations (after pulling dev)
(cd ../back-office-gdg-tarija && npx supabase gen types typescript --local)   # paste into supabase.client.ts
```

> `npm run lint` (Angular ESLint) must stay at zero errors. There is no `test:ci` script. Tests use Vitest via `@angular/build:unit-test`.
>
> **Migrations:** `supabase/` (migrations, `config.toml`, seed) lives only in the sibling repo `back-office-gdg-tarija`; this repo keeps no copy. Create migrations there. The `Database` type in `supabase.client.ts` is synced from that repo's generated type.
>
> **Environments:** `src/environments/environment.ts` (gitignored) must point to the local stack — copy `environment.eg.ts` — **never to production**. There are only two environments (local and prod); they and the migration flow are documented in `back-office-gdg-tarija/docs/entornos-supabase.md`.

---

## Architecture

### Folder layout (actual)

```
src/app/
├── core/
│   ├── auth/
│   │   ├── guards/auth.guard.ts
│   │   └── services/auth.service.ts
│   ├── supabase/supabase.client.ts   ← SUPABASE token + Database type (synced from back-office-gdg-tarija's generated type)
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
    ├── public/certificates/         ← certificate list/detail + PDF export
    ├── dashboard/                   ← /dashboard home
    ├── admin/sponsor/               ← canonical CRUD example
    └── admin/users/
```

### Routing

Two layout trees share the root path — one for `PublicLayout`, one for `AdminLayout` — both defined in [src/app/app.routes.ts](src/app/app.routes.ts). All routes use `loadComponent` (lazy). `authGuard` protects `/dashboard` but only checks for a session, not a role. Role-based authorization is still pending (RLS is the real barrier).

### Supabase client

The `SUPABASE` `InjectionToken` is declared in [src/app/core/supabase/supabase.client.ts](src/app/core/supabase/supabase.client.ts). Components must never import `@supabase/supabase-js` directly — all DB access goes through services in `core/services/supabase/`.

The `Database` type in `supabase.client.ts` is generated (synced from `back-office-gdg-tarija`). After any migration, regenerate it with `supabase gen types` and replace that section. Checkout coupon validation goes through the `validate_coupon` RPC (authenticated only); never read `event_coupons` directly.

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
- All migrations go to `back-office-gdg-tarija/supabase/migrations/` (`npm run db:new -- <name>` there). They reach prod only through the release PR `dev → main` in back-office, after manual approval. This app deploys to Vercel when its own `dev → main` release is merged, so release back-office first (DB approved) and eventos after; removals of DB objects ship one release after the code that stops using them. Never change the prod schema by hand (Studio, SQL Editor, Supabase MCP writes, local `db push`).
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
2. If the column doesn't exist, write the migration first (in back-office-gdg-tarija), test it with `npm run db:reset` there, and update the skill doc.
3. Regenerate types from the local stack after migrations.
4. Run `npm test` and `npm run build` before marking done.
