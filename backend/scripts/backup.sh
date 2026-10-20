#!/usr/bin/env bash
# Respaldo de la base de datos de ORIGEN (Linux / macOS / servidor).
#
# Uso:
#   PGHOST=... PGPORT=5432 PGUSER=origen_backup PGPASSWORD=... PGDATABASE=origen_cafeteria \
#   BACKUP_DIR=/var/backups/origen KEEP_DAYS=30 ./backup.sh
#
# Programar a diario con cron (03:30):
#   30 3 * * * /opt/origen/backend/scripts/backup.sh >> /var/log/origen-backup.log 2>&1
#
# Genera un archivo .dump (formato custom de pg_dump, comprimido) con fecha y una
# suma SHA-256 para verificar integridad. Copia los respaldos FUERA del servidor
# (otro disco, almacenamiento en la nube o una computadora del negocio).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
DB="${PGDATABASE:-origen_cafeteria}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/origen-$DB-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$FILE" "$DB"
sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE" "$FILE.sha256"

# Comprobación básica: el archivo debe poder listarse
pg_restore --list "$FILE" > /dev/null

# Rotación
find "$BACKUP_DIR" -name 'origen-*.dump*' -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Iseconds)] Respaldo OK: $FILE ($(du -h "$FILE" | cut -f1))"
