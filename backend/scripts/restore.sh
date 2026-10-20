#!/usr/bin/env bash
# Restauración de un respaldo de ORIGEN.
#
# ⚠️  Restaura sobre una base VACÍA o de prueba. Nunca sobre producción sin
#     antes hacer un respaldo nuevo y detener la API.
#
# Uso:
#   PGHOST=... PGUSER=origen_owner PGPASSWORD=... ./restore.sh origen-origen_cafeteria-20261020-033000.dump origen_restaurada
set -euo pipefail

FILE="${1:?Indica el archivo .dump}"
TARGET_DB="${2:?Indica la base de destino (p. ej. origen_restaurada)}"

if [ -f "$FILE.sha256" ]; then
  sha256sum -c "$FILE.sha256"
fi

createdb "$TARGET_DB"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_DB" "$FILE"

echo "Restaurado en la base '$TARGET_DB'. Verifica con:"
echo "  psql -d $TARGET_DB -c \"SELECT COUNT(*) FROM orders\""
echo "Si es correcto, apunta DB_NAME a '$TARGET_DB' o renombra las bases con la API detenida."
