-- ============================================================
-- ORIGEN — Base de datos y roles con privilegios mínimos (PostgreSQL 14+)
--
-- Ejecutar UNA vez como superusuario (postgres), reemplazando las contraseñas:
--   psql -U postgres -f database/roles.sql
--
-- Roles:
--   origen_owner  dueño del esquema; lo usa SOLO el script de migraciones (npm run migrate)
--   origen_app    lo usa la API en el día a día: lee/escribe datos, NO puede crear ni borrar tablas
--   origen_backup solo lectura, para pg_dump
-- ============================================================

-- 1) Roles (cambia las contraseñas por valores largos y aleatorios)
CREATE ROLE origen_owner  LOGIN PASSWORD 'CAMBIAR_owner_password_larga';
CREATE ROLE origen_app    LOGIN PASSWORD 'CAMBIAR_app_password_larga';
CREATE ROLE origen_backup LOGIN PASSWORD 'CAMBIAR_backup_password_larga';

-- 2) Base de datos
CREATE DATABASE origen_cafeteria OWNER origen_owner ENCODING 'UTF8' TEMPLATE template0;

\connect origen_cafeteria

-- 3) Nadie más puede crear objetos en el esquema público
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO origen_owner;
GRANT USAGE ON SCHEMA public TO origen_app, origen_backup;

-- 4) Permisos por defecto para las tablas/secuencias que crearán las migraciones
ALTER DEFAULT PRIVILEGES FOR ROLE origen_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO origen_app;
ALTER DEFAULT PRIVILEGES FOR ROLE origen_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO origen_app;
ALTER DEFAULT PRIVILEGES FOR ROLE origen_owner IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO origen_app;
ALTER DEFAULT PRIVILEGES FOR ROLE origen_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO origen_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE origen_owner IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO origen_backup;

-- 5) Límites de seguridad para la conexión de la aplicación
ALTER ROLE origen_app SET statement_timeout = '15s';
ALTER ROLE origen_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE origen_app CONNECTION LIMIT 40;

-- Nota: los registros de auditoría y movimientos de stock no deben borrarse.
-- Si se quiere reforzarlo a nivel de base de datos, después de migrar ejecuta:
--   REVOKE UPDATE, DELETE ON audit_log, stock_movements FROM origen_app;
-- (la aplicación solo inserta en esas tablas; la eliminación de cuentas anonimiza datos en otras tablas).
