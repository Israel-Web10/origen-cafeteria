# Instalación de ORIGEN paso a paso

> **Camino rápido (recomendado):** desde la carpeta del proyecto, `npm run setup` desde la raíz y luego
> `npm run dev`. El asistente hace por ti los pasos de esta guía. Paso a paso, con la tabla de errores frecuentes:
> [GUIA-VSCODE.md](GUIA-VSCODE.md). Esta guía queda como referencia del proceso manual y de producción.

Esta guía está pensada para alguien sin experiencia en programación. Sigue los pasos en orden.

## 1. Programas necesarios

| Programa | Para qué | Dónde |
|---|---|---|
| Node.js 20 o superior (versión LTS) | Ejecuta la API y compila la web | https://nodejs.org |
| PostgreSQL 14 o superior | Base de datos | https://www.postgresql.org/download/ |
| Git (opcional) | Descargar y actualizar el proyecto | https://git-scm.com |

Durante la instalación de PostgreSQL en Windows se pide una contraseña para el usuario
`postgres`: **anótala en un lugar seguro**; es el superusuario de la base de datos.

## 2. Crear la base de datos y los usuarios

1. Abre `database/roles.sql` con un editor de texto y reemplaza las tres contraseñas
   `CAMBIAR_...` por contraseñas largas y distintas (puedes generarlas con
   `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`).
2. Ejecuta (Windows: en "SQL Shell (psql)" o en PowerShell):

```bash
psql -U postgres -f database/roles.sql
```

Esto crea la base `origen_cafeteria` y tres usuarios:
`origen_owner` (solo para migraciones), `origen_app` (la usa la API) y `origen_backup` (respaldos).

## 3. Configurar el backend

```bash
cd backend
npm install
copy .env.example .env        # en Linux/macOS: cp .env.example .env
```

Edita `backend/.env`:

| Variable | Valor |
|---|---|
| `DB_USER` / `DB_PASSWORD` | `origen_app` y su contraseña |
| `DB_NAME` | `origen_cafeteria` |
| `JWT_SECRET` | Resultado de `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `CLIENT_URL` | `http://localhost:5173` en tu PC; el dominio real en producción |

Aplica la estructura de la base **con el usuario dueño** (solo esta vez y en cada actualización):

```bash
# Windows PowerShell
$env:DB_USER="origen_owner"; $env:DB_PASSWORD="contraseña_owner"; npm run setup; Remove-Item Env:DB_USER, Env:DB_PASSWORD
# Linux/macOS
DB_USER=origen_owner DB_PASSWORD=contraseña_owner npm run setup
```

Crea la cuenta del administrador (te pedirá la contraseña sin mostrarla):

```bash
npm run create-admin -- --email gerente@tu-negocio.com --name "Nombre Apellido"
```

Inicia la API:

```bash
npm start          # producción
npm run dev        # desarrollo (se reinicia al cambiar código)
```

Comprueba en el navegador: `http://localhost:4000/api/health` debe responder `{"status":"ok","db":"ok"}`.

## 4. Configurar el frontend

```bash
cd frontend
npm install
npm run dev        # desarrollo: http://localhost:5173
npm run build      # producción: genera la carpeta dist/
```

En desarrollo `/api` se reenvía automáticamente a `http://localhost:4000`.
En producción, si la API está en otro dominio, crea `frontend/.env` con
`VITE_API_URL=https://api.tu-dominio.com/api` **antes** de `npm run build`.

## 5. Primeros pasos en el panel

Entra en `http://localhost:5173/login` con la cuenta creada y sigue el
[Manual del gerente](MANUAL-GERENTE.md): datos del negocio, horarios, logo, QR de pago,
categorías, productos, insumos y textos legales revisados.

## 6. Datos de demostración (solo en una PC de pruebas)

```bash
cd backend
npm run seed:dev                    # catálogo, insumos y cuentas de prueba
npm run seed:dev -- --with-history  # + ~60 días de pedidos SIMULADOS para ver el panel con datos
```

Nunca lo ejecutes en producción: el script se niega si `NODE_ENV=production`.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `[config] Variables de entorno inválidas: JWT_SECRET` | Falta o es corto el `JWT_SECRET` en `backend/.env` |
| `password authentication failed` | Usuario/contraseña de la base incorrectos en `.env` |
| `permission denied for schema public` al migrar | Ejecuta las migraciones con `origen_owner`, no con `origen_app` |
| La web abre pero no carga productos | La API no está encendida o `VITE_API_URL` apunta a otro lugar |
| `must be owner of table` | Mismo caso: migrar con el usuario dueño |
