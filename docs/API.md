# API — ORIGEN

Base URL en desarrollo: `http://localhost:4000/api`

Autenticación: **JWT Bearer**. Cuando un endpoint requiere sesión, se envía:

```
Authorization: Bearer <token>
```

El token se obtiene en `/auth/login` o `/auth/register`. La mayoría de rutas
de lectura pública devuelven algo distinto si el request está autenticado
como admin (por ejemplo, ven productos/categorías inactivos), gracias al
middleware `optionalAuth`.

Todas las respuestas son JSON. Los errores siguen el formato:
```json
{ "error": "Mensaje descriptivo en español" }
```

---

## Auth

### `POST /auth/register`
Crea una cuenta de cliente.
- Auth: no
- Body: `{ "name": string, "email": string, "password": string (min 8), "phone"?: string }`
- Respuesta `201`: `{ "user": {...}, "token": string }`
- Errores: `400` datos inválidos, `409` correo ya registrado

### `POST /auth/login`
- Auth: no
- Body: `{ "email": string, "password": string }`
- Respuesta `200`: `{ "user": {...}, "token": string }`
- Errores: `401` credenciales incorrectas

### `GET /auth/me`
- Auth: sí (cualquier rol)
- Respuesta `200`: `{ "user": {...} }`
- Errores: `401` sin token / token inválido

---

## Categorías

### `GET /categories`
- Auth: opcional. Sin auth o cliente → solo categorías `active=true`. Admin → todas.
- Respuesta `200`: `{ "categories": [...] }`

### `GET /categories/:id`
- Respuesta `200`: `{ "category": {...} }` · `404` si no existe

### `POST /categories` — admin
- Body: `{ "name": string, "description"?: string, "display_order"?: number, "active"?: boolean }`
- Respuesta `201`: `{ "category": {...} }`

### `PUT /categories/:id` — admin
- Body: cualquier subconjunto de los campos de arriba
- Respuesta `200`: `{ "category": {...} }`

### `DELETE /categories/:id` — admin
- Respuesta `200`: `{ "success": true }`
- Error `409` si tiene productos asociados (usa `active=false` en su lugar)

---

## Productos

### `GET /products?category_id=&search=`
- Auth: opcional. Público → solo `active=true AND available=true` de categorías activas. Admin → todos.
- Respuesta `200`: `{ "products": [...] }` (incluye `category_name`)

### `GET /products/:id`
- Respuesta `200`: `{ "product": {...} }` · `404` si no existe

### `POST /products` — admin
- Body: `{ "category_id": number, "name": string, "description"?: string, "price": number, "image_url"?: string, "stock"?: number|null, "available"?: boolean, "active"?: boolean }`
- Respuesta `201`: `{ "product": {...} }`

### `PUT /products/:id` — admin
- Body: cualquier subconjunto de los campos de arriba
- Respuesta `200`: `{ "product": {...} }`

### `DELETE /products/:id` — admin
- Respuesta `200`: `{ "success": true }`
- Nota: es seguro incluso si el producto ya fue vendido (el historial de `order_items` conserva nombre/precio); para solo ocultarlo del menú, preferí `PUT` con `active: false`.

---

## Pedidos

### `POST /orders`
Crea un pedido. Funciona **con o sin sesión** (invitado o cliente logueado — `optionalAuth`).
- Body:
```json
{
  "customerName": "string",
  "customerPhone": "string",
  "customerEmail": "string (opcional)",
  "deliveryType": "pickup | delivery",
  "deliveryAddress": {
    "recipient_name": "string", "phone": "string", "address": "string",
    "reference": "string (opcional)", "zone_id": "number (opcional)"
  },
  "paymentMethodId": "number",
  "items": [{ "product_id": "number", "quantity": "number" }],
  "observations": "string (opcional)"
}
```
`deliveryAddress` es obligatorio solo si `deliveryType = "delivery"`.
- Respuesta `201`: `{ "order": {...} }` (con `items`, `payments`, `ticket_number`, totales recalculados en servidor)
- Errores: `400` datos incompletos / stock insuficiente / producto no disponible

### `GET /orders/track/:orderNumber`
Seguimiento **público** (sin login) por número de pedido, ej: `ORD-2026-0001`.
- Respuesta `200`: `{ "order": {...} }` · `404` si no existe

### `GET /orders/stats` — admin
Estadísticas para el dashboard.
- Respuesta `200`:
```json
{
  "stats": {
    "today": { "revenue": 0, "count": 0 },
    "week": { "revenue": 0, "count": 0 },
    "month": { "revenue": 0, "count": 0 },
    "pending": { "count": 0 },
    "completed": { "count": 0 },
    "byPaymentMethod": [{ "name": "string", "count": 0 }],
    "salesLast7Days": [{ "date": "YYYY-MM-DD", "revenue": 0 }],
    "topProducts": [{ "id": 0, "name": "string", "image_url": null, "total_sold": 0 }]
  }
}
```

### `GET /orders?status=` 
- Auth: sí. Cliente → solo sus propios pedidos. Admin → todos (con filtro `status` opcional).
- Respuesta `200`: `{ "orders": [...] }`

### `GET /orders/:id`
- Auth: sí. Solo el dueño del pedido o un admin.
- Respuesta `200`: `{ "order": {...} }` (incluye `items` y `payments`)
- Error `403` si no es dueño ni admin

### `PUT /orders/:id/status` — admin
- Body: `{ "status": "pendiente|confirmado|en_preparacion|listo|en_camino|entregado|cancelado" }`
- Respuesta `200`: `{ "order": {...} }`
- Error `400` si el estado no es válido

---

## Pagos

### `GET /payments/methods`
- Auth: opcional. Público → solo métodos `active=true`. Admin → todos.
- Respuesta `200`: `{ "paymentMethods": [{ "id", "type", "name", "active", "config": {...} }] }`

### `POST /payments/methods` — admin
- Body: `{ "type": "qr|card|cash", "name": string, "active"?: boolean, "config"?: object }`

### `PUT /payments/methods/:id` — admin
- Body: subconjunto de `{ "name", "active", "config" }` — `config` se reemplaza completo (mandar el objeto entero, no un patch parcial)

### `GET /payments?status=` — admin
- Respuesta `200`: `{ "payments": [...] }` (incluye datos del pedido y del cliente)

### `POST /payments/:orderId/proof`
Sube el comprobante de pago (multipart/form-data, campo `proof`).
- Auth: opcional — permitido para: el dueño logueado del pedido, un admin, **o cualquiera si el pedido es de invitado** (mismo modelo de confianza que el seguimiento público por número de pedido).
- Respuesta `200`: `{ "payment": {...} }`
- Errores: `400` sin archivo / tipo no permitido, `403` si el pedido pertenece a otro usuario logueado, `404` pedido no encontrado

### `PUT /payments/:id/status` — admin
- Body: `{ "status": "pendiente|verificado|rechazado" }`
- Respuesta `200`: `{ "payment": {...} }`
- Efecto secundario: si `status = "verificado"` y el pedido estaba `pendiente`, el pedido pasa automáticamente a `confirmado`.

---

## Configuración

### `GET /settings`
- Auth: opcional (público)
- Respuesta `200`: `{ "settings": { "cafe_name": "...", "address": "...", ... }, "deliveryZones": [...] }`

### `PUT /settings` — admin
- Body: cualquier subconjunto de claves de configuración, ej: `{ "cafe_name": "ORIGEN", "address": "...", "latitude": "-16.5", "longitude": "-68.15", "phone": "...", "whatsapp": "...", "gmaps_link": "...", "delivery_min_order": "25.00", "pickup_enabled": "true", "delivery_enabled": "true" }`
- Respuesta `200`: `{ "settings": {...} }`

### `GET /settings/delivery-zones`
- Auth: opcional. Público → solo activas. Admin → todas.

### `POST /settings/delivery-zones` — admin
- Body: `{ "name": string, "cost": number, "estimated_time_minutes"?: number, "active"?: boolean }`

### `PUT /settings/delivery-zones/:id` — admin
- Body: subconjunto de los campos de arriba

---

## Imágenes

### `GET /uploads?entity_type=`
Lista imágenes (banners, galería, logo, qr). Filtro opcional por `entity_type`.
- Respuesta `200`: `{ "images": [...] }`

### `POST /uploads` — admin
Sube una imagen (multipart/form-data, campo `image`).
- Body adicional (form fields): `entity_type` (`product|banner|gallery|logo|qr`), `entity_id?`, `alt_text?`, `is_primary?`
- Límites: 5MB, solo JPG/PNG/WEBP/GIF (configurable vía `.env`)
- Respuesta `201`: `{ "image": { "id", "url", "entity_type", ... } }`

### `DELETE /uploads/:id` — admin
- Respuesta `200`: `{ "success": true }` (también borra el archivo físico si existe)

---

## Usuarios

### `GET /users?role=` — admin
- Respuesta `200`: `{ "users": [...] }` (nunca incluye `password_hash`)

### `GET /users/:id`
- Auth: sí. El propio usuario o un admin.
- Respuesta `200`: `{ "user": {...}, "orders": [...] }` (historial de pedidos)

### `PUT /users/:id`
- Auth: sí. El propio usuario solo puede cambiar `name`/`phone`. Solo un admin puede cambiar `active` (activar/suspender cuentas) u otros campos.
- Respuesta `200`: `{ "user": {...} }`

---

## Servicios externos (no implementados, arquitectura preparada)

Estos puntos requieren credenciales o contratos que no están disponibles en
este entorno de desarrollo. El código está preparado para conectarlos sin
rediseñar la API — ver comentarios en el código fuente indicado.

| Servicio | Dónde conectar | Qué falta |
|---|---|---|
| **Pasarela de pago con tarjeta** | `payment_methods` tipo `card`, columna `payments.gateway_reference` ya reservada | Cuenta con un proveedor (ej. Stripe, una pasarela local boliviana) + credenciales en `.env` + lógica de confirmación/webhook |
| **Almacenamiento de imágenes en la nube** | `backend/src/middleware/upload.js`, `backend/src/controllers/uploadController.js` | Cuenta en Cloudinary/S3 + credenciales en `.env`; solo cambiaría de dónde viene la `url` que se guarda en `images.url` / `products.image_url` |
| **Facturación fiscal electrónica (Bolivia)** | No existe todavía en el schema/código | Contratar un proveedor autorizado de facturación electrónica ante el Servicio de Impuestos Nacionales; no se inventó ninguna integración falsa |
| **Mapa interactivo** | `frontend/.env.example` tiene `VITE_GOOGLE_MAPS_API_KEY` reservada | Actualmente se muestra la dirección/lat-long como texto y un enlace "Cómo llegar" a Google Maps; con una API key se podría embeber un mapa real |
