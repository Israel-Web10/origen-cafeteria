# Despliegue en Internet: dominio, hosting, HTTPS y operación

> Precios y condiciones verificados el **2026-10-20** en fuentes oficiales; el detalle con enlaces está en
> [investigacion/hosting-y-base-de-datos.md](investigacion/hosting-y-base-de-datos.md) y
> [investigacion/dominio.md](investigacion/dominio.md). **No se contrató ni activó ningún servicio.**
> Antes de pagar, vuelve a revisar los precios: cambian.

## 1. Qué hay que publicar

| Pieza | Qué es | Requisito |
|---|---|---|
| Frontend | Archivos estáticos (`frontend/dist`) | Cualquier hosting estático con HTTPS y regla SPA |
| API | Node.js 20+ (`backend`) | Proceso siempre encendido, HTTPS, variables de entorno |
| Base de datos | PostgreSQL 14+ | Backups, no expuesta a Internet |
| Archivos subidos | Logo, fotos, QR, comprobantes | **Almacenamiento persistente** (disco de VPS o bucket S3/R2) |

## 2. Opciones (resumen de la investigación)

| Paquete | Componentes | Costo mensual estimado | Riesgos / notas |
|---|---|---|---|
| **A. Económico (piloto)** | Cloudflare Pages Free + Render (instancia USD 7) + Neon Free + Cloudflare R2 | ≈ USD 7–8 | Neon Free se suspende por inactividad y tiene backups mínimos: **programar `pg_dump` propio**. R2 requiere activar cuenta (puede pedir tarjeta) |
| **B. Intermedio (operación real)** | Cloudflare Pages + Render USD 7 + Render Postgres (USD 6 + almacenamiento) + R2 | ≈ USD 13–16 | Incluye PITR 3 días y backups de 7 días en Render Postgres |
| **B'. VPS propio** | Hetzner CX23 o Contabo (€4,40–5,50 + IPv4) con Postgres, Nginx y disco local | ≈ €5–7 | Más barato y con disco persistente (sin bucket), pero **tú administras** actualizaciones, firewall y backups |
| **C. Profesional** | Render Pro + instancia 2 GB + Postgres 1 GB | ≈ USD 72–80 | Más recursos y retención de backups |

**¿Vercel o Azure?** Guía específica: [DESPLIEGUE-VERCEL.md](DESPLIEGUE-VERCEL.md).

No recomendados para producción: Vercel Hobby (prohíbe uso comercial), Render Postgres Free (se borra a los
30 días), Render Free para la API (se apaga sin tráfico). Azure SQL/SQL Server no aporta ventaja: obligaría a
reescribir la capa de datos ya probada en PostgreSQL.

**Recomendación:** para empezar, **B'** si alguien puede administrar un servidor Linux; si no, **B** (todo
gestionado) con R2 para imágenes. Ambas dentro de USD 5–16/mes más el dominio.

### Dominio

| Opción | Precio (fuente oficial) |
|---|---|
| `.com.bo` en NIC Bolivia | Bs 280/año |
| `.bo` en NIC Bolivia | Bs 980/año |
| `.com` en Porkbun | USD 11,08 registro y renovación |

Requisitos documentales de NIC Bolivia: **no verificados** (consultar soporte@nic.bo). Activa la renovación
automática: si el dominio vence, la web deja de funcionar.

## 3. Variables de entorno de producción

Plantilla: `deploy/.env.production.example`. Obligatorias:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (activa HSTS y bloquea configuraciones inseguras) |
| `CLIENT_URL` | `https://www.tu-dominio.com` (la API rechaza `localhost` en producción) |
| `JWT_SECRET` | 48 bytes aleatorios |
| `DATABASE_URL` o `DB_*` | Usuario `origen_app` (no el dueño) |
| `DB_SSL` | `verify-full` o `require` en bases administradas |
| `TRUST_PROXY` | `1` detrás de Nginx/Render (para limitar por IP real) |
| `STORAGE_DRIVER` | `local` en VPS; `s3` en Render/Railway (+ variables `S3_*`) |
| `CARD_PROVIDER` | `none` (el modo `test` está bloqueado en producción) |

Frontend: si la API está en otro dominio, `VITE_API_URL=https://api.tu-dominio.com/api/v1` al compilar (con Vercel no hace falta: ver [DESPLIEGUE-VERCEL.md](DESPLIEGUE-VERCEL.md)).
Ninguna URL local queda incrustada en el código.

## 4. Despliegue en un VPS (opción B')

```bash
# Servidor Ubuntu 24.04 recién creado
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql certbot python3-certbot-nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable   # 5432 NO se abre

# Código
sudo useradd -r -m -d /opt/origen origen
sudo -u origen git clone <repositorio> /opt/origen
sudo -u postgres psql -f /opt/origen/database/roles.sql      # tras cambiar contraseñas

cd /opt/origen/backend && sudo -u origen npm ci --omit=dev
sudo -u origen cp ../deploy/.env.production.example .env      # completar
sudo -u origen env DB_USER=origen_owner DB_PASSWORD=... npm run setup
sudo -u origen npm run create-admin -- --email gerente@tu-dominio.com --name "Gerente"

cd /opt/origen/frontend && sudo -u origen npm ci && sudo -u origen npm run build
sudo mkdir -p /var/www/origen && sudo rsync -a dist/ /var/www/origen/

sudo cp /opt/origen/deploy/systemd/origen-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now origen-api
sudo cp /opt/origen/deploy/nginx/origen.conf /etc/nginx/sites-available/origen   # editar dominio
sudo ln -s /etc/nginx/sites-available/origen /etc/nginx/sites-enabled/
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com                     # HTTPS gratuito
sudo nginx -t && sudo systemctl reload nginx

# Respaldo diario
sudo -u origen crontab -e
# 30 3 * * * PGUSER=origen_backup PGPASSWORD=... PGDATABASE=origen_cafeteria BACKUP_DIR=/opt/origen/backups /opt/origen/backend/scripts/backup.sh
```

Alternativa con contenedores: `deploy/docker-compose.yml` (PostgreSQL + API; el puerto de la base no se publica).
*No se pudo probar `docker build` en este entorno porque el servicio de Docker no estaba iniciado.*

### Rendimiento y límites (VPS)

```bash
# Cabeceras de seguridad compartidas por todas las rutas de Nginx
sudo cp deploy/nginx/security-headers.conf /etc/nginx/snippets/origen-security-headers.conf
# En backend/.env: un proceso por núcleo (ver docs/ESCALABILIDAD.md)
#   WEB_CONCURRENCY=2   DB_POOL_MAX=10   PUBLIC_CACHE_TTL_MS=10000
sudo nginx -t && sudo systemctl reload nginx && sudo systemctl restart origen-api
```

Nginx limita por IP (429 al exceder); el servicio arranca con `src/cluster.js`.

## 5. Despliegue gestionado (opción B)

1. **Base de datos** (Render Postgres): crea la base, ejecuta `database/roles.sql` adaptado o usa el usuario
   que entrega el proveedor; copia la `DATABASE_URL` interna. `DB_SSL=require`.
2. **API** (Render Web Service): raíz `backend`, comando de build `npm ci --omit=dev`, comando de inicio
   `node scripts/migrate.js && node scripts/seed-reference.js && npm start`, health check `/api/v1/health`,
   variables del punto 3 con `STORAGE_DRIVER=s3`.
3. **Imágenes** (Cloudflare R2): bucket `origen-media`, dominio público (p. ej. `media.tu-dominio.com`) que
   exponga solo la carpeta `public/`; credenciales en `S3_*`. *El controlador S3 se probó con un cliente
   simulado; haz una prueba real de subida y lectura antes de abrir al público.*
4. **Frontend** (Cloudflare Pages): raíz `frontend`, build `npm run build`, salida `dist`, variable
   `VITE_API_URL`. Edita `frontend/public/_headers` con tus dominios (CSP).
5. **Dominio**: apunta `www` a Pages y `api` a Render; HTTPS lo emiten ambos automáticamente.

## 6. Verificación tras publicar

- [ ] `https://api.../api/v1/health` → `{"status":"ok","db":"ok"}`
- [ ] La web carga por HTTPS y redirige HTTP → HTTPS
- [ ] Pedido de prueba completo (crear, pagar en efectivo, verificar en el panel, cancelar otro)
- [ ] Subir logo y QR; recargar y comprobar que siguen ahí **después de reiniciar/redeploy**
- [ ] Descargar un reporte PDF y uno Excel
- [ ] Restaurar el primer respaldo en una base de prueba
- [ ] Cabeceras: `curl -I https://www.tu-dominio.com` muestra HSTS y CSP

## 7. Logs y monitoreo

- La API escribe un JSON por línea (`journalctl -u origen-api -f` o el panel del proveedor). No registra
  contraseñas, tokens, comprobantes ni la query string (que puede contener el token de seguimiento).
- Monitor gratuito externo sobre `/api/health` (cualquier servicio de "uptime" con plan gratuito) para recibir
  un aviso si la API o la base caen. Revisa las condiciones del servicio elegido antes de usarlo.
- Activa alertas de facturación y límites de gasto en cada proveedor.

## 8. Rollback

1. Código: vuelve al commit anterior (`git checkout <tag>`), `npm ci`, reinicia la API; en Pages/Render usa
   "Redeploy" de la versión anterior.
2. Esquema: las migraciones solo agregan cambios; si una migración nueva causó el problema, restaura el
   respaldo tomado **antes** de desplegar (ver [BASE-DE-DATOS.md](BASE-DE-DATOS.md)).
3. Comunica a los clientes si hubo pedidos afectados (el panel conserva historial y auditoría).
