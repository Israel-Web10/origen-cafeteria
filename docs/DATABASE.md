# Base de datos — ORIGEN

Motor: **MySQL 8.0+**. Los scripts están en `database/schema.sql` (estructura) y
`database/seed.sql` (datos de desarrollo).

## Tablas

### `users`
Clientes y administradores en una sola tabla, diferenciados por `role`.

| Campo | Tipo | Notas |
|---|---|---|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(150) | |
| email | VARCHAR(150) UNIQUE | índice para login |
| password_hash | VARCHAR(255) | hash bcrypt, nunca el password en texto plano |
| phone | VARCHAR(30) | opcional |
| role | ENUM('client','admin') | default 'client' |
| active | BOOLEAN | permite suspender cuentas sin borrarlas |

### `categories`
Categorías del menú (Cafés, Repostería, etc.), con `display_order` para controlar el orden en el menú y `active` para ocultarlas sin eliminarlas.

### `products`
El menú completo. Todo se sirve desde aquí — no hay productos hardcodeados en el frontend.

| Campo | Notas |
|---|---|
| category_id | FK → categories(id), ON DELETE RESTRICT (no se puede borrar una categoría con productos) |
| price | DECIMAL(10,2) |
| stock | INT nullable — `NULL` significa stock ilimitado/no aplica |
| available | si es visible/comprable ahora mismo |
| active | soft-delete: false = oculto del menú público, pero conserva el historial de pedidos |

### `images`
Tabla genérica para banners, logo, galería de la cafetería y el QR de pago. `entity_type` indica el uso (`product`, `banner`, `gallery`, `logo`, `qr`); `entity_id` enlaza opcionalmente a un producto específico. Las imágenes de producto normalmente se guardan directamente en `products.image_url` por simplicidad; esta tabla existe para todo lo demás que necesita múltiples imágenes o gestión independiente (banners, galería).

### `delivery_zones`
Zonas de entrega configurables por el admin, cada una con su propio costo y tiempo estimado.

### `delivery_addresses`
Direcciones de entrega asociadas a un pedido (y opcionalmente a un `user_id`, si el cliente tiene cuenta).

### `payment_methods`
Los 3 métodos contemplados: `qr`, `cash`, `card`. La columna `config` es JSON con los datos propios de cada método (banco, cuenta, imagen del QR, instrucciones). El admin activa/desactiva cada método y edita su configuración desde el panel — nada de esto vive en el código.

### `orders`
El pedido en sí. `user_id` es `NULL` para pedidos de invitado. Todos los montos (`subtotal`, `discount`, `delivery_fee`, `total`) se **recalculan en el servidor** a partir de `products.price` en el momento de crear el pedido — nunca se confía en el precio que mande el cliente. `status` seala el ciclo de vida del pedido (ver más abajo).

### `order_items`
Líneas del pedido. Guarda una **copia histórica** de `product_name` y `unit_price`, así que si el producto cambia de precio o se elimina después, el pedido antiguo sigue mostrando lo que el cliente realmente compró.

### `payments`
Un pedido puede tener más de un intento de pago (ej: comprobante rechazado y vuelto a subir), aunque el flujo actual crea uno solo al momento del pedido. Campos clave: `status` (`pendiente` / `verificado` / `rechazado`), `proof_image_url` (comprobante subido por el cliente para QR), `gateway_reference` (reservado para una futura pasarela de tarjeta real), `verified_by` / `verified_at` (auditoría de quién verificó el pago).

### `tickets`
Comprobante/ticket generado automáticamente al crear el pedido (`ticket_number`, ej. `TCK-2026-0001`). Relación 1:1 con `orders`.

### `settings`
Tabla clave-valor genérica para toda la configuración de la cafetería: nombre, logo, dirección, latitud/longitud, teléfono, WhatsApp, redes sociales, horarios, pedido mínimo, etc. Se lee/escribe completa desde `GET/PUT /api/settings`.

## Relaciones (resumen)

```
users ──< orders >── payment_methods
  │           │
  │           ├──< order_items >── products >── categories
  │           ├──< payments
  │           ├──1:1 tickets
  │           └── delivery_addresses >── delivery_zones
  └──< delivery_addresses (opcional, si el cliente tiene cuenta)
```

## Claves e índices

- Toda tabla usa `id INT AUTO_INCREMENT PRIMARY KEY`.
- Claves foráneas con `ON DELETE` explícito en cada caso (`RESTRICT` para no perder integridad del menú, `SET NULL` para conservar historial cuando el vínculo es opcional, `CASCADE` solo para datos que no tienen sentido sin su padre, como `order_items` y `payments`).
- Índices añadidos sobre columnas de búsqueda/filtrado frecuente: `users.email`, `users.role`, `products.category_id/active/available`, `orders.status/user_id/created_at`, `payments.status/order_id`, `images.entity_type+entity_id`.

## Flujo de un pedido

1. El cliente arma el carrito en el frontend (solo con datos que vienen de `GET /products`).
2. Al hacer checkout, el frontend manda `{ items: [{product_id, quantity}], ... }` — **nunca precios**.
3. El backend, dentro de una transacción (`orderModel.createOrder`):
   - Relee cada producto de la BD (`FOR UPDATE`) y recalcula precios y subtotal.
   - Valida stock y disponibilidad.
   - Calcula el costo de envío según la zona elegida.
   - Inserta `orders`, `order_items`, descuenta `products.stock`.
   - Crea el `payments` inicial en estado `pendiente`.
   - Genera el `tickets` correspondiente.
4. Si todo sale bien, se hace `COMMIT`; si algo fallа (stock insuficiente, producto inactivo, etc.), se hace `ROLLBACK` y no se crea nada a medias.

## Flujo de un pago

1. Al crear el pedido se crea automáticamente un registro en `payments` con estado `pendiente`.
2. **QR**: el cliente sube una imagen de comprobante (`POST /payments/:orderId/proof`), que se guarda en `payments.proof_image_url`.
3. **Efectivo**: no requiere comprobante; el admin lo marca como verificado al recibir el pago físico.
4. **Tarjeta**: reservado para una integración futura con una pasarela real (ver `docs/API.md`).
5. El administrador revisa el comprobante y llama `PUT /payments/:id/status` con `verificado` o `rechazado`.
6. Si el pago queda `verificado`, el pedido pasa **automáticamente** de `pendiente` a `confirmado` (ver `paymentModel.updateStatus`).
7. A partir de ahí, el admin avanza manualmente el `orders.status` por el resto del flujo: `confirmado → en_preparacion → listo → en_camino → entregado` (o `cancelado` en cualquier punto).
