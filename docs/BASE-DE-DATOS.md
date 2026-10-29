# Base de datos (PostgreSQL)

## Diagnóstico y decisión

El proyecto original usaba **MySQL 8** (`mysql2`, `ENUM`, `ON DUPLICATE KEY`, funciones de fecha de MySQL)
y no era compatible con PostgreSQL. Se migró a **PostgreSQL** porque el propietario lo administra,
no había datos de producción que trasladar y PostgreSQL aporta `CHECK` reales, `jsonb`,
secuencias sin carreras, `timestamptz` con zonas horarias para reportes y roles granulares.
Detalle en [ARQUITECTURA.md](ARQUITECTURA.md). Los scripts MySQL originales se conservan en
`database/legacy-mysql/` solo como referencia.

## Estructura

| Grupo | Tablas |
|---|---|
| Usuarios | `users` (rol `client`/`manager`/`admin`, `token_version`, bloqueo por intentos) |
| Catálogo | `categories`, `products`, `product_variants`, `promotions` (traducciones en `jsonb`) |
| Pedidos | `orders`, `order_items` (copia histórica de nombre/precio/costo), `order_status_history`, `tickets`, `delivery_zones`, `delivery_addresses` |
| Pagos | `payment_methods` (solo datos públicos), `payments` (estado propio, verificador, efectivo/cambio, modo test/live) |
| Monedas | `currencies` (una sola base), `exchange_rates` (tipo, fuente, fecha, usuario) |
| Inventario | `inventory_items`, `product_components` (recetas), `stock_movements` (inmutable), `suppliers` |
| Contenido | `pages` (borrador/publicado por idioma), `images` (ilustrativa, fuente, licencia), `settings` |
| Control | `audit_log`, `cookie_consents`, `schema_migrations` |

Reglas de integridad en la propia base (no solo en el código):
- Importes enteros en centavos con `CHECK (>= 0)`; `orders` verifica `total = subtotal − descuento + envío`.
- `stock >= 0` e `inventory_items.quantity >= 0`: ninguna transacción puede dejar existencias negativas.
- `quantity > 0` en líneas de pedido; estados válidos con `CHECK`.
- Número de pedido desde la secuencia `order_number_seq` (único, sin carreras).

## Roles y permisos

Creados por `database/roles.sql` (probado: ver [PRUEBAS.md](PRUEBAS.md)):

| Rol | Puede | No puede |
|---|---|---|
| `origen_owner` | Crear/alterar tablas (migraciones) | — (no lo uses en la API) |
| `origen_app` | SELECT/INSERT/UPDATE/DELETE, usar secuencias | Crear/borrar tablas o esquemas |
| `origen_backup` | Leer todo (pg_dump) | Modificar datos |

La base de producción **no debe exponerse a Internet**: en un VPS escucha solo en `localhost`
o en la red privada; en un servicio administrado, restringe por IP y exige TLS (`DB_SSL=verify-full`).

## Migraciones

```bash
npm run migrate:status   # qué está aplicado
npm run migrate          # aplica pendientes (con origen_owner)
```

- Archivos en `backend/migrations/NNN_nombre.sql`, aplicados en orden, cada uno en una transacción.
- Se guarda el SHA-256 de cada archivo: si alguien edita una migración ya aplicada, el script se detiene.
  **Para cambiar el esquema se crea una migración nueva**, nunca se edita una existente.
- Bloqueo consultivo: dos instancias no migran a la vez.

## Respaldos

Scripts probados (respaldo → restauración → conteos idénticos, ver [PRUEBAS.md](PRUEBAS.md)):

| Sistema | Respaldo | Restauración |
|---|---|---|
| Windows | `backend/scripts/backup.ps1` | `backend/scripts/restore.ps1` |
| Linux/macOS | `backend/scripts/backup.sh` | `backend/scripts/restore.sh` |

Qué hacen: `pg_dump` en formato comprimido, verificación de que el archivo es legible,
suma SHA-256 y borrado de copias de más de 30 días.

**Política recomendada**
1. Respaldo diario automático (Programador de tareas de Windows o `cron`).
2. Copia semanal **fuera del servidor** (otro proveedor, disco externo o la PC del negocio).
3. Una vez al mes, **restaurar en una base de prueba** y verificar (un respaldo nunca probado no es un respaldo).
4. Respaldar también los archivos subidos (`backend/uploads/` o el bucket S3/R2).

Ejemplo (Windows):
```powershell
$env:PGPASSWORD = "contraseña_origen_backup"
.\backend\scripts\backup.ps1 -DbHost localhost -User origen_backup -Database origen_cafeteria -BackupDir "D:\Respaldos\Origen"
```

## Restaurar ante un desastre

1. Detén la API.
2. Restaura en una base **nueva**: `restore.ps1 -File ... -TargetDatabase origen_restaurada`.
3. Verifica pedidos y totales recientes.
4. Cambia `DB_NAME` en `.env` (o renombra las bases) y vuelve a iniciar la API.
5. Ejecuta `npm run migrate` por si el respaldo es anterior a alguna migración.

## Actualizar el sistema

1. Respaldo manual inmediato.
2. Descarga la nueva versión (`git pull`).
3. `cd backend && npm ci && npm run migrate` (con `origen_owner`).
4. `cd frontend && npm ci && npm run build` y publica `dist/`.
5. Reinicia la API y comprueba `/api/health`.
6. Si algo falla: vuelve a la versión anterior del código (`git checkout <versión>`) y, si la
   migración alteró datos, restaura el respaldo del paso 1.

## Entornos

| Entorno | Base | Notas |
|---|---|---|
| Desarrollo | `origen_dev` (u otra) | Puede usar `seed:dev` con datos simulados |
| Pruebas automáticas | nombre terminado en `_test` | `npm test` **borra y recrea** el esquema; se niega a correr si el nombre no termina en `_test` |
| Producción | `origen_cafeteria` | Solo `setup` + `create-admin`; nunca `seed:dev` |
