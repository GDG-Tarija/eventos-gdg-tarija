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
│   ├── Tienda/ (features/public/store)  # Productos y Compras del evento (/e/:slug/tienda). No confundir con los paquetes de entrada (ticket_types)
│   ├── Sorteo/ (features/public/raffle) # Tickets del sorteo + escáner (/e/:slug/tickets), sorteo para SUPERADMIN (/e/:slug/sorteo). No confundir con /mis-tickets (entradas)
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

Todas las columnas de las tablas de Supabase se generan de forma tipada. No modificar la base de datos a mano; proponer primero una migración SQL en `../back-office-gdg-tarija/supabase/migrations/` (el repo dueño de la base) y actualizar este documento.

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
| public  | events                 | store_payment_qr_url | text                  | YES           |
| public  | event_whatsapp_groups  | id                | uuid                     | NO            |
| public  | event_whatsapp_groups  | event_id          | uuid                     | NO            |
| public  | event_whatsapp_groups  | url               | text                     | NO            |
| public  | event_whatsapp_groups  | created_at        | timestamp with time zone | NO            |
| public  | event_whatsapp_groups  | updated_at        | timestamp with time zone | NO            |
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
| public  | point_activities       | id                | uuid                     | NO            |
| public  | point_activities       | event_id          | uuid                     | NO            |
| public  | point_activities       | name              | text                     | NO            |
| public  | point_activities       | created_at        | timestamp with time zone | NO            |
| public  | point_activities       | updated_at        | timestamp with time zone | NO            |
| public  | raffle_winners         | id                | uuid                     | NO            |
| public  | raffle_winners         | event_id          | uuid                     | NO            |
| public  | raffle_winners         | registration_id   | uuid                     | NO            |
| public  | raffle_winners         | prize             | text                     | NO            |
| public  | raffle_winners         | tickets           | integer                  | NO            |
| public  | raffle_winners         | created_at        | timestamp with time zone | NO            |
| public  | raffle_winners         | updated_at        | timestamp with time zone | NO            |
| public  | raffle_winners         | voided_at         | timestamp with time zone | YES           |
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
| public  | store_products         | id                | uuid                     | NO            |
| public  | store_products         | event_id          | uuid                     | NO            |
| public  | store_products         | name              | character varying(100)   | NO            |
| public  | store_products         | description       | text                     | YES           |
| public  | store_products         | price             | numeric(10,2)            | NO            |
| public  | store_products         | is_active         | boolean                  | NO            |
| public  | store_products         | position          | integer                  | NO            |
| public  | store_products         | created_at        | timestamp with time zone | NO            |
| public  | store_products         | updated_at        | timestamp with time zone | NO            |
| public  | store_product_images   | id                | uuid                     | NO            |
| public  | store_product_images   | product_id        | uuid                     | NO            |
| public  | store_product_images   | url               | text                     | NO            |
| public  | store_product_images   | position          | integer                  | NO            |
| public  | store_product_images   | alt_text          | character varying(200)   | YES           |
| public  | store_product_images   | created_at        | timestamp with time zone | NO            |
| public  | store_product_images   | updated_at        | timestamp with time zone | NO            |
| public  | store_orders           | id                | uuid                     | NO            |
| public  | store_orders           | event_id          | uuid                     | NO            |
| public  | store_orders           | registration_id   | uuid                     | NO            |
| public  | store_orders           | user_id           | uuid                     | YES           |
| public  | store_orders           | status            | character varying(20)    | NO            |
| public  | store_orders           | total             | numeric(10,2)            | NO            |
| public  | store_orders           | payment_proof_path | text                    | NO            |
| public  | store_orders           | reviewed_by       | uuid                     | YES           |
| public  | store_orders           | reviewed_at       | timestamp with time zone | YES           |
| public  | store_orders           | created_at        | timestamp with time zone | NO            |
| public  | store_orders           | updated_at        | timestamp with time zone | NO            |
| public  | store_order_items      | id                | uuid                     | NO            |
| public  | store_order_items      | order_id          | uuid                     | NO            |
| public  | store_order_items      | product_id        | uuid                     | NO            |
| public  | store_order_items      | product_name      | character varying(100)   | NO            |
| public  | store_order_items      | unit_price        | numeric(10,2)            | NO            |
| public  | store_order_items      | quantity          | integer                  | NO            |
| public  | store_order_items      | subtotal          | numeric(10,2) (generada) | YES           |
| public  | store_order_items      | delivered_quantity | integer                 | NO            |
| public  | store_order_items      | delivered_at      | timestamp with time zone | YES           |
| public  | store_order_items      | delivered_by      | uuid                     | YES           |
| public  | store_order_items      | created_at        | timestamp with time zone | NO            |
| public  | store_order_items      | updated_at        | timestamp with time zone | NO            |
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

**Sorteo por tickets** (migración `20261122092228_sorteo_tickets` en back-office): los tickets son filas de `scan_logs` (`checkin`, `pts:<point_activities.id>`, `net:<registrations.id>`). La app no escribe `scan_logs` ni lee nombres ajenos directamente: usa las RPCs `scan_ticket(p_event_id, p_registration_id, p_activity_id?)`, `my_tickets(p_event_id)` y `draw_raffle(p_event_id, p_prize)` (solo SUPERADMIN), vía `features/public/raffle/data/raffle.service.ts`.


**Tienda del evento** (migración `store_products_orders` de back-office, PR #42; en local hoy `20261121180000`, puede cambiar de nombre al fusionarse): productos (kits, merch, combos) y compras de personas inscritas, aparte de los paquetes de entrada (`ticket_types`). En la UI: **Tienda**, **Productos**, **Compras**. La app (`features/public/store/`) sigue estas reglas:
- Lee `store_products` + `store_product_images` (RLS: solo activos de eventos publicados; filtra además `is_active` porque SUPERADMIN ve todos) y `events.store_payment_qr_url` (sin QR la Tienda no está habilitada).
- **Nunca escribe compras directo.** Crea la compra solo con `create_store_order(p_event_id, p_items jsonb [{product_id, quantity 1..5}], p_payment_proof_path)`: el servidor fija precio, total y estado (`PENDING`), exige inscripción `CONFIRMED`/`PENDING`, evento publicado con QR y como máximo **3 compras PENDING por inscripción** (`P0057`).
- Comprobantes en el bucket **privado** `store-payment-proofs`, ruta `<uid>/<event_id>/<uuid>.<ext>` (sin upsert). La política admite solo inscritos activos de eventos publicados con QR y **hasta 10 archivos por persona y evento**; el comprador no puede borrarlos (SUPERADMIN borra los que ninguna compra usa). Nunca usar `payment-proofs` (público, de inscripciones).
- El comprador lee solo lo suyo: `store_orders` y `store_order_items` (precio y nombre registrados en la compra). `store_order_status_history` (motivos de anulación) es solo de SUPERADMIN: no mostrar motivos que la API no da.
- Errores propios P0040–P0057 (mapeados en `store/data/store-errors.ts`); PostgREST los devuelve con HTTP 500, así que manda el código, no el estado HTTP.
- Estados: `PENDING` → "En verificación", `PAID` → "Pagada", `CANCELLED` → "Anulada". `delivered_*` es de la issue #9 (entrega en check-in).

---

## 3. Flujo para Modificaciones de Base de Datos y Rutas

1. **Definir la columna/tabla en este documento**: Antes de usar una columna en frontend o backend, debe estar listada aquí.
2. **Crear migración SQL**: `npm run db:new -- <nombre>` en back-office-gdg-tarija (crea el archivo en `../back-office-gdg-tarija/supabase/migrations/`) definiendo PKs, FKs con `on delete` explícito y habilitando RLS. Probarla con `npm run db:reset` allá; llega a prod solo con el release `dev → main` de back-office (con aprobación manual).
3. **Generar tipos**: Correr `npx supabase gen types typescript --local` en back-office-gdg-tarija (contra el Supabase local, nunca contra prod) y actualizar `src/app/core/supabase/supabase.client.ts` (el `Database` type completo vive ahí, ya no es hand-written).
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
- `store_*` (Tienda): ver "Tienda del evento" arriba. Productos e imágenes de lectura pública (activos de eventos publicados), escritura SUPERADMIN; compras e ítems solo del comprador (`user_id = auth.uid()`) o SUPERADMIN, sin escritura de clientes; historial solo SUPERADMIN.
- `event_whatsapp_groups` (link del grupo de WhatsApp, uno por evento): lo leen solo inscritos no anulados del evento, SUPERADMIN y staff con `has_event_access`; lo escribe SUPERADMIN. Va aparte de `events` porque `events` es de lectura pública.
- `sponsors`, `event_coupons`: lectura pública controlada; escritura restringida a staff (`event_coupons` solo lectura para `authenticated`, no `anon`, para no exponer códigos de invitación).

**Funciones `SECURITY DEFINER`**: cualquier función nueva con `SECURITY DEFINER` que reciba un id de usuario/registro como parámetro DEBE validar `auth.uid()` internamente (no confiar en el parámetro) — así se corrigió el IDOR en `upsert_user_profile` y se eliminó la variante insegura de `update_user_profile(user_id uuid, ...)`.

Antes de tocar policies/funciones de seguridad, correr `get_advisors(type: "security")` (MCP Supabase) para verificar el estado real — el schema local en `supabase/migrations/` puede divergir de producción (ya pasó: `back.sql` declaraba RLS en `users`/`registrations` que en producción estaba desactivado).

**Ojo con tablas que YA tienen RLS activo**: tener RLS habilitado no significa que las policies sean seguras. En `018_security_hardening_followup.sql` se corrigieron dos casos donde RLS estaba activo pero con `WITH CHECK (true)` / `USING (true)` demasiado amplios: `scan_logs` (cualquier autenticado podía auto-marcarse asistencia y sacar certificado sin check-in real de staff) y `session_registrations` (cualquiera podía insertar inscripciones a sesión apuntando a `registration_id` ajenas). Al auditar, revisar `pg_policies` completo, no solo qué tablas tienen RLS on/off.

`scan_logs`: `staff_select_scan_logs`/`staff_insert_scan_logs` (staff con `has_event_access`) + `user_select_own_scan_logs` (`021_restore_user_select_own_scan_logs.sql`) — cada usuario puede leer sus propios scan_logs vía `registrations.user_id = auth.uid()`. Esta última policy es necesaria para `CertificatesService.listMyCertificates()` (`src/app/features/public/certificates/data/certificates.service.ts`), que hace un select anidado `registrations -> scan_logs` sujeto a RLS normal (a diferencia del detalle, que usa el RPC `get_public_certificate`, `SECURITY DEFINER`, y por eso no depende de esta policy). Si falta, el usuario ve `scan_logs: []` aunque haya asistido y el certificado desaparece silenciosamente de su lista — pasó una vez en producción, verificar que la policy siga presente si `listMyCertificates` deja de mostrar certificados.

**Pendiente manual (no aplicable vía SQL/MCP)**: activar "Leaked Password Protection" en Supabase Studio → Authentication → Policies. El advisor lo reporta como WARN persistente.

**Este backend es compartido con `back-office-gdg-tarija`** (repo hermano, mismo `supabaseUrl`/`supabaseKey`). Ese repo autoriza operadores vía un `AUTH_WHITELIST` hardcodeado en su frontend (`src/app/core/config/auth-whitelist.ts`), **no** vía `users.is_staff`. Cualquier cambio a `is_staff()` o a policies staff-only en este repo puede romper el back-office si los emails de `AUTH_WHITELIST` no están sincronizados en `staff_whitelist` (ver `020_seed_staff_whitelist_backoffice.sql`). Antes de tocar seguridad/RLS, revisar también qué usa el back-office.
