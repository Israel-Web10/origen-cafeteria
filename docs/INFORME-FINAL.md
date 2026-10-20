# Informe final — Modernización de ORIGEN

Fecha: 2026-10-20. Trabajo realizado sobre un clon local de `Israel-Web10/origen-cafeteria` (commit `89ac09d`).
**No se modificó el repositorio remoto**: no se hizo commit ni push. Los cambios están en la copia local
(`git status` muestra todo lo modificado).

## 1. Qué se analizó

Repositorio completo y zip (idénticos salvo finales de línea), código de frontend y backend, esquema y
semilla, dependencias, documentación y entorno (PostgreSQL 17 y MySQL 8 instalados, Node 24). Se ejecutó
la línea base: TypeScript y build OK, **lint roto**, 6 vulnerabilidades en backend (1 crítica) y 15 en
frontend. Hallazgos: el proyecto era **MySQL**, el checkout terminaba en "pedido no encontrado", se aceptaban
cantidades negativas, la subida de archivos permitía HTML disfrazado, el seguimiento exponía datos
personales con números secuenciales, el número de pedido tenía carreras, no había i18n, inventario real,
reportes, monedas ni políticas. Detalle: [AUDITORIA.md](AUDITORIA.md).

## 2. Qué se implementó (por fase)

| Fase | Resultado |
|---|---|
| 1 Auditoría | Diagnóstico con 16 hallazgos de seguridad priorizados y estado de cada funcionalidad |
| 2 Arquitectura | Decisiones justificadas: migración a PostgreSQL, dinero en centavos, roles, concurrencia, pagos, archivos, frontend, reportes, zona horaria ([ARQUITECTURA.md](ARQUITECTURA.md)) |
| 3 Diseño visual | Escena inmersiva con perspectiva CSS 3D real (capas a distinta profundidad, video diferido, parallax por puntero y scroll, "dolly" de cámara al entrar a la carta), transiciones de ruta según el destino, cabeceras con profundidad, carruseles, vista rápida, carrito lateral, skeletons, estados vacíos, notificaciones; modo ligero y `prefers-reduced-motion`; logo y decoraciones SVG originales; paletas de marca seguras |
| 4 Comercial | 18 rutas públicas, 22 páginas contando las legales (inicio, carta, categoría, producto, promociones, historia, la cafetería, visítanos con mapa y horario real, FAQ, 5 páginas legales, carrito, checkout, pedido, seguimiento, login, registro, mis pedidos, perfil); cotización en servidor; variantes; promociones; pagos QR/efectivo/tarjeta-prueba; monedas de referencia; i18n completo es/en/fr; cookies con registro |
| 5 Administración | Panel con 15 secciones: dashboard analítico, pedidos, pagos, productos/recetas, categorías, promociones, inventario, reportes PDF/Excel (14 tipos), clientes, imágenes, contenido con borrador/vista previa/publicación, monedas, configuración, usuarios y roles, auditoría |
| 6 Seguridad | 24 riesgos tratados ([SEGURIDAD.md](SEGURIDAD.md)): roles en backend, JWT revocable, bloqueo, rate limiting, zod estricto, firma binaria de archivos, comprobantes privados, helmet/CSP, idempotencia, roles de BD de mínimo privilegio |
| 7 Rendimiento | Videos de 24/95 MB → 1,1/0,5 MB; carga diferida del video y del panel (code splitting); caché en configuración; índices; consultas agregadas en SQL; reportes en streaming en el servidor |
| 8 Verificación | 32 pruebas backend, lint y TypeScript sin errores, i18n verificado, pruebas en navegador, carga y concurrencia, respaldo/restauración y roles probados ([PRUEBAS.md](PRUEBAS.md)) |
| 9 Despliegue | Investigación de precios con fuentes, guía de despliegue (VPS y gestionado), Nginx + HTTPS, systemd, Docker, cabeceras del frontend, backups y rollback ([DESPLIEGUE.md](DESPLIEGUE.md)) |

## 3–4. Archivos modificados y creados

**Backend.** Reescritos: `src/app.js`, `src/server.js`, `src/config/db.js`, `src/middleware/{auth,errorHandler,upload}.js`,
`src/routes/{auth,order,payment,settings,user}Routes.js`, `package.json`, `.env.example`.
Nuevos: `src/config/env.js`, `src/services/*` (15 servicios), `src/routes/{catalog,content,backoffice}Routes.js`,
`src/validation/schemas.js`, `src/middleware/{validate,rateLimits}.js`, `src/utils/{logger,errors,money,slug}.js`,
`src/i18n/reports.js`, `migrations/001_initial.sql`, `content/defaultPages.js`,
`scripts/{migrate,seed-reference,seed-dev,create-admin}.js`, `scripts/{backup,restore}.{sh,ps1}`,
`tests/{helpers,api.test,unit.test,storage-s3.test}.js`, `eslint.config.js`, `Dockerfile`, `.dockerignore`.
Eliminados (sustituidos, motivo: ligados a MySQL y a la API anterior): `src/controllers/*`, `src/models/*`,
`src/routes/{category,product,upload}Routes.js`, `src/utils/orderNumber.js`, `scripts/test_e2e.py`.

**Frontend.** Reescritos: `App.tsx`, `main.tsx`, `index.css`, `tailwind.config.js`, `vite.config.ts`, contextos,
servicios, `types`, todos los componentes y páginas públicas. Nuevos: `i18n/` (3 idiomas), `lib/{format,hours,transitions}.ts`,
`hooks/useQuote.ts`, `components/{Brand,Carousel,CookieBanner,ErrorBoundary,ImmersiveHero,Markdown,StatusBadge,Switchers}.tsx`,
`pages/{ContentPage,OrderPage,Promotions,Visit}.tsx`, `admin/` (panel completo, 15 páginas + gráficos SVG),
`public/media/*`, `public/_headers`, `public/_redirects`, `scripts/check-i18n.mjs`, `eslint.config.js`, `.env.example`.
Eliminados (sustituidos por `admin/` y `OrderPage`): `pages/admin/*`, `layouts/AdminLayout.tsx`, `pages/OrderTicket.tsx`,
servicios antiguos y `vite.config.{js,d.ts}` (artefactos compilados que ocultaban `vite.config.ts`).

**Raíz.** `README.md`, `.gitignore`, `.gitattributes`, `database/roles.sql`, `database/legacy-mysql/` (scripts MySQL
originales conservados), `deploy/` (compose, Nginx, systemd, variables), `docs/` (12 documentos + investigación).

## 5. Dependencias agregadas y por qué

| Paquete | Motivo |
|---|---|
| `pg` | Controlador de PostgreSQL (reemplaza `mysql2`) |
| `zod` | Validación estricta de entradas y configuración (reemplaza `express-validator`) |
| `helmet`, `express-rate-limit`, `compression` | Cabeceras de seguridad, límites de abuso, compresión |
| `pdfkit`, `exceljs` | Reportes PDF y Excel en el servidor |
| `@aws-sdk/client-s3` | Almacenamiento persistente en R2/B2/S3 (solo se carga si se activa) |
| `supertest`, `eslint` (dev) | Pruebas HTTP y lint |
| `i18next`, `react-i18next` | Traducciones mantenibles con respaldo |
| `framer-motion` | Transiciones de ruta con animación de salida y escena con resortes (CSS no permite salidas animadas entre rutas) |
| Actualizados | Express, multer, morgan (vulnerabilidades); React Router 7 (redirección abierta); Vite 6; ESLint 9 |

Descartados a propósito: Three.js/R3F (≈150 kB sin un modelo 3D real del local; la profundidad se logra con
CSS 3D), Redis/colas (sin carga que lo justifique), librerías de gráficos (SVG propio, más liviano).

## 6. Cambios en la base de datos

Migración de MySQL a PostgreSQL con `001_initial.sql`: 24 tablas, importes en centavos, `CHECK` de integridad
(stock y totales), secuencia de pedidos, traducciones `jsonb`, recetas, movimientos inmutables, monedas y
tasas, auditoría, consentimientos, páginas con borrador. Roles `origen_owner/app/backup` en `database/roles.sql`.
No existían datos de producción; los scripts MySQL quedan en `database/legacy-mysql/`.

## 7–8. Pruebas ejecutadas y resultados

Ver [PRUEBAS.md](PRUEBAS.md): 32/32 pruebas backend, lint y TypeScript sin errores, i18n consistente,
build OK, flujos reales en navegador, 13 rutas sin desbordamiento en 375 px, ~970 req/s de lectura con p99 < 75 ms,
~129 pedidos/s en el peor caso de contención sin pérdida de consistencia, agotamiento concurrente exacto,
respaldo/restauración con datos idénticos.

## 9–10. Problemas encontrados y corregidos durante la verificación

| Problema | Corrección |
|---|---|
| La navegación con animación podía no ocurrir si el navegador pausaba las animaciones | Tiempo máximo de 900 ms y transiciones que no bloquean el montaje de la nueva página |
| Comparación del mes en curso contra el mes anterior completo (falso −30 %) | Comparación "hasta la fecha" con el mismo tramo |
| PDF: flecha y separador francés mal impresos, página en blanco, celdas superpuestas, valores sin traducir | Sanitización de texto, márgenes del pie, recorte de celdas y traducción de estados/tipos |
| Botón de las tarjetas desbordaba en móvil | Precio y botón apilados en pantallas pequeñas |
| Sin recuperación de contraseña | Restablecimiento por el administrador con revocación y auditoría |
| Disco efímero en PaaS perdería imágenes | Controlador de almacenamiento S3/R2 |
| Faltaba protección ante errores de interfaz | `ErrorBoundary` global |
| Enlaces del Markdown permitían `\` | Solo rutas internas sin `//` ni `\` |

## 11. Pendiente

| Tema | Detalle |
|---|---|
| Pasarela de tarjeta / QR dinámico | Requiere contrato con banco o pasarela (BCP, Libélula, OpenBCB…); arquitectura y simulador listos |
| Correo transaccional | Confirmaciones por correo y recuperación autónoma de contraseña: requiere proveedor |
| Facturación electrónica SIN | Fuera del alcance; ver [LEGAL.md](LEGAL.md) |
| Depuración automática por retención | Requiere plazo definido con asesoría |
| Tailwind 4 | Resolver avisos de dependencias de compilación |
| Pruebas E2E de frontend (Playwright), Lighthouse, lector de pantalla, dispositivos reales | No ejecutadas en este entorno |
| Docker y S3 reales | No probados contra servicios reales (ver [PRUEBAS.md](PRUEBAS.md)) |
| Contraseña temporal obligatoria de cambiar | Hoy se indica en el manual; no se fuerza en el primer inicio |
| Fotografías reales del local | Las actuales son ilustrativas |

## 12. Riesgos de seguridad residuales

Verificación manual de QR (puede haber comprobantes falsificados), token en `localStorage` (mitigado por CSP),
límites por IP en memoria, dependencias de compilación de Tailwind 3. Detalle en [SEGURIDAD.md](SEGURIDAD.md).

## 13. Servicios externos utilizados

Ninguno en tiempo de ejecución salvo Google Fonts (tipografías) y el iframe de OpenStreetMap en *Visítanos*.
No se usan APIs de pago, de tipo de cambio ni de analítica. No se contrató ni activó nada.

## 14. Costos potenciales

Hosting desde ≈ €5–7/mes (VPS) o ≈ USD 13–16/mes (gestionado); dominio `.com.bo` Bs 280/año o `.com` ≈ USD 11/año;
R2 gratuito hasta 10 GB (puede pedir tarjeta). Pasarelas de pago: comisiones y mensualidades no publicadas por la
mayoría (cotizar). Detalle: [DESPLIEGUE.md](DESPLIEGUE.md) y `docs/investigacion/`.

## 15. Próxima fase sugerida

1. Elegir hosting y dominio; desplegar en un entorno de pruebas (`staging`) y repetir las pruebas de [PRUEBAS.md](PRUEBAS.md).
2. Pedir cotizaciones de QR dinámico/pasarela e integrar la elegida con webhook verificado.
3. Revisión legal y contable de políticas y facturación.
4. Pruebas E2E automatizadas (Playwright) y auditoría de accesibilidad.

---

## Lista de comprobación para producción

**Bloqueantes (no abrir al público sin esto)**
- [ ] Políticas legales revisadas por un abogado y publicadas desde *Contenido*
- [ ] Confirmación del contador sobre facturación (y cómo se emitirá)
- [ ] Hosting con HTTPS y dominio propio configurados ([DESPLIEGUE.md](DESPLIEGUE.md))
- [ ] `NODE_ENV=production`, `JWT_SECRET` nuevo, `CLIENT_URL` real, `CARD_PROVIDER=none`
- [ ] Base con `database/roles.sql`; API conectada con `origen_app`; puerto 5432 cerrado a Internet
- [ ] Almacenamiento persistente (disco de VPS o `STORAGE_DRIVER=s3` probado con subida + reinicio)
- [ ] Respaldo diario programado, copia fuera del servidor y **una restauración de prueba realizada**
- [ ] Administrador creado con `npm run create-admin`; ninguna cuenta `@origen.dev` en producción; nunca `seed:dev`
- [ ] QR oficial del banco subido y probado con un pago real pequeño
- [ ] Pedido de prueba completo en producción (crear → pagar → verificar → entregar) y una cancelación

**Recomendados antes del lanzamiento**
- [ ] Datos del negocio, horarios, coordenadas, redes y logo propios
- [ ] Fotografías reales del local (o mantener la etiqueta de ilustrativas); licencia de los videos confirmada
- [ ] Carta completa con costos (para márgenes), recetas e inventario inicial
- [ ] Monitor de disponibilidad sobre `/api/health` y alertas de facturación del proveedor
- [ ] Cuentas individuales para cada miembro del personal
- [ ] Revisar `curl -I` del sitio: HSTS y CSP presentes

**Qué necesita el negocio para empezar a usarlo**
1. Una persona responsable del panel (ver [MANUAL-GERENTE.md](MANUAL-GERENTE.md)).
2. Una cuenta bancaria con QR y la rutina de verificar pagos en el banco.
3. Presupuesto de hosting y dominio (≈ USD 6–17/mes).
4. Asesoría legal/contable para políticas y facturación.
