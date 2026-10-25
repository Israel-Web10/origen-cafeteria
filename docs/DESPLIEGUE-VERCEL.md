# Desplegar con Vercel, ¿hace falta Azure?, y la base de datos al entregar

Comprobado el 2026-10-24 en la documentación oficial de Vercel. Precios de bases de datos y de Azure:
[investigacion/hosting-y-base-de-datos.md](investigacion/hosting-y-base-de-datos.md) (consultados el 2026-10-20).
Los precios cambian: revísalos antes de contratar.

## Respuestas cortas

| Pregunta | Respuesta |
|---|---|
| ¿Puedo usar Vercel? | **Sí, para el frontend** (la web que ve el cliente). Ya está preparado: `frontend/vercel.json` |
| ¿Gratis? | **No para el negocio en marcha.** El plan Hobby es *"non-commercial, personal use only"*. Sirve para enseñar una demo privada; para vender hay que usar **Pro (USD 20 por usuario/mes)** o Cloudflare Pages Free |
| ¿Y el backend (API) en Vercel? | **No lo recomiendo** sin cambios (ver abajo). Mejor en Render (USD 7/mes) o en un VPS |
| ¿Necesito Azure? | **No.** Nada del proyecto depende de Azure. Solo tiene sentido si ya tienes créditos o tu empresa trabaja con Azure |
| ¿Dónde va la base de datos? | PostgreSQL gestionado: Render Postgres (desde USD 6/mes, con backups) o Neon (gratis para empezar, backups mínimos) |

## Arquitectura recomendada con Vercel

```
Cliente ──▶ www.tu-dominio.com (Vercel: frontend)
                 │  /api/*  y  /uploads/public/*  (reescritura, mismo dominio)
                 ▼
            api.tu-dominio.com (Render: API Node, siempre encendida)
                 │
                 ▼
            PostgreSQL gestionado (Render Postgres o Neon)      Imágenes subidas → Cloudflare R2
```

El frontend reenvía `/api` a la API **desde el mismo dominio**. Así no hace falta CORS y la CSP queda con
`connect-src 'self'`. El navegador nunca ve la dirección interna.

### Por qué la API no va dentro de Vercel

Vercel ejecuta Express como funciones *serverless*. Funciona, pero este backend está pensado para un
servidor que siempre está encendido:

| Tema | Problema en funciones de Vercel |
|---|---|
| Comprobantes y fotos | Límite oficial de **4,5 MB por petición**; la API acepta hasta 5 MB. Además, el disco no es persistente: lo subido se perdería (habría que usar R2 sí o sí) |
| Base de datos | Cada instancia abre su propio pool. Con picos se agotan las conexiones de PostgreSQL; haría falta un *pooler* (PgBouncer o el de Neon) |
| Límites por IP y micro-caché | Viven en memoria. Con muchas instancias efímeras pierden eficacia |
| Reportes PDF/Excel grandes | Máximo 300 s en Hobby. Suele bastar, pero cuenta como tiempo de función facturable en Pro |

Se puede adaptar más adelante si se quiere todo en Vercel. Hoy es más simple y barato tener la API en
Render o en un VPS.

## Paso a paso

### 1. Base de datos

1. Crea un PostgreSQL 16 o 17 en **Render Postgres** (recomendado: tiene backups y restauración a un punto
   en el tiempo) o en **Neon**. Usa la **región más cercana a la API** (misma región en Render).
2. Copia la cadena de conexión. Activa SSL: `DB_SSL=require`.
3. Mínimo privilegio: si el proveedor lo permite, ejecuta `database/roles.sql` (dueño / app / backup). Si
   solo te da un usuario, úsalo y guarda esa limitación en el acta de entrega.

### 2. API en Render

| Campo | Valor |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci --omit=dev` |
| Pre-deploy command | `node scripts/migrate.js && node scripts/seed-reference.js` |
| Start command | `npm start` (arranca `src/cluster.js`) |
| Health check | `/api/v1/health` |
| Instancia | De pago, siempre encendida (la Free se apaga sin tráfico) |

Variables de entorno (en el panel de Render, **nunca en el repositorio**):

```
NODE_ENV=production
CLIENT_URL=https://www.tu-dominio.com
JWT_SECRET=<48 bytes aleatorios>
DATABASE_URL=<la de tu proveedor>
DB_SSL=require
DB_POOL_MAX=10
TRUST_PROXY=2            # Vercel + Render delante de la API; comprueba que los 429 se apliquen por IP real
STORAGE_DRIVER=s3        # + S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL
CARD_PROVIDER=none
WEB_CONCURRENCY=1
```

Después del primer despliegue, crea el administrador desde la consola de Render (*Shell*). La contraseña se
pide por teclado:

```bash
npm run create-admin -- --email gerente@tu-dominio.com --name "Nombre del gerente"
```

**Nunca ejecutes `seed-dev.js` en producción**: crea usuarios y pedidos de demostración.

### 3. Frontend en Vercel

1. En `frontend/vercel.json`, cambia `https://api.tu-dominio.com` por la dirección real de tu API (dos veces).
2. Si usas R2 para imágenes subidas, añade el dominio público del bucket a `img-src` en la cabecera
   `Content-Security-Policy` del mismo archivo.
3. En vercel.com → *Add New → Project* → importa el repositorio de GitHub.
4. **Root Directory: `frontend`**. Vercel detecta Vite: build `npm run build`, salida `dist`. No hace falta
   `VITE_API_URL`: la web usa `/api/v1` en su propio dominio.
5. *Deploy*. Luego, en *Settings → Domains*, añade `www.tu-dominio.com`. Vercel emite el certificado HTTPS.
6. Con el plan **Pro**, activa **Spend Management** (tope de gasto y alertas) desde el primer día.

### 4. Verificación

- `https://www.tu-dominio.com/api/v1/health` → `{"status":"ok","db":"ok"}`
- Recarga directa en `/carta`, `/visitanos` o `/admin`: carga la página, no un 404.
- Pedido de prueba completo y verificación en el panel.
- Subir una imagen; hacer *redeploy* de la API; la imagen sigue ahí (prueba de que R2 funciona).
- `curl -I https://www.tu-dominio.com` muestra HSTS y CSP.
- Resto de la lista: [DESPLIEGUE.md §6](DESPLIEGUE.md#6-verificación-tras-publicar).

## ¿Y Azure?

**No es necesario.** El proyecto usa PostgreSQL estándar y funciona en cualquier proveedor. Azure tendría
sentido solo si ya tienes créditos (por ejemplo, de estudiante o de empresa) o un contrato con Microsoft.

Si aun así lo contratas, lo equivalente es:

- **Azure Database for PostgreSQL – Flexible Server**, tamaño B1MS.
- **Azure App Service** (Linux, Node) para la API.
- **Azure Blob Storage** para imágenes. Necesitaría un controlador nuevo: hoy el código habla S3, no Blob.

Cómo administrarlo sin sustos:

1. **Presupuesto antes que nada**: *Cost Management → Budgets* con alertas al 50 %, 80 % y 100 %. Azure
   avisa, pero **no corta el gasto** por sí solo.
2. **Cuidado con la oferta gratuita.** Según la investigación del 20-10:
   - da 30 días de crédito y 12 meses de B1MS;
   - hay que pasar a pago por uso dentro de esos 30 días;
   - desde el **mes 13** se cobra el servidor completo, aproximadamente USD 12,41/mes en B1MS (East US).

   Apunta esa fecha en el calendario.
3. **Todo en un solo *Resource Group*** (`origen-prod`). Así ves el costo total y puedes borrarlo de una vez.
4. **Red**: PostgreSQL sin acceso público, o con *firewall* limitado a la IP de la API; SSL obligatorio.
5. **Backups**: Flexible Server guarda backups automáticos (7 días por defecto). Haz también un `pg_dump`
   semanal fuera de Azure con `backend/scripts/backup.sh`.
6. **Accesos**: cuenta a nombre del negocio, MFA obligatorio y roles mínimos (*Reader* para quien solo mira).
7. **Revisión mensual** de la factura y de los recursos creados: discos, IPs públicas o *snapshots* olvidados
   siguen cobrando.

## La base de datos al entregar y desplegar

### Antes de entregar

- [ ] **Las cuentas son del negocio**, no del desarrollador: proveedor de BD, hosting, dominio, Vercel y R2,
      con correo y medio de pago del negocio, y MFA activado.
- [ ] Base de producción **limpia**:
  - solo `migrate.js` + `seed-reference.js` + el administrador creado con `create-admin`;
  - sin `seed-dev.js` ni pedidos o usuarios de prueba.
- [ ] `schema_migrations` al día: `node scripts/migrate.js` no aplica nada nuevo.
- [ ] Usuario de la app **sin permisos de dueño** (`origen_app`); el dueño solo se usa para migrar.
- [ ] SSL activo (`DB_SSL=require` o `verify-full`) y base **sin acceso público abierto**.
- [ ] Contraseñas y `JWT_SECRET` nuevos para producción. **Ninguno reutilizado de desarrollo.** Se entregan
      en un gestor de contraseñas, nunca por chat o correo en texto plano.
- [ ] Zona horaria del negocio en *Configuración* (`America/La_Paz`); la BD guarda en UTC.
- [ ] Imágenes ilustrativas revisadas: reemplazarlas por fotos reales, o confirmar que se aceptan como ilustrativas.

### Respaldo y recuperación (lo más importante)

- [ ] Backups automáticos del proveedor activos; anota cuántos días guarda.
- [ ] **Copia propia fuera del proveedor**: `pg_dump` diario o semanal con `backend/scripts/backup.sh`
      (genera SHA-256), guardada en otro sitio (otra nube o disco del negocio).
- [ ] **Restauración probada** en una base vacía antes de abrir al público (`scripts/restore.*`).
      Un backup que nunca se restauró no está comprobado.
- [ ] Quién recibe el aviso si la base se cae: monitor de `/api/v1/health` con correo al responsable.

### Capacidad y costos

- Conexiones: `WEB_CONCURRENCY × DB_POOL_MAX` por debajo del máximo del plan. En planes pequeños, que
  admiten 20–25 conexiones, usa `DB_POOL_MAX=5`.
- Tamaño: la carta y los pedidos de una cafetería ocupan poco (cientos de MB en años). Las **imágenes no
  van en la base**, van en R2 o en disco.
- Alerta del proveedor al 80 % del almacenamiento.

### Después de entregar

- Cada actualización del código: primero backup, luego despliegue (las migraciones se aplican solas en el
  *pre-deploy*). Si algo falla: [DESPLIEGUE.md §8 Rollback](DESPLIEGUE.md#8-rollback).
- Datos personales: definir con asesoría el plazo de conservación (`data_retention_months`, ver
  [LEGAL.md](LEGAL.md)).
- Una vez al año: probar de nuevo la restauración y revisar quién tiene acceso.
