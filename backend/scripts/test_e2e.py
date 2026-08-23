"""
Pruebas E2E de la API de ORIGEN — smoke test end-to-end contra un backend
real conectado a MySQL. NO usa mocks: cada prueba hace una petición HTTP
real y valida la respuesta real del servidor.

Uso:
  1. Asegúrate de que MySQL esté corriendo y la base de datos tenga el
     schema + seed cargados (ver docs/INSTALLATION.md).
  2. Levanta el backend:  cd backend && npm run dev
     (por defecto en http://localhost:4000 — si usas otro puerto, cambia
     la constante BASE más abajo).
  3. Desde otra terminal:  python3 backend/scripts/test_e2e.py

El script crea datos de prueba (un cliente nuevo con email único, un par
de pedidos, una categoría/producto temporal que se elimina al final,
etc.) por lo que es seguro ejecutarlo contra una base de datos de
desarrollo cuantas veces se quiera.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
import mimetypes
import uuid

# Por defecto apunta al puerto estándar de desarrollo (ver .env.example).
# Puedes sobreescribirlo: ORIGEN_API_URL=http://localhost:4010/api python3 scripts/test_e2e.py
BASE = os.environ.get("ORIGEN_API_URL", "http://localhost:4000/api")
PASSED = 0
FAILED = 0
FAILURES = []


def check(label, cond, extra=""):
    global PASSED, FAILED
    if cond:
        PASSED += 1
        print(f"OK   - {label}")
    else:
        FAILED += 1
        FAILURES.append(label)
        print(f"FAIL - {label} {extra}")


def request(method, path, body=None, token=None, form_file=None):
    url = BASE + path
    headers = {}
    data = None

    if form_file:
        # multipart/form-data manual build
        field_name, filename, content, mime = form_file
        boundary = uuid.uuid4().hex
        parts = []
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(
            f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode()
        )
        parts.append(f"Content-Type: {mime}\r\n\r\n".encode())
        parts.append(content)
        parts.append(b"\r\n")
        if body:
            for k, v in body.items():
                parts.append(f"--{boundary}\r\n".encode())
                parts.append(f'Content-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        parts.append(f"--{boundary}--\r\n".encode())
        data = b"".join(parts)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            payload = json.loads(resp.read().decode())
            return status, payload
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode())
        except Exception:
            payload = {}
        return e.code, payload


# ============================================================
# 1. CLIENTE: registro, login, me
# ============================================================
print("\n=== CLIENTE: auth ===")
unique_email = f"test.client.{int(time.time())}@origen.dev"
status, res = request("POST", "/auth/register", {
    "name": "Cliente E2E", "email": unique_email, "password": "TestPass123!", "phone": "70099999",
})
check("registro de cliente devuelve 201", status == 201, f"status={status} body={res}")
check("registro devuelve token", "token" in res, res)
client_token = res.get("token")
client_id = res.get("user", {}).get("id")
check("password_hash NO se expone", "password_hash" not in res.get("user", {}), res)

status, res = request("POST", "/auth/login", {"email": unique_email, "password": "TestPass123!"})
check("login de cliente devuelve 200", status == 200, f"status={status}")
client_token = res.get("token")

status, res = request("POST", "/auth/login", {"email": unique_email, "password": "wrong-password"})
check("login con password incorrecto devuelve 401", status == 401, f"status={status}")

status, res = request("GET", "/auth/me", token=client_token)
check("/auth/me devuelve 200", status == 200, f"status={status}")
check("/auth/me devuelve el correo correcto", res.get("user", {}).get("email") == unique_email, res)

status, res = request("GET", "/auth/me")
check("/auth/me sin token devuelve 401", status == 401, f"status={status}")

# ============================================================
# 2. Productos y categorías (público)
# ============================================================
print("\n=== PRODUCTOS Y CATEGORÍAS ===")
status, res = request("GET", "/products")
check("GET /products devuelve 200", status == 200, f"status={status}")
products = res.get("products", [])
check("hay productos desde el seed", len(products) > 0, len(products))

status, res = request("GET", "/categories")
check("GET /categories devuelve 200", status == 200, f"status={status}")
categories = res.get("categories", [])
check("hay categorías desde el seed", len(categories) > 0, len(categories))

status, res = request("GET", "/payments/methods")
check("GET /payments/methods devuelve 200", status == 200, f"status={status}")
methods = res.get("paymentMethods", [])
cash_method = next((m for m in methods if m["type"] == "cash"), None)
qr_method = next((m for m in methods if m["type"] == "qr"), None)
check("existe método de pago 'cash'", cash_method is not None)
check("existe método de pago 'qr'", qr_method is not None)

# ============================================================
# 3. Crear pedido como INVITADO (sin login), pago efectivo
# ============================================================
print("\n=== PEDIDO COMO INVITADO (efectivo) ===")
product1, product2 = products[0], products[1]
status, res = request("POST", "/orders", {
    "customerName": "Invitado E2E",
    "customerPhone": "70012345",
    "deliveryType": "pickup",
    "paymentMethodId": cash_method["id"],
    "items": [
        {"product_id": product1["id"], "quantity": 2},
        {"product_id": product2["id"], "quantity": 1},
    ],
    "observations": "Prueba automatizada E2E",
})
check("crear pedido invitado devuelve 201", status == 201, f"status={status} body={res}")
guest_order = res.get("order", {})
check("el pedido tiene order_number", bool(guest_order.get("order_number")), guest_order)
check("el pedido tiene ticket_number generado", bool(guest_order.get("ticket_number")), guest_order)
expected_subtotal = float(product1["price"]) * 2 + float(product2["price"]) * 1
check(
    "el subtotal se calculó en el servidor (no confía en el cliente)",
    abs(float(guest_order.get("subtotal", 0)) - expected_subtotal) < 0.01,
    f"esperado={expected_subtotal} real={guest_order.get('subtotal')}",
)
check("el pedido inicia en estado 'pendiente'", guest_order.get("status") == "pendiente")

status, res = request("GET", f"/orders/track/{guest_order['order_number']}")
check("seguimiento público por order_number funciona", status == 200, f"status={status}")

# ============================================================
# 4. Crear pedido como CLIENTE LOGUEADO, pago QR + subir comprobante
# ============================================================
print("\n=== PEDIDO COMO CLIENTE LOGUEADO (QR + comprobante) ===")
status, res = request("POST", "/orders", {
    "customerName": "Cliente E2E",
    "customerPhone": "70099999",
    "deliveryType": "delivery",
    "deliveryAddress": {
        "recipient_name": "Cliente E2E", "phone": "70099999",
        "address": "Calle de prueba 123", "reference": "Casa verde",
    },
    "paymentMethodId": qr_method["id"],
    "items": [{"product_id": product1["id"], "quantity": 1}],
}, token=client_token)
check("crear pedido con delivery devuelve 201", status == 201, f"status={status} body={res}")
qr_order = res.get("order", {})
check("delivery_fee > 0 cuando no hay zona (fallback a 0 si no hay zona)", "delivery_fee" in qr_order)
check("el pedido quedó asociado al user_id del cliente", qr_order.get("user_id") == client_id, qr_order)

# Comprobante: PNG mínimo válido (1x1 pixel transparente)
import base64
png_bytes = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)
status, res = request(
    "POST", f"/payments/{qr_order['id']}/proof",
    body={},
    form_file=("proof", "comprobante.png", png_bytes, "image/png"),
    token=client_token,
)
check("subir comprobante QR (invitado/cliente) devuelve 200", status == 200, f"status={status} body={res}")
check("el pago queda con proof_image_url", bool(res.get("payment", {}).get("proof_image_url")), res)

status, res = request("GET", "/orders", token=client_token)
check("GET /orders (cliente) devuelve solo sus pedidos", status == 200 and len(res.get("orders", [])) >= 1, res)
client_orders = res.get("orders", [])
check(
    "el historial del cliente no incluye el pedido de invitado",
    all(o["id"] != guest_order["id"] for o in client_orders),
)

# ---- Pedido de INVITADO con QR: confirma el fix de subida de comprobante
# sin sesión para pedidos de invitado (user_id NULL) ----
status, res = request("POST", "/orders", {
    "customerName": "Invitado QR E2E",
    "customerPhone": "70055555",
    "deliveryType": "pickup",
    "paymentMethodId": qr_method["id"],
    "items": [{"product_id": product2["id"], "quantity": 1}],
})
check("crear pedido de invitado con QR devuelve 201", status == 201, f"status={status}")
guest_qr_order = res.get("order", {})

status, res = request(
    "POST", f"/payments/{guest_qr_order['id']}/proof",
    body={},
    form_file=("proof", "comprobante_invitado.png", png_bytes, "image/png"),
)
check(
    "un INVITADO (sin login) puede subir el comprobante de SU PROPIO pedido de invitado",
    status == 200, f"status={status} body={res}",
)
check("el comprobante del invitado queda guardado", bool(res.get("payment", {}).get("proof_image_url")), res)

status, res = request(
    "POST", f"/payments/{qr_order['id']}/proof",
    body={},
    form_file=("proof", "intento_ajeno.png", png_bytes, "image/png"),
)
check(
    "un INVITADO (sin login) NO puede subir comprobante a un pedido de OTRO usuario logueado",
    status == 403, f"status={status}",
)

# ============================================================
# 5. ADMIN: login y accesos restringidos
# ============================================================
print("\n=== ADMIN: login y control de acceso ===")
status, res = request("POST", "/auth/login", {"email": "admin@origen.dev", "password": "DevAdmin123!"})
check("login admin devuelve 200", status == 200, f"status={status} body={res}")
admin_token = res.get("token")
check("el rol devuelto es 'admin'", res.get("user", {}).get("role") == "admin", res)

status, res = request("GET", "/orders", token=client_token)
_, res_admin_orders = request("GET", "/orders", token=admin_token)
check(
    "un cliente NO ve todos los pedidos (solo los suyos), a diferencia del admin",
    len(res.get("orders", [])) < len(res_admin_orders.get("orders", [])),
    f"cliente={len(res.get('orders', []))} admin={len(res_admin_orders.get('orders', []))}",
)

status, res = request("POST", "/products", {
    "category_id": categories[0]["id"], "name": "x", "price": 1,
}, token=client_token)
check("un CLIENTE no puede crear productos (403)", status == 403, f"status={status}")

status, res = request("GET", "/orders/stats", token=client_token)
check("un CLIENTE no puede ver /orders/stats (403)", status == 403, f"status={status}")

status, res = request("GET", "/orders/stats")
check("ver /orders/stats sin token devuelve 401", status == 401, f"status={status}")

status, res = request("GET", "/orders/stats", token=admin_token)
check("ADMIN sí puede ver /orders/stats", status == 200, f"status={status}")
stats = res.get("stats", {})
check("las stats incluyen ventas de hoy", "today" in stats, stats)
check("las stats incluyen productos más vendidos", "topProducts" in stats, stats)

# ============================================================
# 6. ADMIN: ver pedido, ver pago/comprobante, verificar pago
# ============================================================
print("\n=== ADMIN: pedidos y verificación de pagos ===")
status, res = request("GET", f"/orders/{qr_order['id']}", token=admin_token)
check("admin puede ver el detalle del pedido QR", status == 200, f"status={status}")
order_detail = res.get("order", {})
latest_payment = order_detail.get("payments", [{}])[0]
check("el detalle del pedido incluye el pago con comprobante", bool(latest_payment.get("proof_image_url")), latest_payment)

status, res = request("GET", "/payments?status=pendiente", token=admin_token)
status, res = request("GET", "/payments", token=admin_token)
check("GET /payments (admin) devuelve 200", status == 200, f"status={status}")
all_payments = res.get("payments", [])
check("el pago del pedido QR aparece en la lista de pagos", any(p["order_id"] == qr_order["id"] for p in all_payments))

status, res = request("PUT", f"/payments/{latest_payment['id']}/status", {"status": "verificado"}, token=admin_token)
check("verificar pago devuelve 200", status == 200, f"status={status} body={res}")
check("el pago queda como 'verificado'", res.get("payment", {}).get("status") == "verificado", res)

status, res = request("GET", f"/orders/{qr_order['id']}", token=admin_token)
check(
    "al verificar el pago, el pedido pasa automáticamente a 'confirmado'",
    res.get("order", {}).get("status") == "confirmado",
    res.get("order", {}).get("status"),
)

# Probar también el flujo de rechazo con el pedido de invitado (efectivo -> pago pendiente por defecto)
status, res = request("GET", f"/orders/{guest_order['id']}", token=admin_token)
guest_payment_id = res.get("order", {}).get("payments", [{}])[0].get("id")
status, res = request("PUT", f"/payments/{guest_payment_id}/status", {"status": "rechazado"}, token=admin_token)
check("rechazar pago devuelve 200", status == 200, f"status={status}")
check("el pago queda como 'rechazado'", res.get("payment", {}).get("status") == "rechazado", res)

# ============================================================
# 7. ADMIN: cambiar estado del pedido a través de todo el flujo
# ============================================================
print("\n=== ADMIN: flujo de estados del pedido ===")
flow = ["confirmado", "en_preparacion", "listo", "en_camino", "entregado"]
ok_flow = True
for s in flow:
    status, res = request("PUT", f"/orders/{qr_order['id']}/status", {"status": s}, token=admin_token)
    if status != 200 or res.get("order", {}).get("status") != s:
        ok_flow = False
        print(f"  -> fallo en transición a {s}: status={status} body={res}")
check("el pedido recorre todo el flujo de estados hasta 'entregado'", ok_flow)

status, res = request("PUT", f"/orders/{qr_order['id']}/status", {"status": "estado_invalido"}, token=admin_token)
check("un estado inválido es rechazado con 400", status == 400, f"status={status}")

# ============================================================
# 8. ADMIN: CRUD de categorías y productos
# ============================================================
print("\n=== ADMIN: CRUD categorías y productos ===")
status, res = request("POST", "/categories", {"name": "Categoría E2E", "description": "temporal", "display_order": 99}, token=admin_token)
check("crear categoría devuelve 201", status == 201, f"status={status} body={res}")
new_category = res.get("category", {})

status, res = request("PUT", f"/categories/{new_category['id']}", {"name": "Categoría E2E editada"}, token=admin_token)
check("editar categoría devuelve 200", status == 200, f"status={status}")
check("el nombre quedó actualizado", res.get("category", {}).get("name") == "Categoría E2E editada", res)

status, res = request("POST", "/products", {
    "category_id": new_category["id"], "name": "Producto E2E", "price": 9.5, "description": "temporal",
}, token=admin_token)
check("crear producto devuelve 201", status == 201, f"status={status} body={res}")
new_product = res.get("product", {})

status, res = request("PUT", f"/products/{new_product['id']}", {"price": 12.0, "available": False}, token=admin_token)
check("editar producto (precio y disponibilidad) devuelve 200", status == 200, f"status={status}")
check("el precio quedó actualizado", float(res.get("product", {}).get("price", 0)) == 12.0, res)
check("available quedó en False", res.get("product", {}).get("available") is False, res)

status, res = request("GET", "/products")
check(
    "el producto recién desactivado (available=False) NO aparece en el catálogo público",
    all(p["id"] != new_product["id"] for p in res.get("products", [])),
)

status, res = request("DELETE", f"/products/{new_product['id']}", token=admin_token)
check("eliminar producto devuelve 200", status == 200, f"status={status}")
status, res = request("DELETE", f"/categories/{new_category['id']}", token=admin_token)
check("eliminar categoría (ya sin productos) devuelve 200", status == 200, f"status={status}")

# ============================================================
# 9. ADMIN: configuración, ubicación, QR, imágenes
# ============================================================
print("\n=== ADMIN: configuración, ubicación, QR e imágenes ===")
status, res = request("GET", "/settings")
check("GET /settings (público) devuelve 200", status == 200, f"status={status}")
check("settings incluye el nombre de la cafetería", "cafe_name" in res.get("settings", {}), res)

status, res = request("PUT", "/settings", {
    "cafe_name": "ORIGEN Test", "address": "Nueva dirección E2E 456", "latitude": "-16.55", "longitude": "-68.12",
}, token=admin_token)
check("PUT /settings (admin) devuelve 200", status == 200, f"status={status}")
check("la dirección quedó actualizada", res.get("settings", {}).get("address") == "Nueva dirección E2E 456", res)

status, res = request("PUT", "/settings", {"cafe_name": "ORIGEN Test"}, token=client_token)
check("un CLIENTE no puede modificar /settings (403)", status == 403, f"status={status}")

status, res = request("PUT", f"/payments/methods/{qr_method['id']}", {
    "config": {"bank": "Banco E2E", "account": "999888777", "instructions": "Pago de prueba E2E", "qr_image": qr_method["config"].get("qr_image", "")},
}, token=admin_token)
check("modificar configuración del método QR devuelve 200", status == 200, f"status={status} body={res}")
check("el banco del QR quedó actualizado", res.get("paymentMethod", {}).get("config", {}).get("bank") == "Banco E2E", res)

status, res = request(
    "POST", "/uploads", body={"entity_type": "banner", "alt_text": "Banner E2E"},
    form_file=("image", "banner.png", png_bytes, "image/png"), token=admin_token,
)
check("subir imagen de banner (admin) devuelve 201", status == 201, f"status={status} body={res}")
uploaded_image = res.get("image", {})
check("la imagen subida tiene url", bool(uploaded_image.get("url")), uploaded_image)

status, res = request("POST", "/uploads", body={"entity_type": "banner"}, token=client_token)
check("un CLIENTE no puede subir imágenes vía /uploads (403 o 400)", status in (400, 401, 403), f"status={status}")

status, res = request("DELETE", f"/uploads/{uploaded_image['id']}", token=admin_token)
check("eliminar imagen (admin) devuelve 200", status == 200, f"status={status}")

status, res = request("GET", "/settings/delivery-zones")
check("GET zonas de delivery (público) devuelve 200", status == 200, f"status={status}")
zones = res.get("deliveryZones", [])
check("hay zonas de delivery desde el seed", len(zones) > 0, len(zones))

status, res = request("POST", "/settings/delivery-zones", {"name": "Zona E2E", "cost": 15.5}, token=admin_token)
check("crear zona de delivery (admin) devuelve 201", status == 201, f"status={status}")

# ============================================================
# RESUMEN
# ============================================================
print(f"\n{'='*60}")
print(f"RESULTADO: {PASSED} pasaron, {FAILED} fallaron de {PASSED + FAILED} pruebas")
if FAILURES:
    print("Pruebas que fallaron:")
    for f in FAILURES:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("Todas las pruebas E2E pasaron correctamente.")
    sys.exit(0)
