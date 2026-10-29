# Escalabilidad y protección ante picos

Objetivo: que la web no se sature ni se vuelva lenta con **1000 personas a la vez**, y que un abuso
(bots, fuerza bruta, scraping) no tumbe el servicio.

## Capas

```
Visitante ─▶ Nginx ─────────────▶ Node (N procesos) ─────────────▶ PostgreSQL
             · límite por IP       · micro-caché de lecturas          · pool de conexiones
             · límite de conex.    · límites por IP por acción        · bloqueos por fila en pedidos
             · estáticos con caché · /api/v1 versionada
```

| Capa | Qué hace | Dónde |
|---|---|---|
| Nginx `limit_req` / `limit_conn` | Tope **global** por IP: API general 20 req/s (ráfaga 40); login/registro 10/min; crear pedidos y comprobantes 30/min; 40 conexiones simultáneas por IP. Exceso → 429 | `deploy/nginx/origen.conf` |
| Nginx estáticos | El frontend (`/assets`, `/media`) se sirve sin pasar por Node, con caché larga | Ídem |
| Keep-alive Nginx → Node | Reutiliza conexiones TCP hacia la API | `upstream origen_api` |
| Micro-caché | Las lecturas públicas idénticas (carta, configuración, páginas, promociones) se sirven desde memoria 10 s. **Sin estampida**: si 1000 peticiones iguales llegan juntas, solo una consulta la BD | `backend/src/middleware/microCache.js` |
| Invalidación | Cualquier cambio del personal vacía la caché al instante; una lectura iniciada antes del cambio no guarda datos viejos | `backend/src/app.js` |
| Multiproceso | `WEB_CONCURRENCY=N` lanza N procesos de Node (uno por núcleo); si uno cae, se reemplaza | `backend/src/cluster.js` |
| Límites por acción | Login, pedidos, seguimiento, subidas y reportes con límites propios por IP | `backend/src/middleware/rateLimits.js` |
| Pool de BD | `DB_POOL_MAX` conexiones por proceso; tiempo máximo por consulta (`DB_STATEMENT_TIMEOUT_MS`) | `backend/src/config/db.js` |

## Configuración recomendada

| Servidor | `WEB_CONCURRENCY` | `DB_POOL_MAX` | Conexiones totales | `max_connections` de PostgreSQL |
|---|---|---|---|---|
| VPS 1 vCPU | 1 | 10 | 10 | 100 (por defecto) |
| VPS 2 vCPU | 2 | 10 | 20 | 100 |
| VPS 4 vCPU | 4 | 10 | 40 | 100 |

Regla: `WEB_CONCURRENCY × DB_POOL_MAX` debe quedar **bien por debajo** de `max_connections`, dejando margen
para backups y administración. En una base gestionada con pocas conexiones (planes pequeños suelen
permitir 20–25), baja `DB_POOL_MAX` a 5.

## Por qué el límite general por IP es generoso

En Bolivia muchas redes móviles comparten una misma IP pública entre muchos clientes (CGNAT). Un límite
general estricto bloquearía a clientes reales. Por eso:

- el límite general (`RATE_LIMIT_GENERAL_PER_MIN`, 300/min por proceso) es amplio;
- los límites estrictos se reservan para las acciones sensibles (login, pedidos, subidas, reportes).

Si aparecen 429 legítimos en la hora pico, se sube `RATE_LIMIT_GENERAL_PER_MIN` o la tasa de `origen_api`
en Nginx. Los límites estrictos no deben relajarse.

## Medición real (2026-10-23)

1000 conexiones simultáneas durante 30 s. Cada conexión repite sin pausa la mezcla de una visita:

- configuración;
- categorías;
- carta;
- destacados;
- promociones;
- populares;
- política de cookies.

Las condiciones de la medición:

- La misma máquina (Windows 11, 12 núcleos lógicos) genera la carga y ejecuta la API y la BD.
- No hay Nginx ni HTTPS.
- Los límites por IP están desactivados, porque toda la carga sale de una sola IP.

| Configuración | Peticiones/s | p50 | p99 | Errores |
|---|---|---|---|---|
| Sin caché, 1 proceso | 987 | 941 ms | 1.563 ms | 0 |
| Caché ingenua, 1 proceso (primera versión) | 1.620 | 134 ms | 5.063 ms | **440 errores 500** (estampida al arrancar) |
| Caché sin estampida, 1 proceso | 3.054 | 318 ms | 1.294 ms | 0 |
| Caché sin estampida, 4 procesos | **6.636** | **6 ms** | 466 ms | 0 |

Cómo leerlo:

- Una persona real hace una petición cada pocos segundos, no cientos.
- 1000 usuarios **simultáneos** navegando generan del orden de 200–400 peticiones por segundo.
- La configuración de 4 procesos atiende unas 15 veces eso, con la mitad de las respuestas en 6 ms.
- Con 1000 conexiones sin pausa, la latencia de 1 proceso refleja la cola: 1000 ÷ 3054 ≈ 0,33 s.

Estos números **no son una garantía para producción**. Hay que repetirlos en el servidor elegido, con
Nginx y HTTPS, desde otra máquina.

La creación de pedidos se midió aparte en el peor caso, con todos comprando el mismo producto:
~129 pedidos/s, sin stock negativo (ver [PRUEBAS.md](PRUEBAS.md)).

## Cómo repetir la prueba

En un entorno de pruebas, nunca en producción con clientes:
```bash
cd backend
PORT=4100 RATE_LIMIT_GENERAL_PER_MIN=100000000 LOG_LEVEL=warn WEB_CONCURRENCY=4 node src/cluster.js
# en otra terminal
npx autocannon -c 1000 -d 30 http://localhost:4100/api/v1/products?limit=24
```

## Si algún día no alcanza

1. Más procesos o un VPS con más núcleos (lo más barato).
2. Un CDN delante del dominio, por ejemplo el plan gratuito de Cloudflare. Sirve el frontend y absorbe ataques.
3. Varias instancias de la API detrás de un balanceador. En ese caso, para que los límites por IP y la
   caché se compartan entre servidores, añadir Redis. Hoy no hace falta: Nginx ya pone el tope global en
   un solo servidor.
