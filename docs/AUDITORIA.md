# ORIGEN — Fase 1: Auditoría del proyecto existente

Fecha: 2026-10-20 · Base auditada: commit `89ac09d` ("Primera versión de ORIGEN")
del repositorio `Israel-Web10/origen-cafeteria` (idéntico al zip `origen-cafeteria.zip`
salvo finales de línea CRLF y carpetas vacías).

## 1. Tecnologías realmente utilizadas

| Capa | Lo que dice la documentación | Lo que hay en el código |
|---|---|---|
| Frontend | React 18 + Vite + TS + Tailwind | Correcto. React Router 6, axios. Sin i18n, sin librería de animación. |
| Backend | Express + JWT + bcrypt + multer | Correcto. `express-validator` instalado pero usado solo en auth. |
| Base de datos | MySQL 8 | **MySQL** (`mysql2`, `ENUM`, `ON DUPLICATE KEY`, `YEARWEEK`, `CURDATE`). **No está preparado para PostgreSQL.** |
| Pruebas | "~76 pruebas e2e" | `backend/scripts/test_e2e.py` (Python, contra un servidor vivo). No hay pruebas unitarias ni de frontend. |
| Lint | `npm run lint` | **Roto**: no existe configuración de ESLint. |

Entorno local detectado: PostgreSQL 17 y MySQL 8 instalados y en ejecución, Node 24, Python 3.12, Docker.

## 2. Línea base ejecutada (resultados reales)

| Comprobación | Resultado |
|---|---|
| `npm install` backend/frontend | OK |
| `tsc -b` frontend | OK, 0 errores |
| `vite build` | OK — JS 311 kB (92.5 kB gzip), CSS 27.8 kB |
| `npm run lint` | **Falla**: "ESLint couldn't find a configuration file" |
| `npm audit` backend (prod) | 6 vulnerabilidades: 1 crítica (`proxy-addr`), 1 alta (`multer`, 5 avisos DoS), 4 moderadas (`qs`, `morgan`) |
| `npm audit` frontend | 15 vulnerabilidades (10 altas, 5 moderadas), todas en herramientas de build |

## 3. Funcionalidades: estado real

| Funcionalidad | Estado |
|---|---|
| Catálogo, categorías, búsqueda | Funciona (búsqueda con `LIKE`, sin ordenar ni paginar) |
| Carrito persistente | Funciona en `localStorage`, guarda el objeto producto completo (precio obsoleto si cambia) |
| Checkout | **Roto tras confirmar**: navega a `/pedido/<id numérico>` pero la página busca por *número de pedido* → muestra "Pedido no encontrado" |
| Seguimiento público | Funciona, pero **expone nombre, teléfono, correo y dirección** con un número secuencial adivinable (`ORD-2026-0001`, `0002`…) |
| Pagos QR | Comprobante subible; verificación manual por admin. Sin referencia, sin auditoría, sin estados de pago separados de reembolsos |
| Efectivo | Solo texto de instrucciones; no registra importe recibido ni cambio |
| Tarjeta | Deshabilitada (correcto: no hay proveedor) |
| Panel admin | Dashboard básico, CRUD productos/categorías, pedidos, pagos, imágenes, configuración |
| Roles | Solo `client` y `admin` (falta GERENTE) |
| Inventario | Solo `products.stock` entero; sin movimientos, sin ingredientes, sin auditoría |
| Monedas | Solo "Bs" escrito a mano en la UI; precios `DECIMAL` convertidos a `Number` (float) en JS |
| Reportes PDF/Excel | No existen |
| i18n | No existe (todo en español fijo) |
| Políticas legales / cookies | No existen |
| Página de historia / instalaciones / FAQ / contacto | Solo secciones de la portada; los enlaces `/#nosotros`, `/#ubicacion` no hacen scroll real |
| Horarios | Se guardan como JSON pero la portada muestra un texto **fijo** en el código |
| Mapa | Placeholder de texto |

## 4. Hallazgos de seguridad (priorizados)

| # | Severidad | Hallazgo | Ubicación |
|---|---|---|---|
| S1 | **Crítica** | `quantity` no se valida: un pedido con cantidad negativa genera total negativo y **aumenta** el stock | `orderModel.createOrder` |
| S2 | **Crítica** | Subida de archivos confía en el `mimetype` y la extensión que envía el cliente: se puede subir un `.html`/`.svg` con `Content-Type: image/png` y servirlo desde `/uploads` (XSS almacenado en el origen de la API) | `middleware/upload.js` |
| S3 | Alta | IDOR / exposición de datos personales: seguimiento público por número secuencial devuelve teléfono, correo y dirección | `GET /orders/track/:n` |
| S4 | Alta | Cualquiera puede adjuntar comprobantes a pedidos de invitados recorriendo IDs secuenciales | `POST /payments/:orderId/proof` |
| S5 | Alta | Comprobantes de pago (datos bancarios del cliente) son públicos en `/uploads` | `app.js` static |
| S6 | Alta | Sin rate limiting: fuerza bruta en `/auth/login`, spam de pedidos | global |
| S7 | Alta | Número de pedido = `COUNT(*)+1`: dos pedidos simultáneos obtienen el mismo número → error 409 al cliente | `nextSequence()` |
| S8 | Alta | El mismo producto repetido en varias líneas evita la comprobación de stock | `createOrder` |
| S9 | Media | Se acepta un método de pago inactivo (p. ej. "tarjeta") y entrega a domicilio deshabilitada; pedido mínimo solo validado en el navegador | `createOrder` |
| S10 | Media | Delivery sin zona → costo de envío 0 | `createOrder` |
| S11 | Media | CORS cae en `*` si falta `CLIENT_URL`; sin cabeceras de seguridad (helmet) | `app.js` |
| S12 | Media | Si falta `JWT_SECRET` el servidor arranca y falla en cada login; no hay validación de configuración | `server.js` |
| S13 | Media | JWT en `localStorage` 7 días sin revocación (cambio de contraseña/desactivación no invalida sesiones) | `AuthContext` |
| S14 | Media | Sin auditoría de operaciones críticas (verificación de pagos, cambios de precio, ajustes) | — |
| S15 | Baja | `morgan` registra rutas completas; el manejador de errores imprime el objeto completo | `errorHandler` |
| S16 | Baja | Dependencias vulnerables (ver §2) | `package.json` |

Lo que sí estaba bien: SQL siempre parametrizado (sin inyección SQL detectada), bcrypt para
contraseñas, precios recalculados en servidor, transacción con `SELECT … FOR UPDATE` al crear
pedidos, `password_hash` nunca devuelto, lista blanca de campos en `update` (sin mass assignment).

## 5. Base de datos

- Esquema MySQL normalizado (11 tablas) con FKs e índices razonables, **sin sistema de migraciones**
  (un único `schema.sql` destructivo).
- Importes `DECIMAL(10,2)` (correcto en BD) pero aritmética en JS con `Number` (float).
- `seed.sql` contiene hashes de contraseñas de desarrollo documentadas en el README.
- Sin backups, sin restauración documentada, sin usuarios/roles de BD con privilegios mínimos.
- Sin zona horaria definida: `CURDATE()` usa la zona del servidor de BD.

## 6. Recursos multimedia recibidos

| Recurso | Observación |
|---|---|
| Logo taza (pngtree) | Tiene **marca de agua de pngtree**: requiere licencia de pago para uso comercial. **No se incluye en el repositorio.** Se creó un logotipo SVG original y el gerente puede subir el logo oficial desde el panel. |
| Foto interior "ANTICAFÉ" | Es el local de **otra empresa** (se lee su marca en la pared). **No se usa**: presentarla como ORIGEN sería engañoso. |
| `201947-916877801.mp4` (4K, 30 s, 24 MB) | Interior de cafetería renderizado, nocturno con lluvia. Se usa como escena ilustrativa del hero, convertido a 720p web. Licencia a confirmar por el propietario (el nombre del archivo sugiere Pixabay). |
| `279679.mp4` (4K, 30 s, 95 MB) | Escena acogedora con chimenea y lavanda. Se usa como ambientación ilustrativa en "Nuestra historia". Misma nota de licencia. |

Ver `docs/RECURSOS-Y-LICENCIAS.md`.

## 7. Plan priorizado

1. **Base de datos → PostgreSQL** (justificado en `docs/ARQUITECTURA.md`), con migraciones versionadas.
2. Corregir S1–S12 y el bug del checkout (bloqueantes para vender).
3. Modelo de dinero en unidades menores enteras, monedas y tipo de cambio manual.
4. Pagos con estados separados, verificación auditada, efectivo con cambio, tarjeta en modo arquitectura.
5. Roles CLIENTE / GERENTE / ADMINISTRADOR, auditoría.
6. Inventario con movimientos, ingredientes y recetas.
7. Analítica por periodos con zona horaria del negocio, reportes PDF/Excel generados en backend.
8. Frontend: i18n (es/en/fr), rutas independientes, escenas inmersivas, panel del gerente ampliado, legales y cookies.
9. Pruebas automatizadas, prueba de carga, guías de despliegue/backup.
