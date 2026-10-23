# Seguridad: riesgos, medidas y riesgos residuales

Auditoría realizada sobre el código original (ver [AUDITORIA.md](AUDITORIA.md) §4) y verificada con pruebas
automatizadas ([PRUEBAS.md](PRUEBAS.md)). Cada medida indica dónde está implementada.

## Conceptos que se distinguen

| Concepto | Cómo se trata |
|---|---|
| **Hashing de contraseñas** | bcrypt coste 12; nunca se guardan ni devuelven en claro (`userService.js`) |
| **Tokens de autenticación** | JWT HS256 firmado con `JWT_SECRET`, 12 h, revocable con `token_version` |
| **Token de seguimiento** | 192 bits aleatorios por pedido; comparación en tiempo constante |
| **Cifrado en tránsito** | HTTPS obligatorio en producción (HSTS); TLS hacia la base (`DB_SSL`) |
| **Datos públicos** | Catálogo, horarios, contenido publicado |
| **Datos personales** | Nombre, teléfono, correo, dirección: solo personal autorizado y el propio cliente |
| **Secretos de aplicación** | Solo en variables de entorno del servidor; nunca en el frontend ni en el repositorio |

No se cifran campos de la base de forma indiscriminada: los datos personales deben poder buscarse
(por teléfono o nombre en el panel). Se protegen con control de acceso, red privada para la base,
cifrado del disco del proveedor y respaldos con permisos restringidos.

## Registro de riesgos

| # | Riesgo | Medida aplicada | Dónde | Residual |
|---|---|---|---|---|
| 1 | Manipulación de precios/totales | Precios, promociones, envío y total solo en servidor; campos desconocidos rechazados; `CHECK` del total en BD | `orderService.priceOrder`, `schemas.orderCreate`, migración 001 | Bajo |
| 2 | Cantidades negativas / stock negativo | `quantity` 1–50; `CHECK (stock >= 0)`; actualización condicional; bloqueo `FOR UPDATE` ordenado | `inventoryService`, `orderService` | Bajo (probado con 300 pedidos simultáneos) |
| 3 | Pedidos duplicados | `Idempotency-Key` única; número desde secuencia | `orderRoutes`, `orders.idempotency_key` | Bajo |
| 4 | IDOR / exposición de datos | Seguimiento exige token secreto o últimos 4 dígitos (vista reducida sin contacto); `GET /orders/:id` exige dueño, personal o token | `orderService.track/verifyAccess` | Bajo. Los 4 dígitos son un factor débil: por eso la vista es reducida y el endpoint tiene límite de frecuencia |
| 5 | Subida de archivos maliciosos | Tipo por firma binaria (JPG/PNG/WEBP), sin SVG/HTML; nombre aleatorio; dimensiones máximas; 5 MB; CSP `sandbox` y `nosniff` al servirlos | `storageService`, `app.js` | Bajo |
| 6 | Comprobantes de pago expuestos | Almacenamiento privado; solo personal autenticado vía endpoint | `paymentRoutes /:id/proof` | Bajo |
| 7 | Confirmación falsa de pagos | Ningún pago se confirma automáticamente; verificación por personal con registro de quién/cuándo; tarjeta solo simulador bloqueado en producción | `paymentService.review`, `env.js` | **Medio**: un comprobante falsificado puede engañar a una persona → el panel advierte contrastar con el banco |
| 8 | Fuerza bruta / abuso / saturación | Bloqueo de cuenta tras 5 fallos (15 min); límites por IP en auth, pedidos, seguimiento, subidas y reportes; **tope global en Nginx** (`limit_req`/`limit_conn`) y micro-caché sin estampida (ver [ESCALABILIDAD.md](ESCALABILIDAD.md)) | `userService.login`, `rateLimits.js`, `deploy/nginx/origen.conf` | Bajo con Nginx; los límites de Node son por proceso |
| 9 | Escalada de privilegios | Roles verificados en cada endpoint; mass assignment imposible (zod `.strict()`); no se puede cambiar el propio rol; siempre queda un admin | `auth.js`, `schemas.js`, `userService.adminUpdate` | Bajo |
| 10 | Sesiones robadas | Expiración 12 h; revocación al cambiar contraseña/rol/estado; "cerrar todas las sesiones" | `auth.js`, `userService` | Medio: el token vive en `localStorage` (riesgo si hubiera XSS); mitigado por CSP estricta y React (escapa por defecto). Alternativa futura: cookie `HttpOnly` + protección CSRF |
| 11 | XSS | React escapa salida; el Markdown editable no admite HTML y solo enlaces `https://` o rutas internas sin `//` ni `\`; CSP sin `unsafe-inline` en scripts | `Markdown.tsx`, `_headers`, Nginx | Bajo |
| 12 | CSRF | No aplica: la autenticación usa cabecera `Authorization`, no cookies | — | — |
| 13 | SQL injection | 100 % consultas parametrizadas; nombres de tabla y ordenaciones dinámicas solo desde listas blancas; entradas validadas con zod. **Prueba automatizada** con cargas típicas (`' OR '1'='1`, `; DROP TABLE`, `UNION SELECT`…) en búsqueda, categoría, login, seguimiento, slug y orden | servicios, `slug.js`, `tests/api.test.js` | Bajo (probado) |
| 14 | SSRF | El servidor no descarga URLs proporcionadas por usuarios (no hay API externa de tipo de cambio) | — | — |
| 15 | Path traversal | Claves de archivo con formato estricto y `path.resolve` acotado | `storageService.localPath` | Bajo (probado) |
| 16 | Command injection | El backend no ejecuta comandos del sistema | — | — |
| 17 | CORS | Lista blanca `CLIENT_URL`; métodos y cabeceras limitados | `app.js` | Bajo |
| 18 | Cabeceras | Helmet (CSP `default-src 'none'` en la API, HSTS, frameguard, no `x-powered-by`); CSP del frontend en `_headers`/Nginx. **Corregido 2026-10-23:** en Nginx los `add_header` de `/assets/` y `/` anulaban los de seguridad; ahora todos incluyen `security-headers.conf` | `app.js`, `deploy/` | Bajo |
| 19 | Errores con información interna | Respuesta genérica en 500; detalles solo en logs del servidor | `errorHandler.js` | Bajo |
| 20 | Logs con datos sensibles | Sin cuerpos, contraseñas, tokens ni query strings | `app.js`, `logger.js`, `auditService.scrub` | Bajo |
| 21 | Configuración insegura | Validación al arrancar; producción rechaza `localhost` en CORS y el simulador de tarjeta | `env.js` | Bajo |
| 22 | Base de datos expuesta | Roles de mínimo privilegio; puerto no publicado en compose/VPS; `statement_timeout` | `database/roles.sql`, `deploy/` | Depende del despliegue |
| 23 | Pérdida de datos | Respaldos verificados con SHA-256 y prueba de restauración; movimientos e historial inmutables | `scripts/backup.*` | Depende de que se programen y se copien fuera del servidor |
| 24 | Dependencias vulnerables | Actualizadas (Express, multer, morgan, React Router 7, Vite 6); `npm audit` revisado | `package.json` | Ver abajo |
| 25 | Claves en el repositorio / facturas por uso de APIs | Claves solo en `.env` del servidor (ignorado por Git); escáner `scripts/check-secrets.mjs` + gancho `pre-commit` que bloquea el commit; ninguna API de pago integrada (ver [IA-Y-COSTOS.md](IA-Y-COSTOS.md)) | `.githooks/`, `scripts/` | Bajo. Activar el gancho en cada equipo: `git config core.hooksPath .githooks` |

## Dependencias (npm audit, 2026-10-20)

| Proyecto | Resultado | Valoración |
|---|---|---|
| Backend | **0 vulnerabilidades** | `nodemon` reemplazado por `node --watch` (nativo); `uuid` forzado a 11.1.1 con `overrides` (probado: reportes Excel OK) |
| Frontend | 5 altas y 2 moderadas, todas dentro de `tailwindcss` 3 (`braces`, `micromatch`, `chokidar`, `fast-glob`, `postcss-selector-parser`) | Solo herramientas de **compilación**: no se incluyen en la web publicada (`dist/`). `braces` no tiene versión corregida publicada; se resuelve migrando a Tailwind 4 (cambio mayor pendiente) |

Versiones mayores disponibles no adoptadas (React 19, Express 5, Vite 8, zod 4, etc.): las versiones en uso
siguen recibiendo correcciones y no tienen vulnerabilidades conocidas; actualizarlas es un cambio planificado,
no urgente.

## Riesgos residuales que requieren decisión del negocio

1. **Verificación manual de pagos QR**: depende de que el personal contraste con el banco. Integrar un QR
   dinámico con notificación (BCP API, OpenBCB o pasarela) eliminaría el riesgo ([pagos-bolivia.md](investigacion/pagos-bolivia.md)).
2. **Rate limiting en memoria**: con varias instancias de la API, cada una cuenta por separado. Suficiente para
   una cafetería; si se escala horizontalmente, considerar un almacén compartido.
3. **Correo transaccional**: no hay envío de correos (recuperación de contraseña por correo no implementada);
   el administrador restablece la contraseña desde *Usuarios y roles* (temporal de un solo uso visible, sesiones revocadas,
   auditado). La recuperación autónoma por correo requiere elegir un proveedor de correo.
4. **Facturación electrónica (SIN)**: el sistema emite comprobantes de pedido, **no facturas fiscales**.
