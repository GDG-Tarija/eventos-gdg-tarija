---
name: database-and-features
description: Esquema de entidades de base de datos (Postgres/Supabase) y estructura de rutas/menús del sistema.
---

# Entidades de Base de Datos y Módulos del Sistema (Features & DB Schema)

Este documento centraliza el diseño lógico de las entidades de la base de datos de Supabase y el mapa de navegación/rutas por módulos del sistema.

---

## 1. Rutas y Estructura de Módulos (Menu & Features)

La arquitectura de vistas y menús del sistema está distribuida en los siguientes módulos:

```
├── Public/                               # Módulos Públicos / Asistentes
│   ├── Eventos/                        # Listado y detalle de eventos (/e/:slug)
│   └── Certificados/                   # Listado (/certificados) y vista de certificado (/certificados/:id)
│
├── Dashboard/                          # Dashboard principal y widget cards
│
├── Admin/                              # Módulos de Administración
│   ├── Usuarios/                       # CRUD de usuarios y roles
│   ├── Eventos/                        # CRUD de eventos y lanzamientos
│   └── Sponsors/                       # CRUD de patrocinadores de la comunidad
│
├── Reportes/                           # Módulos de Reportes y Estadísticas
│   ├── Eventos/                        # Reporte de métricas de eventos
│   └── Usuarios/                       # Reporte de asistentes e inscripciones
```

---

## 2. Esquema de Entidades de Base de Datos

Todas las columnas de las tablas de Supabase se generan de forma tipada. No modificar la base de datos a mano; proponer primero una migración SQL en `supabase/migrations/` y actualizar este documento.

### 2.1. Tabla Consolidada de Base de Datos (Postgres / Supabase)

| esquema | tabla                  | columna           | tipo_dato                | permite_nulos |
| ------- | ---------------------- | ----------------- | ------------------------ | ------------- |
| public  | events                 | id                | uuid                     | NO            |
| public  | events                 | title             | character varying        | NO            |
| public  | events                 | slug              | character varying        | NO            |
| public  | events                 | event_type        | character varying        | NO            |
| public  | events                 | capacity          | integer                  | NO            |
| public  | events                 | date_start        | timestamp with time zone | NO            |
| public  | events                 | date_end          | timestamp with time zone | YES           |
| public  | events                 | is_published      | boolean                  | YES           |
| public  | events                 | created_at        | timestamp with time zone | YES           |
| public  | events                 | updated_at        | timestamp with time zone | YES           |
| public  | events                 | description       | text                     | YES           |
| public  | events                 | image_url         | text                     | YES           |
| public  | events                 | banner_url        | text                     | YES           |
| public  | events                 | location_type     | character varying        | YES           |
| public  | events                 | location_name     | text                     | YES           |
| public  | events                 | address_link      | text                     | YES           |
| public  | events                 | category          | character varying        | YES           |
| public  | events                 | extra_info        | jsonb                    | YES           |
| public  | inscripciones_sessions | id                | uuid                     | NO            |
| public  | inscripciones_sessions | usuario_id        | uuid                     | NO            |
| public  | inscripciones_sessions | session_id        | uuid                     | NO            |
| public  | inscripciones_sessions | inscrito_en       | timestamp with time zone | NO            |
| public  | inscripciones_sessions | asistio           | boolean                  | NO            |
| public  | inscripciones_sessions | checked_in_at     | timestamp with time zone | YES           |
| public  | event_coupons          | id                | uuid                     | NO            |
| public  | event_coupons          | event_id          | uuid                     | NO            |
| public  | event_coupons          | code              | character varying        | NO            |
| public  | event_coupons          | role              | character varying        | NO            |
| public  | event_coupons          | max_uses          | integer                  | NO            |
| public  | event_coupons          | created_at        | timestamp with time zone | YES           |
| public  | event_coupons          | updated_at        | timestamp with time zone | YES           |
| public  | registrations          | id                | uuid                     | NO            |
| public  | registrations          | event_id          | uuid                     | NO            |
| public  | registrations          | user_id           | uuid                     | YES           |
| public  | registrations          | ticket_type_id    | uuid                     | NO            |
| public  | registrations          | event_role        | character varying        | NO            |
| public  | registrations          | status            | character varying        | NO            |
| public  | registrations          | created_at        | timestamp with time zone | YES           |
| public  | registrations          | updated_at        | timestamp with time zone | YES           |
| public  | registrations          | custom_responses  | jsonb                    | YES           |
| public  | registrations          | payment_proof_url | text                     | YES           |
| public  | registrations          | coupon_id         | uuid                     | YES           |
| public  | scan_logs              | id                | uuid                     | NO            |
| public  | scan_logs              | registration_id   | uuid                     | NO            |
| public  | scan_logs              | scanned_by        | uuid                     | YES           |
| public  | scan_logs              | scan_type         | character varying        | NO            |
| public  | scan_logs              | scanned_at        | timestamp with time zone | YES           |
| public  | scan_logs              | created_at        | timestamp with time zone | YES           |
| public  | scan_logs              | updated_at        | timestamp with time zone | YES           |
| public  | session_registrations  | registration_id   | uuid                     | NO            |
| public  | session_registrations  | session_id        | uuid                     | NO            |
| public  | session_registrations  | registered_at     | timestamp with time zone | YES           |
| public  | sessions               | id                | uuid                     | NO            |
| public  | sessions               | event_id          | uuid                     | NO            |
| public  | sessions               | title             | character varying        | NO            |
| public  | sessions               | capacity          | integer                  | NO            |
| public  | sessions               | created_at        | timestamp with time zone | YES           |
| public  | sessions               | updated_at        | timestamp with time zone | YES           |
| public  | sponsors               | id                | uuid                     | NO            |
| public  | sponsors               | name              | text                     | YES           |
| public  | sponsors               | description       | text                     | YES           |
| public  | sponsors               | score             | text                     | YES           |
| public  | sponsors               | state             | USER-DEFINED             | NO            |
| public  | sponsors               | created_at        | timestamp with time zone | NO            |
| public  | sponsors               | updated_at        | timestamp with time zone | NO            |
| public  | staff_whitelist        | id                | uuid                     | NO            |
| public  | staff_whitelist        | email             | character varying        | NO            |
| public  | staff_whitelist        | role              | character varying        | NO            |
| public  | staff_whitelist        | created_at        | timestamp with time zone | YES           |
| public  | staff_whitelist        | updated_at        | timestamp with time zone | YES           |
| public  | ticket_types           | id                | uuid                     | NO            |
| public  | ticket_types           | event_id          | uuid                     | NO            |
| public  | ticket_types           | name              | character varying        | NO            |
| public  | ticket_types           | price             | numeric                  | NO            |
| public  | ticket_types           | ticket_capacity   | integer                  | YES           |
| public  | ticket_types           | created_at        | timestamp with time zone | YES           |
| public  | ticket_types           | updated_at        | timestamp with time zone | YES           |
| public  | ticket_types           | payment_qr_url    | text                     | YES           |
| public  | ticket_types           | description       | text                     | YES           |
| public  | ticket_types           | image_url         | text                     | YES           |
| public  | tracks                 | id                | uuid                     | NO            |
| public  | tracks                 | evento_id         | uuid                     | NO            |
| public  | tracks                 | nombre            | text                     | NO            |
| public  | tracks                 | descripcion       | text                     | YES           |
| public  | tracks                 | created_at        | timestamp with time zone | NO            |
| public  | users                  | id                | uuid                     | NO            |
| public  | users                  | email             | character varying        | NO            |
| public  | users                  | first_name        | character varying        | NO            |
| public  | users                  | last_name         | character varying        | NO            |
| public  | users                  | avatar_url        | text                     | YES           |
| public  | users                  | phone             | character varying        | YES           |
| public  | users                  | extra_info        | jsonb                    | YES           |
| public  | users                  | is_staff          | boolean                  | YES           |
| public  | users                  | created_at        | timestamp with time zone | YES           |
| public  | users                  | updated_at        | timestamp with time zone | YES           |

---

## 3. Flujo para Modificaciones de Base de Datos y Rutas

1. **Definir la columna/tabla en este documento**: Antes de usar una columna en frontend o backend, debe estar listada aquí.
2. **Crear migración SQL**: Escribir la migración en `supabase/migrations/` definiendo PKs, FKs con `on delete` explícito y habilitando RLS.
3. **Generar tipos**: Correr `supabase gen types typescript --local` (o vía MCP `generate_typescript_types`) y actualizar `src/app/core/supabase/supabase.client.ts` (el `Database` type completo vive ahí, ya no es hand-written).
4. **Actualizar el componente de navegación**: Ajustar el menú de navegación correspondiente en `src/app/` para que coincida con la ruta y los módulos definidos en este skill.

---

## 4. Seguridad (RLS)

Todas las tablas de `public` tienen RLS habilitado (migración `017_security_hardening.sql`, 2026-08-15). Antes de esa migración, `events`, `ticket_types`, `staff_whitelist`, `registrations` y `users` NO tenían RLS activo y eran de lectura/escritura pública total vía la anon key — corregido.

**Helper `public.is_staff()`**: `SECURITY DEFINER`, reconoce staff por `users.is_staff = true` (mecanismo real usado hoy) o por `staff_whitelist` (legacy/futuro). Usar `public.is_staff()` en cualquier policy nueva que deba restringirse a organizadores/admins — no reinventar el chequeo inline.

**Patrón por tabla**:
- `events`, `ticket_types`: lectura pública (eventos solo si `is_published = true`, salvo staff), escritura solo staff.
- `registrations`: cada usuario ve/crea la suya (`auth.uid() = user_id`); staff ve/actualiza todas.
- `users`: cada usuario ve/edita su propia fila; staff tiene acceso total.
- `staff_whitelist`: sin policies — solo accesible por `service_role`/Studio directo. No exponer a `anon`/`authenticated` bajo ninguna circunstancia (define quién es admin).
- `sponsors`, `event_coupons`: lectura pública controlada; escritura restringida a staff (`event_coupons` solo lectura para `authenticated`, no `anon`, para no exponer códigos de invitación).

**Funciones `SECURITY DEFINER`**: cualquier función nueva con `SECURITY DEFINER` que reciba un id de usuario/registro como parámetro DEBE validar `auth.uid()` internamente (no confiar en el parámetro) — así se corrigió el IDOR en `upsert_user_profile` y se eliminó la variante insegura de `update_user_profile(user_id uuid, ...)`.

Antes de tocar policies/funciones de seguridad, correr `get_advisors(type: "security")` (MCP Supabase) para verificar el estado real — el schema local en `supabase/migrations/` puede divergir de producción (ya pasó: `back.sql` declaraba RLS en `users`/`registrations` que en producción estaba desactivado).

**Ojo con tablas que YA tienen RLS activo**: tener RLS habilitado no significa que las policies sean seguras. En `018_security_hardening_followup.sql` se corrigieron dos casos donde RLS estaba activo pero con `WITH CHECK (true)` / `USING (true)` demasiado amplios: `scan_logs` (cualquier autenticado podía auto-marcarse asistencia y sacar certificado sin check-in real de staff) y `session_registrations` (cualquiera podía insertar inscripciones a sesión apuntando a `registration_id` ajenas). Al auditar, revisar `pg_policies` completo, no solo qué tablas tienen RLS on/off.

**Pendiente manual (no aplicable vía SQL/MCP)**: activar "Leaked Password Protection" en Supabase Studio → Authentication → Policies. El advisor lo reporta como WARN persistente.
