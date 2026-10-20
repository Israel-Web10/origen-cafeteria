# ORIGEN — Fase 2: Arquitectura

## Visión general

```
Navegador (React SPA, i18n es/en/fr)
   │  HTTPS (JSON, Bearer JWT)
   ▼
API Express modular (Node 20+)
   ├── validación (zod) · helmet · rate limiting · compresión · logs
   ├── servicios: pedidos, pagos, inventario, monedas, analítica, reportes, auditoría
   ├── almacenamiento de archivos (driver local; interfaz preparada para S3/R2)
   ▼
PostgreSQL 17 (pool de conexiones, transacciones, migraciones versionadas)
```

Un solo backend modular + una base de datos administrada es suficiente para una cafetería.
**No se agregan Redis, colas ni microservicios**: no hay una carga demostrada que lo justifique y
añadirían costo y puntos de falla. Si una prueba de carga futura lo demuestra, el primer paso
sería escalar horizontalmente la API (es stateless) detrás de un balanceador.

## Decisión 1 — Migrar de MySQL a PostgreSQL

| Criterio | Análisis |
|---|---|
| Requisito del propietario | Dispone de PostgreSQL y quiere administrarlo. |
| Datos existentes | Solo datos de desarrollo (`seed.sql`); **no hay datos de producción que migrar**. Riesgo de pérdida: nulo. |
| Ventajas técnicas | `CHECK` constraints reales, `NUMERIC` exacto, `jsonb`, `timestamptz` + `AT TIME ZONE` para reportes con la zona del negocio, secuencias para números de pedido sin carreras, `RETURNING`, índices parciales. |
| Oferta en la nube | Amplia (ver `docs/investigacion/hosting-y-base-de-datos.md`). |
| Costo de la migración | Reescribir la capa de modelos (SQL parametrizado `?` → `$1`). Se hace junto con las correcciones de seguridad que de todas formas tocan esos archivos. |

Se conserva `database/schema.sql` y `seed.sql` de MySQL en `database/legacy-mysql/` como
referencia histórica (no se borran). El esquema nuevo vive en `backend/migrations/`.

## Decisión 2 — Dinero

- Todos los importes se guardan como **enteros en unidades menores** (`*_cents`, centavos de la
  moneda base). Nunca `float` en cálculos.
- Moneda base configurable (por defecto **BOB**). Los pedidos guardan `currency_code` y, si el
  cliente veía otra moneda, el tipo de cambio aplicado (`display_currency`, `display_rate`).
- Los tipos de cambio son **manuales** y los administra el gerente (fecha, fuente, tipo:
  oficial / comercial / manual). La conversión es solo informativa: **se cobra en BOB**.
  Una API externa se podrá activar solo si cumple las condiciones de `docs/investigacion/tipo-de-cambio.md`.

## Decisión 3 — Autenticación y roles

- JWT Bearer (sin cookies → sin superficie CSRF). Expiración configurable (12 h por defecto).
- `users.token_version`: cambiar contraseña, desactivar o forzar cierre de sesión invalida tokens.
- Bloqueo temporal tras intentos fallidos + rate limiting por IP.
- Roles: `client` (CLIENTE), `manager` (GERENTE: operación diaria, catálogo, inventario,
  reportes, contenido), `admin` (ADMINISTRADOR: todo lo anterior + usuarios, monedas, métodos de pago, auditoría).

## Decisión 4 — Pedidos y concurrencia

- Número de pedido desde una **secuencia** de PostgreSQL (`ORD-2026-000123`), sin carreras.
- Token público aleatorio por pedido (`public_token`, 128 bits) para seguimiento de invitados.
  El seguimiento por número exige el token o los últimos 4 dígitos del teléfono y oculta datos personales.
- Idempotencia: cabecera `Idempotency-Key` en `POST /orders`; un reintento devuelve el mismo pedido.
- Transacción con bloqueo de filas (`FOR UPDATE`) **en orden de id** (evita interbloqueos) sobre
  productos e ingredientes; `CHECK (stock >= 0)` como red de seguridad final.

## Decisión 5 — Pagos

- Estado del pedido (`pendiente → confirmado → en_preparacion → listo → en_camino → entregado` / `cancelado`)
  separado del estado del pago (`pendiente`, `en_verificacion`, `pagado`, `rechazado`, `reembolsado`).
- QR: imagen oficial subida por el gerente; el cliente puede adjuntar referencia y comprobante;
  **ningún pago se confirma automáticamente**; la verificación registra quién y cuándo.
- Efectivo: el personal registra importe recibido; el sistema calcula el cambio.
- Tarjeta: interfaz de proveedor (`services/payments/providers`) con un proveedor `test` claramente
  marcado. **No hay proveedor real configurado** — ver `docs/investigacion/pagos-bolivia.md`.

## Decisión 6 — Archivos

- Validación por **firma binaria** (magic bytes), no por el `Content-Type` del cliente. Solo JPEG, PNG, WEBP.
  SVG no se acepta (puede contener scripts).
- Nombre de archivo aleatorio + extensión derivada del tipo real.
- Público (`/uploads/public/...`) vs privado (comprobantes de pago, solo vía endpoint autorizado).
- En producción el disco de una plataforma PaaS puede no ser persistente: usar un volumen persistente
  o un almacenamiento de objetos (driver preparado; requiere autorización por costos).

## Decisión 7 — Frontend

- `react-i18next` con archivos JSON por idioma y fallback a español.
- `framer-motion` para transiciones entre rutas (las salidas animadas no son viables solo con CSS).
- Escena inmersiva con **video optimizado + perspectiva CSS 3D + parallax**, no Three.js: el
  efecto "avanzar hacia el local" se logra con la cámara CSS (`perspective` + `translateZ`) sobre capas
  reales de profundidad. Three.js añadiría ~150 kB gzip sin un modelo 3D real del local que mostrar.
  Si en el futuro hay un escaneo/modelo 3D del local, React Three Fiber sería la opción.
- `prefers-reduced-motion`, `navigator.connection.saveData` y un modo "ligero" desactivan video y animaciones.
- Gráficos del dashboard en SVG propio (sin librería de gráficos pesada).
- Panel administrativo cargado de forma diferida (code splitting).

## Decisión 8 — Reportes

Generados **en el backend** (PDFKit y ExcelJS), en streaming, con filtros y límite de filas
configurable. El navegador nunca descarga todas las ventas para construir un informe.

## Decisión 9 — Zona horaria

`settings.timezone` (por defecto `America/La_Paz`). Toda agregación por día/semana/mes usa
`created_at AT TIME ZONE tz`. Periodos: diario, semanal (lunes–domingo), mensual, trimestral,
semestral, anual y personalizado; límites `[inicio, fin)` en hora local del negocio.
