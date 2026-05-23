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

### 2.1. Brand (Marcas / Organizaciones asociadas)

**Tabla:** `brands`

| Columna     | Tipo          | Restricciones                     | Descripción |
|-------------|---------------|-----------------------------------|-------------|
| `id`          | String (UUID) | PK, `default: gen_random_uuid()`  | Identificador único de la marca. |
| `name`        | String        | Nullable                          | Nombre comercial de la marca. |
| `description` | String        | Nullable                          | Descripción corta de la marca. |
| `score`       | String        | Nullable                          | Puntuación o valor de scoring de marca. |
| `state`       | State (enum)  | `NOT NULL`, `default: ACTIVE`       | Estado del registro (`ACTIVE` / `INACTIVE`). |
| `created_at`  | TIMESTAMPTZ   | `default: NOW()`                  | Fecha y hora de creación automática. |
| `updated_at`  | TIMESTAMPTZ   | `default: NOW()`                  | Fecha y hora de última modificación. |

---

## 3. Flujo para Modificaciones de Base de Datos y Rutas

1. **Definir la columna/tabla en este documento**: Antes de usar una columna en frontend o backend, debe estar listada aquí.
2. **Crear migración SQL**: Escribir la migración en `supabase/migrations/` definiendo PKs, FKs con `on delete` explícito y habilitando RLS.
3. **Generar tipos**: Correr `supabase gen types typescript --local > src/app/core/models/database.types.ts` para sincronizar tipos con TypeScript.
4. **Actualizar el componente de navegación**: Ajustar el menú de navegación correspondiente en `src/app/` para que coincida con la ruta y los módulos definidos en este skill.
