# Pruebas ejecutadas y resultados reales

Fecha: 2026-10-20. Entorno: Windows 11, Node 24.21, PostgreSQL 17.11 (clúster local de desarrollo en el
puerto 5433), navegador del entorno de desarrollo. Todos los resultados de esta página se obtuvieron
ejecutando los comandos indicados; lo que no se pudo ejecutar figura al final.

## Resumen

| Área | Comando / método | Resultado |
|---|---|---|
| Backend: unitarias + integración HTTP | `cd backend && npm test` | **32/32 OK** |
| Backend: lint | `npm run lint` | **0 problemas** |
| Frontend: traducciones | `npm run check:i18n` | **OK** — 743 claves usadas, 815 por idioma, es/en/fr idénticos |
| Frontend: TypeScript | `npm run typecheck` | **0 errores** |
| Frontend: lint | `npm run lint` | **0 problemas** |
| Frontend: build | `npm run build` | **OK** (ver tamaños) |
| Flujo de compra real en navegador | carrito → cotización → checkout → pedido | **OK** |
| Panel en navegador | login gerente, dashboard, cobro en efectivo, reportes | **OK** |
| Responsive (375 px) | 13 rutas públicas y del panel | **Sin desbordamiento horizontal** |
| Carga y concurrencia | autocannon (ver abajo) | **Consistente, sin stock negativo** |
| Respaldo y restauración | `backup.ps1` → `restore.ps1` | **Datos idénticos** |
| Roles de mínimo privilegio | `database/roles.sql` + migraciones | **Permisos correctos** |
| Dependencias | `npm audit` | Ver [SEGURIDAD.md](SEGURIDAD.md) |

## Pruebas automatizadas del backend (`backend/tests/`)

Se ejecutan contra una base cuyo nombre **debe** terminar en `_test` (el script se niega en otro caso);
el esquema se borra y se recrea con las migraciones reales en cada ejecución.

| Prueba | Qué demuestra |
|---|---|
| health check | API y BD responden; CSP presente; sin `x-powered-by` |
| registro | Contraseña validada, correo normalizado, sin hash en la respuesta, **campo `role` rechazado** (sin asignación masiva) |
| bloqueo por intentos | 5 fallos → la cuenta se bloquea aunque luego se use la contraseña correcta |
| revocación de sesiones | Cambiar contraseña invalida el token anterior |
| restablecimiento por admin | Solo el admin puede; revoca sesiones; la temporal funciona |
| autorización por rol | Cliente/anónimo sin acceso a analítica ni catálogo de gestión; el gerente no gestiona roles ni auditoría |
| catálogo | Variantes, receta e inventario; la vista pública **no expone el costo** |
| total en servidor | Cantidad negativa → 400; campos `price`/`total_cents` del cliente → 400; total correcto calculado en servidor; consumo de receta exacto |
| cotización | Coincide con el pedido real y no escribe nada |
| variantes | Obligatoria cuando existen; precio con diferencia aplicado |
| método inactivo | QR inactivo rechazado |
| **concurrencia** | 12 compras simultáneas con stock 5 → **exactamente 5 aceptadas**, stock 0, números únicos |
| idempotencia | Dos peticiones simultáneas con la misma clave → **un solo pedido** |
| seguimiento | Sin datos → 404; dígitos incorrectos → 404; dígitos correctos → vista sin teléfono; token → vista completa; **lectura por id sin permiso → 403** |
| pago QR | Activar QR exige imagen; **HTML disfrazado de PNG rechazado**; sin token → 403; comprobante **no accesible públicamente**; cliente no puede verificar; verificación confirma el pedido y queda en auditoría; doble verificación → 409; reembolso |
| efectivo | Exige importe ≥ total y calcula el cambio |
| tarjeta (simulador) | Aprobación simulada, marcada `test` |
| transiciones | Saltos inválidos → 409; cancelación **repone el inventario exacto**; cancelado no se reactiva |
| inventario | Merma sin motivo → 400; nunca negativo → 409; ajuste por conteo físico |
| configuración | Claves desconocidas y URLs `javascript:` rechazadas |
| monedas | Tasa manual con fuente; el pedido guarda moneda base y tasa aplicada; no se puede cambiar la base con datos |
| páginas | El borrador no se publica solo; publicar lo hace visible |
| analítica y reportes | KPIs reales; proyección **no disponible** sin historial suficiente; PDF válido (`%PDF`) y 7 tipos de Excel válidos (`PK`); cliente → 403 |
| privacidad | Exportación de datos propia; eliminación anonimiza pedidos y revoca la sesión |
| unitarias | Dinero sin errores de coma flotante; conversión exacta con redondeo; límites de periodos (semana ISO, trimestre, semestre, bisiesto); detección de imágenes por firma; agrupación de líneas; media móvil y anomalías |
| almacenamiento S3 | Con cliente simulado: rutas `public/`/`private/`, URL pública, lectura, borrado, rechazo de path traversal y de URLs ajenas |

## Prueba de carga (autocannon 7)

Servidor: una instancia de la API en modo `test` (sin límites por IP, porque desde una sola IP el limitador
detendría la prueba) sobre la base de desarrollo con 447 pedidos. Misma máquina para cliente, API y BD.

| Escenario | Conexiones | Duración | Resultado |
|---|---|---|---|
| `GET /api/products` (catálogo completo con popularidad y receta) | 50 | 20 s | ~973 req/s, latencia media 51 ms, p99 72 ms, 0 errores |
| `POST /api/orders/quote` | 50 | 20 s | ~991 req/s, media 50 ms, p99 65 ms, 0 errores |
| `GET /api/settings` | 50 | 10 s | ~1.624 req/s, media 30 ms, p99 39 ms |
| `POST /api/orders` sobre **un único producto** (peor caso de bloqueo) | 30 | 20 s | ~129 pedidos/s, media 231 ms, p99 379 ms |

Consistencia tras la carga de escritura: 2.597 pedidos = 2.597 unidades vendidas = 2.597 movimientos;
stock final 2.403 (= 5.000 − 2.597); **0 números de pedido duplicados**.

Agotamiento concurrente: stock 40, 300 pedidos simultáneos de 3 unidades → **13 aceptados (39 unidades),
287 rechazados, stock final 1**. Nunca negativo.

**Límites de la interpretación:** una sola máquina, sin red real ni HTTPS, base pequeña. No se promete una
cantidad de usuarios: los números indican holgura amplia para una cafetería (decenas de pedidos por hora),
pero deben repetirse en el servidor de producción elegido. Comando para repetir:
```bash
npx autocannon -c 50 -d 20 https://api.tu-dominio.com/api/products
```
(en producción los límites por IP devolverán 429: ejecutar desde varias IP o con límites ajustados temporalmente
en un entorno de pruebas, nunca en producción con clientes).

## Pruebas manuales en navegador

- Portada: escena con video, capas y etiqueta "imagen ilustrativa"; elección de cookies guardada y registrada.
- «Nuestra carta» → animación de cámara → carta con 10 productos y categorías.
- Carrito: Espresso + 2 Cappuccino Grande → cotización del servidor Bs 56,00.
- Checkout: validaciones visibles; envío zona Sur → +Bs 12,00 calculado por el servidor; pedido creado con enlace seguro y hora en zona del negocio.
- Panel (gerente): sin acceso a Usuarios/Auditoría; cobro en efectivo de Bs 100 → cambio Bs 44 → pedido confirmado con historial.
- Comparación de periodos corregida tras la prueba: el mes en curso se compara con el mismo tramo del mes anterior.
- PDF revisados visualmente (ventas en francés, productos con ABC, movimientos en inglés): se corrigieron caracteres no soportados, una página en blanco y celdas que se superponían.
- Francés en carta y visita, incluidas categorías traducidas desde la base.

## No ejecutado (y cómo hacerlo)

| Prueba | Motivo | Cómo ejecutarla |
|---|---|---|
| `docker build` / compose | El servicio de Docker no estaba iniciado | `docker compose -f deploy/docker-compose.yml up --build` |
| Almacenamiento S3/R2 real | Sin bucket ni credenciales (no se activan servicios) | Crear bucket de prueba, configurar `S3_*`, subir logo y comprobante, reiniciar y verificar |
| Accesibilidad con lector de pantalla | No disponible en el entorno | NVDA (Windows) o VoiceOver: navegar carta, checkout y panel con teclado |
| Navegadores Safari/Firefox reales y móviles físicos | No disponibles | Probar portada, checkout y panel en iPhone/Android |
| Lighthouse / Core Web Vitals | Panel del navegador oculto durante la sesión | `npx lighthouse https://www.tu-dominio.com --view` |
| Pruebas de frontend automatizadas (Playwright) | No incluidas en esta fase | Recomendado como siguiente paso |
