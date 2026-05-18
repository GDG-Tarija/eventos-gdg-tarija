# Entidades del Sistema — CRUDs por Módulo

---
# Admin Module

## 1. Brand

**Tabla:** `brands`

| Columna     | Tipo          | Restricciones     |
|-------------|---------------|-------------------|
| id          | String (UUID) | PK, auto-increment|
| name        | String        | nullable          |
| description | String        | nullable          |
| score       | String        | nullable          |
| state       | State (enum)  | default: ACTIVE   |
| created_at  | LocalDateTime | auto              |
| updated_at  | LocalDateTime | auto              |

