# Restauración de un respaldo de ORIGEN en Windows.
# Restaura SIEMPRE en una base nueva; nunca sobre producción sin respaldo previo y con la API detenida.
#
#   $env:PGPASSWORD = "contraseña_de_origen_owner"
#   .\restore.ps1 -File "D:\Respaldos\Origen\origen-origen_cafeteria-20261020-033000.dump" -TargetDatabase origen_restaurada
param(
  [Parameter(Mandatory = $true)][string]$File,
  [Parameter(Mandatory = $true)][string]$TargetDatabase,
  [string]$DbHost = "localhost",
  [int]$Port = 5432,
  [string]$User = "origen_owner",
  [string]$PgBin = "C:\Program Files\PostgreSQL\17\bin"
)
$ErrorActionPreference = "Stop"
if (Test-Path "$File.sha256") {
  $expected = (Get-Content "$File.sha256").Trim()
  $actual = (Get-FileHash $File -Algorithm SHA256).Hash
  if ($expected -ne $actual) { throw "La suma SHA-256 no coincide: el archivo está dañado o fue modificado." }
}
& "$PgBin\createdb.exe" --host=$DbHost --port=$Port --username=$User $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base $TargetDatabase" }
& "$PgBin\pg_restore.exe" --host=$DbHost --port=$Port --username=$User --no-owner --no-privileges --exit-on-error --dbname=$TargetDatabase $File
if ($LASTEXITCODE -ne 0) { throw "pg_restore falló" }
Write-Output "Restaurado en '$TargetDatabase'. Verifica los datos antes de usarla."
