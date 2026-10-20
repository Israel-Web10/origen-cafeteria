# Respaldo de la base de datos de ORIGEN en Windows (PowerShell).
#
# Uso (ejemplo):
#   $env:PGPASSWORD = "contraseña_de_origen_backup"
#   .\backup.ps1 -DbHost localhost -User origen_backup -Database origen_cafeteria -BackupDir "D:\Respaldos\Origen"
#
# Programarlo a diario: Programador de tareas de Windows → Crear tarea básica →
#   Acción: powershell.exe  Argumentos: -ExecutionPolicy Bypass -File "C:\ruta\backend\scripts\backup.ps1" -BackupDir "D:\Respaldos\Origen"
#   (guarda PGPASSWORD como variable de entorno del usuario que ejecuta la tarea, no en el script)
param(
  [string]$DbHost = "localhost",
  [int]$Port = 5432,
  [string]$User = "origen_backup",
  [string]$Database = "origen_cafeteria",
  [string]$BackupDir = ".\backups",
  [int]$KeepDays = 30,
  [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin"
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $BackupDir "origen-$Database-$stamp.dump"

& "$PgBin\pg_dump.exe" --host=$DbHost --port=$Port --username=$User --format=custom --compress=9 --no-owner --no-privileges --file="$file" $Database
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló (código $LASTEXITCODE)" }

# Verificación: el respaldo debe poder listarse
& "$PgBin\pg_restore.exe" --list "$file" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "El respaldo no es legible" }

(Get-FileHash $file -Algorithm SHA256).Hash | Out-File "$file.sha256" -Encoding ascii

# Rotación de respaldos antiguos
Get-ChildItem $BackupDir -Filter "origen-*.dump*" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item -Confirm:$false

$size = [math]::Round((Get-Item $file).Length / 1KB, 1)
Write-Output "Respaldo OK: $file ($size KB)"
