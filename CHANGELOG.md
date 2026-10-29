# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
[versionado semántico](https://semver.org/lang/es/): **MAYOR** rompe compatibilidad
(p. ej. una API `/api/v2`), **MENOR** añade funciones compatibles, **PARCHE** corrige errores.

La API pública está versionada en la URL (`/api/v1`). `/api` es un alias de la versión
vigente para no romper clientes antiguos. Un cambio incompatible se publicará como `/api/v2`
manteniendo `/api/v1` durante la transición y se anunciará aquí.

## [2.3.0] — 2026-10-29

### Añadido
- Instalación en un comando desde la raíz: `npm run setup` (asistente que crea `backend/.env`, genera
  `JWT_SECRET`, prueba PostgreSQL, crea la base y carga datos), `npm run dev` (API y web juntas) y
  `npm run doctor` (diagnóstico sin cambios). Tareas de VS Code en `.vscode/tasks.json`.
- Integración continua en GitHub Actions: pruebas con PostgreSQL real, lint, build y escaneo de secretos.
- `npm run smoke -- <url>`: prueba de humo de una web publicada (API, carta, páginas, cabeceras, carga).
- Inicio: relato "Del cafetal a la taza" guiado por el scroll y sección "Tu pedido en tres pasos" con
  iconos animados; visor de fotos a pantalla completa en las galerías; barra de progreso de lectura y de
  posición en los carruseles.

### Corregido
- `npm run setup` fallaba con `JWT_SECRET` vacío o con un usuario de PostgreSQL inexistente: ahora el
  asistente lo detecta y lo resuelve.

## [2.2.0] — 2026-10-24

### Añadido
- 9 productos de demostración más con foto (americano, latte, macchiato, cold brew, smoothie, cheesecake,
  galletas, empanadas, tostada con palta) y una segunda foto en la ficha de 4 productos.
- *Nuestra historia* con fotos del cafetal al tostado; encabezado de *Promociones* con imagen propia.
- Videos de fondo en los encabezados de carta, historia, promociones y la cafetería (Mixkit, licencia
  libre). Solo en pantallas medianas o grandes y sin "ahorro de datos" ni movimiento reducido.
- `frontend/vercel.json` (reescritura de `/api` al backend, rutas de la SPA y cabeceras de seguridad) y
  guía [docs/DESPLIEGUE-VERCEL.md](docs/DESPLIEGUE-VERCEL.md): Vercel, Azure y la base de datos al entregar.

## [2.1.0] — 2026-10-23

### Añadido
- Portada "desde la calle": fachada ilustrada original con capas en paralaje (cielo de día/noche
  según la hora de La Paz, Illimani, ciudad). **Entrar** acerca la cámara al interior;
  **Ubicación** inclina la escena y la convierte en un mapa que lleva a *Visítanos*.
  El gerente puede poner una foto real de la fachada (`facade_image_url`) o desactivar la escena.
- Fotografías de la carta (Unsplash, licencia libre) y galería con fotogramas de los videos del propietario.
- Recomendaciones automáticas en el panel: reglas sobre los propios datos (stock, cancelaciones,
  descuentos, hora pico, día flojo, dependencia de un producto, productos sin ventas, costos faltantes).
  Sin IA externa y sin costo.
- API versionada: `/api/v1`, cabecera `API-Version` y `GET /api/v1/version`.
- Escalabilidad: micro-caché de lecturas públicas con invalidación al editar, arranque multiproceso
  (`WEB_CONCURRENCY`), límites globales en Nginx (`limit_req`/`limit_conn`) y conexiones keep-alive.
- Escáner de secretos (`scripts/check-secrets.mjs`) y gancho `pre-commit` que bloquea claves y `.env`.
- Prueba automatizada de inyección SQL.

### Cambiado
- El frontend usa `/api/v1` por defecto.
- `npm start` arranca `src/cluster.js` (con `WEB_CONCURRENCY=1` equivale al arranque anterior).
- Límite general por IP configurable (`RATE_LIMIT_GENERAL_PER_MIN`).

### Corregido
- Nginx: las cabeceras de seguridad (CSP, HSTS…) se perdían en `index.html` y `/assets/` porque un
  `add_header` dentro de un `location` anula los del `server`. Ahora se incluyen desde un fragmento común.

## [2.0.0] — 2026-10

### Añadido
- Modernización integral (fases 1–9): PostgreSQL con migraciones versionadas, catálogo, carrito y
  checkout separados, pagos QR/efectivo/tarjeta de prueba, panel del gerente, inventario con recetas,
  analítica, reportes PDF/Excel, monedas, i18n es/en/fr, cookies y páginas legales, despliegue y pruebas.
  Detalle en `docs/INFORME-FINAL.md`.

### Seguridad
- Dependencias del backend sin vulnerabilidades conocidas; guía de VS Code.

## [1.0.0]

- Primera versión de ORIGEN (MySQL, sitio de una sola página).
