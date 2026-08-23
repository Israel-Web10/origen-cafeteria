# ORIGEN — Sistema web de pedidos online para cafetería

Sistema completo de pedidos online para una cafetería artesanal, con
frontend de cliente, panel de administración, API REST y base de datos
relacional. Construido como una base sólida y funcional, no como un
prototipo visual: el frontend consume datos reales de la API en cada
pantalla — nada de productos, precios o configuración está hardcodeado.

## Qué incluye

- **Cliente**: menú dinámico por categorías, carrito persistente, checkout
  con recojo en tienda o delivery, pago por QR/efectivo (tarjeta preparada
  para integrarse), tickets/comprobantes descargables e imprimibles,
  seguimiento de pedido por número (con o sin cuenta), historial de
  pedidos para usuarios registrados.
- **Administración** (`/admin`): dashboard con ventas del día/semana/mes,
  productos más vendidos y métodos de pago más usados; CRUD completo de
  productos y categorías; gestión de pedidos con cambio de estado; gestión
  de pagos con verificación/rechazo de comprobantes; gestión de imágenes
  (logo, banners, galería, QR de pago) subidas directamente desde la web;
  configuración general del negocio (ubicación, horarios, contacto, redes,
  costo de delivery, pedido mínimo).
- **Backend**: API REST en Express con autenticación JWT, roles
  cliente/admin, validación y cálculo de precios en servidor (nunca se
  confía en el precio que manda el navegador), transacciones para la
  creación de pedidos, subida de imágenes con validación de tipo/tamaño.
- **Base de datos**: MySQL, normalizada, con claves foráneas e índices
  (ver `docs/DATABASE.md`).

## Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router, Tailwind CSS |
| Backend | Node.js, Express, JWT, bcrypt, express-validator, multer |
| Base de datos | MySQL 8 |

## Arquitectura

```
React (Vite) ──HTTP/JSON──> Express API ──mysql2──> MySQL
                                  │
                                  └──> /uploads (imágenes, almacenamiento
                                       local en dev; preparado para S3/
                                       Cloudinary en producción)
```

El frontend nunca contiene datos de negocio fijos: todo (productos,
categorías, precios, configuración de la cafetería, métodos de pago,
zonas de delivery) se obtiene de la API en tiempo de ejecución.

## Estructura del proyecto

```
origen-cafeteria/
├── frontend/                  React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/        Navbar, ProductCard, Modal, etc.
│   │   ├── pages/             Home, Menu, Checkout, ... y pages/admin/
│   │   ├── layouts/           PublicLayout, AdminLayout
│   │   ├── context/           Auth, Cart, Toast
│   │   ├── services/          Capa de acceso a la API (axios)
│   │   └── types/             Tipos TypeScript compartidos
│   └── .env.example
├── backend/                    Node + Express
│   ├── src/
│   │   ├── controllers/       Lógica de cada endpoint
│   │   ├── routes/            Definición de rutas + permisos
│   │   ├── models/            Acceso a datos (SQL parametrizado)
│   │   ├── middleware/        auth (JWT/roles), upload, errores
│   │   └── config/            Conexión a MySQL
│   ├── scripts/test_e2e.py    Suite de pruebas end-to-end reales
│   └── .env.example
├── database/
│   ├── schema.sql             Estructura completa
│   └── seed.sql                Datos de desarrollo
└── docs/
    ├── API.md                 Referencia de todos los endpoints
    ├── DATABASE.md             Modelo de datos y flujos
    └── INSTALLATION.md         Instalación paso a paso desde cero
```

## Instalación rápida

Ver **`docs/INSTALLATION.md`** para la guía completa. Resumen:

```bash
# 1. Base de datos
mysql -u root -p < database/schema.sql
mysql -u root -p origen_cafeteria < database/seed.sql

# 2. Backend
cd backend
npm install
cp .env.example .env   # y edita DB_USER/DB_PASSWORD/JWT_SECRET
npm run dev

# 3. Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`.

## Credenciales de desarrollo

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@origen.dev` | `DevAdmin123!` |
| Cliente | `cliente@origen.dev` | `DevClient123!` |

Estas cuentas vienen del `seed.sql` únicamente para poder probar el
sistema — cámbialas antes de usar esto en producción.

## Pruebas

```bash
cd backend
npm run dev                       # backend corriendo
python3 scripts/test_e2e.py       # en otra terminal
```

Ejecuta ~76 pruebas HTTP reales (no mocks) contra el backend y MySQL:
registro/login, control de acceso por rol, creación de pedidos como
invitado y como cliente, subida y verificación de comprobantes QR, flujo
completo de estados del pedido, CRUD de productos/categorías,
configuración, zonas de delivery e imágenes.

## Servicios externos no incluidos

Estos requieren cuentas/credenciales que no están disponibles en este
entorno de desarrollo. El código ya está preparado para conectarlos —
ver la tabla al final de `docs/API.md` para el detalle de qué falta:

- Pasarela de pago con tarjeta real (actualmente la opción "tarjeta"
  aparece desactivada, lista para integrarse).
- Almacenamiento de imágenes en la nube (actualmente local en `/uploads`;
  recomendación y notas de migración en `docs/API.md`).
- Facturación fiscal electrónica de Bolivia (no existe una API genérica
  pública; requiere contratar un proveedor autorizado).
- Mapa interactivo embebido (actualmente se muestra la dirección con un
  enlace "Cómo llegar" a Google Maps; hay una variable reservada para una
  API key de Google Maps si se quiere embeber un mapa real).

## Seguridad

- Contraseñas con bcrypt (nunca en texto plano, nunca devueltas por la API).
- JWT con expiración configurable.
- Rutas administrativas protegidas tanto en el backend (middleware de
  rol) como en el frontend (`ProtectedRoute`) — un cliente no puede
  acceder al panel admin ni escribiendo la URL directamente.
- Todos los precios y totales se recalculan en el servidor.
- No se almacenan números completos de tarjeta en ningún lugar.
- Subida de archivos validada por tipo MIME y tamaño máximo.
- Sin secretos reales incluidos en el repositorio — solo `.env.example`.
