# API de ORIGEN

Base: **`/api/v1`** (en desarrollo `http://localhost:4000/api/v1`). `/api` es un alias de la versión vigente
para clientes antiguos. Todas las respuestas llevan la cabecera `API-Version: v1`; `GET /api/v1/version`
devuelve `{api, version}`. Un cambio incompatible se publicará como `/api/v2` sin retirar `v1` de golpe
(ver [CHANGELOG.md](../CHANGELOG.md)). JSON en todas las respuestas. Las rutas de abajo son relativas a la base.

- **Autenticación:** `Authorization: Bearer <token>` (se obtiene en `/auth/login` o `/auth/register`).
- **Roles:** `client`, `manager` (gerente), `admin`. "Personal" = gerente o admin.
- **Errores:** `{ "error": "mensaje en español", "code": "codigo_estable", "details"?: { "fields": [...] } }`.
  El frontend traduce por `code`.
- **Importes:** enteros en centavos de la moneda base (`*_cents`).
- **Caché:** las lecturas públicas anónimas pueden venir de la micro-caché (cabecera `X-Cache: HIT|MISS|STALE|COALESCED`, máx. 10 s; se invalida al editar).
- **Límites:** 300 req/min por IP en general (configurable); más estrictos en autenticación, pedidos, seguimiento, subidas y reportes (429).

## Autenticación y cuenta

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/register` | público | `{name, email, password, phone?, preferred_locale?}` → `{user, token}` |
| POST | `/auth/login` | público | `{email, password}`; 5 fallos bloquean 15 min |
| GET | `/auth/me` | sesión | Usuario actual |
| PUT | `/auth/me` | sesión | `{name?, phone?, preferred_locale?}` |
| PUT | `/auth/me/password` | sesión | `{current_password, new_password}` → nuevo token; revoca los demás |
| POST | `/auth/logout-all` | sesión | Revoca todas las sesiones |
| GET | `/auth/me/export` | sesión | Descarga de datos personales (JSON) |
| DELETE | `/auth/me` | sesión | `{password}`; anonimiza la cuenta |

## Catálogo

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/categories` | público (`?include_inactive=true` personal) | Categorías con número de productos |
| GET | `/categories/:idOrSlug` | público | |
| POST/PUT/DELETE | `/categories[/:id]` | personal | `translations: {en:{name,description}, fr:{...}}` |
| GET | `/products` | público | `?category=slug&search=&sort=recommended|popular|price_asc|price_desc|newest|name&featured=&new=&promo=&limit=&offset=` |
| GET | `/products/:idOrSlug` | público (personal ve costo y receta) | Incluye variantes, imágenes y promoción vigente |
| POST | `/products` | personal | Campos en `schemas.productCreate`; `variants: [{name, price_delta_cents}]` |
| PUT | `/products/:id` | personal | Parcial; `track_stock: true|false`; el stock cambia solo con movimientos |
| DELETE | `/products/:id` | personal | Se **desactiva** si tiene ventas |
| PUT | `/products/:id/components` | personal | Receta: `[{inventory_item_id, variant_id?, quantity}]` |
| GET | `/promotions` | público (vigentes) / `?all=true` personal | |
| POST/PUT | `/promotions[/:id]` | personal | `{name, kind: percent|fixed, value, product_id|category_id, starts_at, ends_at}` |

## Pedidos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/orders/quote` | público | `{deliveryType, deliveryAddress?:{zone_id}, items}` → subtotal, descuentos, envío y total del servidor |
| POST | `/orders` | público/sesión | Cabecera opcional `Idempotency-Key`. Cuerpo: `customerName, customerPhone, customerEmail?, deliveryType, deliveryAddress?, paymentMethodId, items:[{product_id, variant_id?, quantity}], observations?, displayCurrency?, locale?, acceptTerms: true`. Devuelve el pedido con `public_token` (guárdalo: es la llave de seguimiento) |
| GET | `/orders/track/:orderNumber` | público | `?token=` (vista completa) o `?phone4=1234` (vista reducida sin contacto) |
| GET | `/orders` | sesión | Cliente: los suyos; personal: todos. `?status&payment_status&from&to&search&limit&offset` |
| GET | `/orders/:id` | dueño, personal o `?token=` | Detalle con pagos e historial |
| PUT | `/orders/:id/status` | personal | `{status, note?}`; solo transiciones válidas |
| POST | `/orders/:id/cancel` | dueño o `{token}` | Solo en `pendiente`; repone inventario |

Estados del pedido: `pendiente → confirmado → en_preparacion → listo → (en_camino) → entregado`, o `cancelado`.
Estados del pago (separados): `pendiente`, `en_verificacion`, `pagado`, `rechazado`, `reembolsado`.

## Pagos

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/payments/methods` | público (`?all=true` personal) | Indica `unavailable_reason` y `test_mode` |
| PUT | `/payments/methods/:id` | personal | Activar QR exige `config.qr_image` del propio almacenamiento |
| POST | `/payments/methods` | admin | Nuevo método |
| POST | `/payments/orders/:orderId/proof` | dueño o `token` | `multipart`: `proof` (imagen) y/o `reference` → `en_verificacion` |
| GET | `/payments` | personal | Cola de pagos (`en_verificacion` primero) |
| GET | `/payments/:id/proof` | personal | Comprobante privado |
| PUT | `/payments/:id/review` | personal | `{decision: verificado|rechazado, reason?, cash_received_cents?}` |
| POST | `/payments/:id/refund` | personal | `{reason}`; registra un reembolso hecho fuera del sistema |
| POST | `/payments/orders/:orderId/card-test` | dueño o `token` | **Solo con `CARD_PROVIDER=test`** (prohibido en producción) |

## Configuración, monedas, contenido

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/settings` | público | Configuración, zonas, monedas y tasas vigentes (si la conversión está activa) |
| PUT | `/settings` | personal | Solo claves conocidas y validadas (`settingsService.DEFINITIONS`) |
| POST/PUT | `/settings/delivery-zones[/:id]` | personal | `{name, cost_cents, estimated_time_minutes, active}` |
| GET | `/currencies` | personal | Monedas y tasas vigentes |
| PUT | `/currencies/:code` | personal | `{enabled, name, symbol}` |
| PUT | `/currencies/:code/base` | admin | Solo sin productos ni pedidos |
| GET/POST | `/currencies/rates` | personal | Historial / nueva tasa `{quote_code, rate, rate_type, source, notes?}` |
| GET | `/uploads?entity_type=` | público | Imágenes |
| POST | `/uploads` | personal | `multipart image` + `entity_type, entity_id?, alt_text?, is_primary?, is_illustrative?, source?, license?` |
| PUT/DELETE | `/uploads/:id` | personal | |
| GET | `/pages/:slug/:locale` | público | Versión publicada (con respaldo en español) |
| GET | `/pages` · `/pages/:slug/:locale/edit` | personal | |
| PUT | `/pages/:slug/:locale/draft` | personal | Guarda borrador |
| POST | `/pages/:slug/:locale/publish` | personal | Publica el borrador |
| POST | `/consent` | público | Registro anónimo de la elección de cookies |

## Inventario, analítica y reportes (personal)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT | `/inventory/items[/:id]` | Insumos |
| GET/POST | `/inventory/movements` | `{target: item|product, id, type: entrada|ajuste|merma|devolucion, quantity | counted_quantity, unit_cost_cents?, reason?, supplier_id?, expires_at?}` |
| GET | `/inventory/alerts?days=14` | Bajo mínimo y próximos a vencer |
| GET/POST/PUT | `/inventory/suppliers[/:id]` | Proveedores |
| GET | `/analytics/summary` | `?period=daily|weekly|monthly|quarterly|semiannual|annual|custom&date=&from=&to=&categoryId=&productId=&paymentMethodId=` |
| GET | `/reports/:type/:format` | `type`: sales, orders, products, categories, top_products, bottom_products, payment_methods, inventory, movements, cancellations, refunds, margins, comparison, audit · `format`: pdf, xlsx · mismos filtros + `locale` |

## Usuarios y auditoría

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/users` | personal (el gerente solo ve clientes) |
| GET | `/users/:id` | personal |
| PUT | `/users/:id` | admin — `{role?, active?}`; revoca sesiones del afectado |
| POST | `/users/:id/reset-password` | admin — devuelve una contraseña temporal |
| POST | `/users/staff` | admin — `{name, email, role}` |
| GET | `/audit` | admin |

## Salud

`GET /api/v1/health` → `{status, db, uptime_s}` (503 si la base no responde). `GET /api/v1/version` → `{api: "v1", version}`.
