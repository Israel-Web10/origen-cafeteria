# Ejecutar ORIGEN en tu PC con Visual Studio Code (Windows)

Tres comandos, en este orden. Todo se escribe en la terminal de VS Code, **desde la carpeta
`origen-cafeteria`** (no dentro de `backend` ni de `frontend`).

## 0. Requisitos (una sola vez)

| Programa | Cómo comprobarlo | Dónde conseguirlo |
|---|---|---|
| Node.js 20 o superior | `node -v` | https://nodejs.org (versión LTS) |
| PostgreSQL 14 o superior, **encendido** | Servicios de Windows → `postgresql-x64-17` → "En ejecución" | https://www.postgresql.org/download/windows/ |
| La contraseña del usuario `postgres` | La elegiste al instalar PostgreSQL | — |
| Visual Studio Code | — | https://code.visualstudio.com |

## 1. Abrir el proyecto

VS Code → **Archivo → Abrir carpeta…** → elige `origen-cafeteria`.
Abre una terminal: **Terminal → Nueva terminal** (Ctrl + ñ).

Si es una PC nueva:

```powershell
git clone https://github.com/Israel-Web10/origen-cafeteria.git
cd origen-cafeteria
git checkout modernizacion-origen
code .
```

## 2. Instalar (una sola vez, o cuando algo falle)

```powershell
npm run setup
```

El asistente hace todo:

1. Instala las dependencias del backend y del frontend.
2. Crea `backend\.env` y genera el secreto `JWT_SECRET`.
3. Prueba la conexión a PostgreSQL. Si el usuario no existe o la contraseña no coincide, te pregunta si
   quieres usar el usuario `postgres` y te pide su contraseña (no se ve al escribir; es normal).
4. Crea la base `origen_cafeteria`, sus tablas y los textos legales.
5. Pregunta si quieres **datos de demostración**: 19 productos con fotos, dos meses de pedidos simulados y
   cuentas de prueba `@origen.dev`. Responde **S** para practicar o presentar.

## 3. Arrancar (cada día)

```powershell
npm run dev
```

Arranca la API y la web juntas. Cuando veas **"✔ Listo"**, abre:

- Web: http://localhost:5173
- Panel del gerente: http://localhost:5173/login (las cuentas de prueba están en
  `backend\scripts\seed-dev.js`, línea 8)

**Ctrl + C** detiene las dos.

También puedes usar el menú, sin escribir: **Terminal → Ejecutar tarea… → "ORIGEN: iniciar web y API"**
(o **Ctrl + Shift + B**).

## 4. Si algo falla

```powershell
npm run doctor
```

Revisa todo **sin cambiar nada** y te dice qué falta.

| Mensaje | Qué hacer |
|---|---|
| `JWT_SECRET vacío o corto` | `npm run setup` (lo genera) |
| `PostgreSQL rechazó el usuario…` | `npm run setup` y acepta usar el usuario `postgres` |
| `PostgreSQL no responde en localhost:5432` | Enciende el servicio: Servicios de Windows → `postgresql-x64-17` → Iniciar |
| `Faltan las tablas` | `npm run setup` |
| `EADDRINUSE :4000` o `:5173` | Ya hay otra copia abierta: ciérrala (Ctrl + C en su terminal) o reinicia VS Code |
| `npm` no se reconoce | Reinstala Node.js y **reinicia VS Code** |
| La web abre pero sin productos | La API no arrancó: mira las líneas `[api]` en la terminal |

## 5. Comprobar la calidad del proyecto

```powershell
npm test   # pruebas del backend + compilación del frontend
```

Las pruebas del backend usan una base aparte cuyo nombre termina en `_test` y que se borra en cada
ejecución. Créala una vez:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE origen_test"
```

## 6. Producción (no en tu PC)

En un servidor real **no** se usa el usuario `postgres` ni los datos de demostración. Se crean usuarios
con permisos mínimos (`database/roles.sql`) y el primer administrador con `npm run create-admin`. Ver
[DESPLIEGUE.md](DESPLIEGUE.md) y [DESPLIEGUE-VERCEL.md](DESPLIEGUE-VERCEL.md).
