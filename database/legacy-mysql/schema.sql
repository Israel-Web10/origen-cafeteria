-- ============================================================
-- ORIGEN CAFETERÍA — Esquema de base de datos (MySQL 8.0+)
-- ============================================================
-- Ejecutar con:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS origen_cafeteria
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE origen_cafeteria;

-- ============================================================
-- USERS — clientes y administradores
-- ============================================================
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  role          ENUM('client','admin') NOT NULL DEFAULT 'client',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_active (active)
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCTS — el menú se administra 100% desde la BD
-- ============================================================
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  image_url   VARCHAR(500),
  stock       INT DEFAULT NULL,        -- NULL = stock ilimitado / no aplica
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_products_category (category_id),
  INDEX idx_products_active (active),
  INDEX idx_products_available (available)
) ENGINE=InnoDB;

-- ============================================================
-- IMAGES — banners, logo, galería, QR de pago, fotos de producto extra
-- ============================================================
CREATE TABLE images (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  entity_type   ENUM('product','banner','gallery','logo','qr') NOT NULL,
  entity_id     INT NULL,
  url           VARCHAR(500) NOT NULL,
  alt_text      VARCHAR(255),
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_images_entity (entity_type, entity_id)
) ENGINE=InnoDB;

-- ============================================================
-- DELIVERY ZONES
-- ============================================================
CREATE TABLE delivery_zones (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  cost                    DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_time_minutes  INT DEFAULT 30,
  active                  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- DELIVERY ADDRESSES
-- ============================================================
CREATE TABLE delivery_addresses (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NULL,
  recipient_name VARCHAR(150) NOT NULL,
  phone          VARCHAR(30) NOT NULL,
  address        VARCHAR(255) NOT NULL,
  reference      VARCHAR(255),
  zone_id        INT NULL,
  latitude       DECIMAL(10,7),
  longitude      DECIMAL(10,7),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PAYMENT METHODS — QR, tarjeta (preparado), efectivo
-- ============================================================
CREATE TABLE payment_methods (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('qr','card','cash') NOT NULL,
  name       VARCHAR(100) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  config     JSON,                     -- ej: {"bank":"BNB","account":"123","qr_image":"/uploads/qr.png","instructions":"..."}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  order_number        VARCHAR(30) NOT NULL UNIQUE,
  user_id             INT NULL,                 -- NULL = invitado
  customer_name       VARCHAR(150) NOT NULL,
  customer_phone      VARCHAR(30) NOT NULL,
  customer_email      VARCHAR(150),
  delivery_type       ENUM('pickup','delivery') NOT NULL,
  delivery_address_id INT NULL,
  payment_method_id   INT NOT NULL,
  subtotal            DECIMAL(10,2) NOT NULL,
  discount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total                DECIMAL(10,2) NOT NULL,
  status              ENUM('pendiente','confirmado','en_preparacion','listo','en_camino','entregado','cancelado')
                        NOT NULL DEFAULT 'pendiente',
  observations        TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  INDEX idx_orders_status (status),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT NULL,
  product_name VARCHAR(150) NOT NULL,   -- copia histórica (el producto puede cambiar luego)
  unit_price   DECIMAL(10,2) NOT NULL,
  quantity     INT NOT NULL,
  subtotal     DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

-- ============================================================
-- PAYMENTS — verificación manual de QR / efectivo, y hook para tarjeta
-- ============================================================
CREATE TABLE payments (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  order_id           INT NOT NULL,
  payment_method_id  INT NOT NULL,
  amount             DECIMAL(10,2) NOT NULL,
  status             ENUM('pendiente','verificado','rechazado') NOT NULL DEFAULT 'pendiente',
  proof_image_url    VARCHAR(500),      -- comprobante subido por el cliente (QR)
  gateway_reference  VARCHAR(255),      -- id de transacción de una pasarela real (futuro)
  verified_by        INT NULL,
  verified_at        TIMESTAMP NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payments_status (status),
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

-- ============================================================
-- TICKETS / COMPROBANTES
-- ============================================================
CREATE TABLE tickets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  order_id      INT NOT NULL UNIQUE,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SETTINGS — configuración general (clave/valor), incluye ubicación
-- ============================================================
CREATE TABLE settings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
