# GDG Events Platform — UI Context (Design System)

Este documento define el **contexto completo de UI** para GDG Events Platform.

## Stack UI

- **Angular Material 3**: componentes (botones, toolbar, dialog, menu, form-field, etc.).
- **Tailwind CSS**: layout, spacing, tipografia, utilities y clases de sistema.
- **SCSS global**: tokens CSS variables + overrides puntuales.

Regla: Material para interaccion/semantica; Tailwind para composicion visual. No usar Bootstrap.

## Theme

- **Light-first**: el tema por defecto es claro.
- **Modo oscuro**: se activa con `data-theme="dark"` en `<html>`.
- Persistencia: `localStorage['mecha-theme']` (`light` | `dark`).

Archivos:

- `src/app/core/services/theme.ts`
- `src/material-theme.scss`
- `src/styles/_variables.scss`

## Tipografia

- Fuente principal: **Google Sans (local)**.
- Fuente fallback: `system-ui, Segoe UI, Roboto, Arial, sans-serif`.

Fuentes locales:

- Carpeta: `src/assets/fonts/google-sans/`
- Carga: `@font-face` en `src/styles.scss`
- El build copia assets via `angular.json` a `/assets/**`.

Tailwind:

- `font-google` => `['Google Sans', 'system-ui', 'sans-serif']`

## Iconografia

- Material Symbols Rounded (para iconos inline): clase `.material-symbols-rounded`.
- Material Icons se mantiene para `<mat-icon>` existente.

Archivo:

- `src/index.html`

## Color Tokens

### Tailwind colors

Definidos en `tailwind.config.js`:

- `google-blue` `#4285F4`
- `google-red` `#EA4335`
- `google-yellow` `#FBBC05`
- `google-green` `#34A853`
- `google-*-light`: `blue-light`, `red-light`, `yellow-light`, `green-light`
- `surface-main` `#F8F9FA`
- `surface-paper` `#FFFFFF`
- `text-primary` `#202124`
- `text-secondary` `#5F6368`

### CSS variables

En `src/styles/_variables.scss`:

- `--gdg-google-blue|red|yellow|green`
- `--gdg-google-*-light`
- tokens existentes para tablas, borders, danger, etc. (con override dark)

## Spacing / Layout

- Base spacing: usar utilidades Tailwind (`p-*`, `m-*`, `gap-*`).
- Contenedor: `.gdg-container` (max width + padding horizontal).
- Pagina: `.gdg-page` (altura minima y padding vertical).

Mobile-first en vistas publicas; desktop-first en `/dashboard`.

## Shapes (Radii)

- Botones: `rounded-full`.
- Cards: `rounded-3xl`.

## Shadows

- Evitar sombras negras duras.
- Default card: `shadow-[0_4px_20px_rgba(0,0,0,0.08)]`.

## Motion

- Transiciones: `duration-300 ease-in-out`.
- Boton active: `active:scale-[0.98]`.

## Component Classes

Definidas en `src/styles.scss` bajo `@layer components`:

- Botones:
  - `.gdg-btn-filled`
  - `.gdg-btn-outlined`
  - `.gdg-btn-ghost`
- Superficies:
  - `.gdg-card`
  - `.gdg-event-card`
- Tipografia:
  - `.gdg-h1`, `.gdg-h2`, `.gdg-body`
- Layout:
  - `.gdg-container`, `.gdg-page`
- Loading:
  - `.gdg-spinner`

## Auth UX

Regla de UX: en navbar publico **no mostrar “Iniciar sesion” mientras `auth.loading()`**.

Archivo:

- `src/app/layouts/public-layout/public-layout.html`

## Convenciones

- No activar Tailwind preflight (`preflight: false`) para no romper Material.
- Preferir clases Tailwind en templates nuevos. SCSS por componente solo para casos puntuales.
- Accesibilidad: iconos sin texto con `aria-label`.
