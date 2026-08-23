# Instalación — ORIGEN

Guía para levantar el proyecto completo en una computadora nueva, desde cero.

## 1. Requisitos

- **Node.js** 18 o superior (incluye npm)
- **MySQL** 8.0 o superior (también funciona con MariaDB 10.6+)
- Un cliente para ejecutar `.sql` (la CLI `mysql`, MySQL Workbench, TablePlus, etc.)

Verifica versiones:
```bash
node -v
npm -v
mysql --version
```

## 2. Descomprimir y ubicar el proyecto

```bash
unzip origen-cafeteria.zip
cd origen-cafeteria
```

Estructura relevante:
```
origen-cafeteria/
├── backend/         # API REST (Node + Express)
├── frontend/        # App web (React + Vite + TypeScript)
├── database/        # schema.sql y seed.sql
└── docs/            # esta documentación
```

## 3. Configurar MySQL

Si MySQL no está corriendo:

```bash
# Linux (systemd)
sudo systemctl start mysql

# macOS con Homebrew
brew services start mysql

# Windows: inicia el servicio "MySQL" desde Servicios, o usa MySQL Workbench
```

Confirma que puedes conectarte:
```bash
mysql -u root -p
```

## 4. Crear la base de datos

Desde la carpeta `database/`:

```bash
cd database
mysql -u root -p < schema.sql
mysql -u root -p origen_cafeteria < seed.sql
```

Esto crea la base `origen_cafeteria` con todas las tablas, y la llena con
datos de desarrollo: usuarios de prueba, categorías, productos, métodos de
pago, zonas de delivery y un pedido de ejemplo.

**Recomendado:** en vez de usar el usuario `root` para la aplicación, crea
un usuario dedicado con permisos solo sobre esta base:

```sql
CREATE USER 'origen_user'@'localhost' IDENTIFIED BY 'elige-una-contraseña-segura';
GRANT ALL PRIVILEGES ON origen_cafeteria.* TO 'origen_user'@'localhost';
FLUSH PRIVILEGES;
```

## 5. Configurar y levantar el backend

```bash
cd ../backend
npm install
cp .env.example .env
```

Edita `.env` y ajusta al menos:
```env
DB_USER=origen_user
DB_PASSWORD=la-contraseña-que-elegiste
JWT_SECRET=genera-una-cadena-larga-y-aleatoria-aquí
```

Para generar un `JWT_SECRET` aleatorio rápido:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Levanta el servidor:
```bash
npm run dev      # con recarga automática (nodemon)
# o
npm start        # modo normal
```

Deberías ver:
```
[server] ORIGEN backend escuchando en http://localhost:4000
[db] Conexión a MySQL establecida correctamente.
```

Verifica con:
```bash
curl http://localhost:4000/api/health
# {"status":"ok","service":"origen-backend"}
```

## 6. Configurar y levantar el frontend

En otra terminal:
```bash
cd frontend
npm install
cp .env.example .env
```

Por defecto `VITE_API_URL=http://localhost:4000/api` ya coincide con el
backend del paso anterior — normalmente no necesitas cambiar nada acá.

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## 7. Credenciales de desarrollo (del seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@origen.dev` | `DevAdmin123!` |
| Cliente | `cliente@origen.dev` | `DevClient123!` |

Inicia sesión como administrador y entra a `/admin` para ver el panel
completo (dashboard, pedidos, productos, imágenes, configuración, etc.).

**Importante:** estas son credenciales de desarrollo incluidas solo para
poder probar el sistema. Antes de usar el proyecto en producción, cambia
estas contraseñas (o elimina esos usuarios del seed) y usa un `JWT_SECRET`
y credenciales de base de datos propios y seguros.

## 8. Probar que todo funciona (opcional)

Con el backend corriendo, desde otra terminal:
```bash
cd backend
python3 scripts/test_e2e.py
```

Esto ejecuta ~76 pruebas reales contra la API (registro, login, pedidos,
pagos QR, verificación de pagos, CRUD de productos/categorías,
configuración, subida de imágenes, control de acceso por rol, etc.) y
reporta cuántas pasaron. Requiere Python 3 (sin dependencias adicionales).

## 9. Probar el flujo completo manualmente

1. Ve a `http://localhost:5173`, explora el **Menú**.
2. Agrega productos al **carrito** y ve a **Checkout**.
3. Completa tus datos, elige "Recoger en cafetería" o "Delivery", y el
   método de pago **QR**.
4. Confirma el pedido → verás el **ticket** con tu número de pedido.
5. Si elegiste QR, sube una imagen como comprobante de pago.
6. Abre otra pestaña, inicia sesión como **admin** (`/login`) y entra a
   `/admin/pagos` → verás el comprobante subido → **Verificar**.
7. Ve a `/admin/pedidos` → cambia el estado del pedido paso a paso.
8. Vuelve a la pestaña del cliente y recarga el ticket (`/pedido/<número>`)
   para ver el estado actualizado.

## Problemas comunes

**`[db] No se pudo conectar a MySQL: connect ECONNREFUSED`**
MySQL no está corriendo, o `DB_HOST`/`DB_PORT` en `.env` no coinciden con
tu instalación. Verifica con `mysqladmin ping`.

**`Access denied for user...`**
Revisa `DB_USER`/`DB_PASSWORD` en `backend/.env` contra el usuario que
creaste en el paso 4.

**El frontend carga pero no muestra productos**
Confirma que `frontend/.env` apunta al puerto correcto del backend
(`VITE_API_URL`), y que corriste `seed.sql` (sin datos, el menú aparece
vacío — eso es correcto, no es un error).

**Puerto ya en uso**
Cambia `PORT` en `backend/.env` (y `VITE_API_URL` en `frontend/.env` para
que coincida), o libera el puerto que está en conflicto.
