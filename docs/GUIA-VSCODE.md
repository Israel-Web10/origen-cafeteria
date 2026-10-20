# Ejecutar ORIGEN en tu PC con Visual Studio Code (Windows)

Usa tu PostgreSQL 17 instalado (servicio `postgresql-x64-17`, puerto 5432) y la contraseña del usuario
`postgres` que elegiste al instalarlo.

## 0. Requisitos (una sola vez)

- Node.js 20 o superior (`node -v`)
- PostgreSQL 17 en ejecución
- Visual Studio Code

## 1. Abrir el proyecto

VS Code → **Archivo → Abrir carpeta…** → `origen-cafeteria`.
Abre una terminal con **Terminal → Nueva terminal** (Ctrl + ñ). Los comandos son para PowerShell.

Si clonas en otra PC:

```powershell
git clone https://github.com/Israel-Web10/origen-cafeteria.git
cd origen-cafeteria
git checkout modernizacion-origen
code .
```

## 2. Crear la base de datos y los usuarios (una sola vez)

1. Abre `database/roles.sql` y reemplaza las tres contraseñas `CAMBIAR_...` por contraseñas propias. Anótalas.
2. En la terminal:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -f database\roles.sql
```

(pide la contraseña de `postgres`). Crea la base `origen_cafeteria` y los usuarios `origen_owner`, `origen_app` y `origen_backup`.

## 3. Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Edita `backend\.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=origen_app
DB_PASSWORD=<contraseña de origen_app>
DB_NAME=origen_cafeteria
JWT_SECRET=<el texto que generó el comando anterior>
CARD_PROVIDER=none
```

Crea las tablas con el usuario dueño (solo la primera vez y en cada actualización):

```powershell
$env:DB_USER="origen_owner"; $env:DB_PASSWORD="<contraseña de origen_owner>"
npm run setup
Remove-Item Env:DB_USER, Env:DB_PASSWORD
```

Datos de prueba (opcional, solo en tu PC) y cuenta de administrador:

```powershell
$env:DB_USER="origen_owner"; $env:DB_PASSWORD="<contraseña de origen_owner>"
npm run seed:dev -- --with-history
Remove-Item Env:DB_USER, Env:DB_PASSWORD
npm run create-admin -- --email tu-correo@ejemplo.com --name "Tu Nombre"
```

`seed:dev` crea cuentas de prueba `@origen.dev` (ver `backend/scripts/seed-dev.js`). No lo uses en producción.

Arranca la API (déjala abierta):

```powershell
npm run dev
```

Comprueba en el navegador: http://localhost:4000/api/health → `{"status":"ok","db":"ok"}`

## 4. Frontend (segunda terminal: botón **+** de la terminal)

```powershell
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. El panel está en http://localhost:5173/login (entra con la cuenta de administrador).

## 5. Uso diario

| Paso | Terminal | Comando |
|---|---|---|
| 1 | Backend | `cd backend` → `npm run dev` |
| 2 | Frontend | `cd frontend` → `npm run dev` |
| 3 | Navegador | http://localhost:5173 |

Ctrl + C detiene cada servidor.

## 6. Verificar el proyecto

```powershell
cd backend
npm test        # requiere una base de pruebas, ver abajo
npm run lint
npm audit
cd ..\frontend
npm run build   # traducciones + TypeScript + compilación
npm run lint
npm audit
```

Base para `npm test` (su nombre debe terminar en `_test`; se borra en cada ejecución):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE origen_test OWNER origen_owner"
$env:DB_USER="origen_owner"; $env:DB_PASSWORD="<contraseña de origen_owner>"; npm test; Remove-Item Env:DB_USER, Env:DB_PASSWORD
```

## 7. Problemas frecuentes

| Mensaje | Solución |
|---|---|
| `JWT_SECRET debe tener al menos 32 caracteres` | Falta el secreto en `backend\.env` |
| `password authentication failed` | Usuario o contraseña incorrectos en `.env` |
| `permission denied for schema public` | Ejecuta `npm run setup` con `origen_owner` |
| La web no muestra productos | La API no está encendida (paso 3) o no cargaste productos |
| `EADDRINUSE :4000` | Ya hay otra API abierta: ciérrala o cambia `PORT` en `.env` |
| `psql` no se reconoce | Usa la ruta completa `C:\Program Files\PostgreSQL\17\bin\psql.exe` |
