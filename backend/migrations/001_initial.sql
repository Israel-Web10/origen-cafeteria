-- ============================================================
-- ORIGEN — 001: esquema inicial PostgreSQL
-- Reemplaza el esquema MySQL original (ver database/legacy-mysql/).
-- Importes en unidades menores enteras (*_cents) de la moneda base.
-- ============================================================

-- ---------- Usuarios ----------
CREATE TABLE users (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(150) NOT NULL,
  email              VARCHAR(150) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  phone              VARCHAR(30),
  role               VARCHAR(20)  NOT NULL DEFAULT 'client' CHECK (role IN ('client','manager','admin')),
  active             BOOLEAN      NOT NULL DEFAULT TRUE,
  preferred_locale   VARCHAR(5)   NOT NULL DEFAULT 'es' CHECK (preferred_locale IN ('es','en','fr')),
  token_version      INTEGER      NOT NULL DEFAULT 0,
  failed_logins      INTEGER      NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_idx ON users (role);

-- ---------- Catálogo ----------
CREATE TABLE categories (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  description   VARCHAR(500),
  image_url     VARCHAR(500),
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  translations  JSONB   NOT NULL DEFAULT '{}'::jsonb,   -- {"en":{"name":"","description":""},"fr":{...}}
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX categories_active_idx ON categories (active, display_order);

CREATE TABLE products (
  id                  SERIAL PRIMARY KEY,
  category_id         INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name                VARCHAR(150) NOT NULL,
  slug                VARCHAR(170) NOT NULL UNIQUE,
  description         TEXT,
  ingredients         TEXT,
  allergens           TEXT,
  price_cents         INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents          INTEGER CHECK (cost_cents IS NULL OR cost_cents >= 0),
  image_url           VARCHAR(500),
  stock               INTEGER CHECK (stock IS NULL OR stock >= 0),   -- NULL = no se controla por unidades
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  prep_time_minutes   INTEGER CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  is_new              BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  available           BOOLEAN NOT NULL DEFAULT TRUE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  tags                TEXT[]  NOT NULL DEFAULT '{}',
  translations        JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_public_idx ON products (active, available);
CREATE INDEX products_name_lower_idx ON products (lower(name));

CREATE TABLE product_variants (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name              VARCHAR(80) NOT NULL,              -- ej: "Pequeño", "Grande", "Leche de avena"
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  display_order     INTEGER NOT NULL DEFAULT 0,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  translations      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_idx ON product_variants (product_id);

CREATE TABLE promotions (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  description  VARCHAR(500),
  kind         VARCHAR(10) NOT NULL CHECK (kind IN ('percent','fixed')),
  value        INTEGER NOT NULL CHECK (value > 0),     -- percent: 1..90 ; fixed: centavos
  product_id   INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  translations JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (kind <> 'percent' OR value <= 90),
  CHECK (product_id IS NOT NULL OR category_id IS NOT NULL)
);
CREATE INDEX promotions_window_idx ON promotions (active, starts_at, ends_at);

-- ---------- Imágenes y contenido ----------
CREATE TABLE images (
  id              SERIAL PRIMARY KEY,
  entity_type     VARCHAR(20) NOT NULL CHECK (entity_type IN ('product','banner','gallery','logo','favicon','qr','hero','facility','category')),
  entity_id       INTEGER,
  url             VARCHAR(500) NOT NULL,
  storage_key     VARCHAR(300),
  alt_text        VARCHAR(255),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  is_illustrative BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = no es una foto del local real
  source          VARCHAR(255),
  license         VARCHAR(255),
  display_order   INTEGER NOT NULL DEFAULT 0,
  width           INTEGER,
  height          INTEGER,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX images_entity_idx ON images (entity_type, entity_id);

-- Páginas editables (historia, instalaciones, FAQ, políticas) con borrador y versión publicada
CREATE TABLE pages (
  slug          VARCHAR(60) NOT NULL,
  locale        VARCHAR(5)  NOT NULL CHECK (locale IN ('es','en','fr')),
  title         VARCHAR(200) NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  draft_title   VARCHAR(200),
  draft_body    TEXT,
  published     BOOLEAN NOT NULL DEFAULT TRUE,
  version       INTEGER NOT NULL DEFAULT 1,
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, locale)
);

CREATE TABLE settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Monedas ----------
CREATE TABLE currencies (
  code      CHAR(3) PRIMARY KEY,
  name      VARCHAR(60) NOT NULL,
  symbol    VARCHAR(8)  NOT NULL,
  decimals  SMALLINT    NOT NULL DEFAULT 2 CHECK (decimals BETWEEN 0 AND 4),
  enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_base   BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX currencies_one_base_uq ON currencies (is_base) WHERE is_base;

-- 1 unidad de base_code = rate unidades de quote_code
CREATE TABLE exchange_rates (
  id           SERIAL PRIMARY KEY,
  base_code    CHAR(3) NOT NULL REFERENCES currencies(code),
  quote_code   CHAR(3) NOT NULL REFERENCES currencies(code),
  rate         NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  rate_type    VARCHAR(12) NOT NULL CHECK (rate_type IN ('oficial','comercial','manual')),
  source       VARCHAR(255) NOT NULL,
  notes        VARCHAR(500),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (base_code <> quote_code)
);
CREATE INDEX exchange_rates_pair_idx ON exchange_rates (base_code, quote_code, effective_at DESC);

-- ---------- Entrega ----------
CREATE TABLE delivery_zones (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(100) NOT NULL,
  cost_cents             INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30 CHECK (estimated_time_minutes > 0),
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE delivery_addresses (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recipient_name VARCHAR(150) NOT NULL,
  phone          VARCHAR(30)  NOT NULL,
  address        VARCHAR(255) NOT NULL,
  reference      VARCHAR(255),
  zone_id        INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL,
  latitude       NUMERIC(10,7),
  longitude      NUMERIC(10,7),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Pagos y pedidos ----------
CREATE TABLE payment_methods (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('qr','cash','card')),
  name          VARCHAR(100) NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  config        JSONB   NOT NULL DEFAULT '{}'::jsonb,   -- solo datos públicos (instrucciones, QR); nunca secretos
  translations  JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
  id                  SERIAL PRIMARY KEY,
  order_number        VARCHAR(30) NOT NULL UNIQUE,
  public_token        VARCHAR(64) NOT NULL UNIQUE,
  idempotency_key     VARCHAR(80) UNIQUE,
  user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name       VARCHAR(150) NOT NULL,
  customer_phone      VARCHAR(30)  NOT NULL,
  customer_email      VARCHAR(150),
  locale              VARCHAR(5)   NOT NULL DEFAULT 'es',
  delivery_type       VARCHAR(10)  NOT NULL CHECK (delivery_type IN ('pickup','delivery')),
  delivery_address_id INTEGER REFERENCES delivery_addresses(id) ON DELETE SET NULL,
  payment_method_id   INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  subtotal_cents      INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents      INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  delivery_fee_cents  INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents         INTEGER NOT NULL CHECK (total_cents >= 0),
  display_currency    CHAR(3),
  display_rate        NUMERIC(18,8),
  display_rate_id     INTEGER REFERENCES exchange_rates(id) ON DELETE SET NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (status IN ('pendiente','confirmado','en_preparacion','listo','en_camino','entregado','cancelado')),
  payment_status      VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (payment_status IN ('pendiente','en_verificacion','pagado','rechazado','reembolsado')),
  observations        VARCHAR(500),
  cancel_reason       VARCHAR(300),
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total_cents = subtotal_cents - discount_cents + delivery_fee_cents)
);
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_payment_status_idx ON orders (payment_status);
CREATE INDEX orders_user_idx ON orders (user_id);
CREATE INDEX orders_created_idx ON orders (created_at);

CREATE TABLE order_items (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id       INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  product_name     VARCHAR(150) NOT NULL,       -- copia histórica
  variant_name     VARCHAR(80),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_cost_cents  INTEGER,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  discount_cents   INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  subtotal_cents   INTEGER NOT NULL CHECK (subtotal_cents >= 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);

CREATE TABLE order_status_history (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(20),
  to_status   VARCHAR(20) NOT NULL,
  changed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note        VARCHAR(300),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON order_status_history (order_id);

CREATE TABLE payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method_id   INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
  method_type         VARCHAR(10) NOT NULL CHECK (method_type IN ('qr','cash','card')),
  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency_code       CHAR(3) NOT NULL REFERENCES currencies(code),
  status              VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                        CHECK (status IN ('pendiente','en_verificacion','verificado','rechazado','reembolsado')),
  reference           VARCHAR(120),          -- referencia/nº de operación informada por el cliente
  proof_storage_key   VARCHAR(300),          -- comprobante (almacenamiento PRIVADO)
  cash_received_cents INTEGER CHECK (cash_received_cents IS NULL OR cash_received_cents >= 0),
  change_cents        INTEGER CHECK (change_cents IS NULL OR change_cents >= 0),
  gateway             VARCHAR(40),
  gateway_mode        VARCHAR(10) CHECK (gateway_mode IS NULL OR gateway_mode IN ('test','live')),
  gateway_reference   VARCHAR(255),
  rejection_reason    VARCHAR(300),
  verified_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_status_idx ON payments (status);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE tickets (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Inventario ----------
CREATE TABLE suppliers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  contact    VARCHAR(150),
  phone      VARCHAR(30),
  email      VARCHAR(150),
  notes      VARCHAR(500),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insumos/ingredientes (café en grano, leche, vasos...). La cantidad se guarda en la unidad del insumo.
CREATE TABLE inventory_items (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  unit                VARCHAR(10)  NOT NULL CHECK (unit IN ('g','kg','ml','l','unidad')),
  quantity            NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity        NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  cost_per_unit_cents NUMERIC(14,4),          -- costo promedio por unidad del insumo
  supplier_id         INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  tracks_expiry       BOOLEAN NOT NULL DEFAULT FALSE,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receta: cuánto insumo consume UNA unidad vendida del producto (o de una variante concreta)
CREATE TABLE product_components (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity          NUMERIC(14,3) NOT NULL CHECK (quantity > 0)
);
CREATE UNIQUE INDEX product_components_uq
  ON product_components (product_id, COALESCE(variant_id, 0), inventory_item_id);

-- Movimientos: historial inmutable. Las correcciones se hacen con un ajuste nuevo, nunca borrando.
CREATE TABLE stock_movements (
  id                SERIAL PRIMARY KEY,
  product_id        INTEGER REFERENCES products(id) ON DELETE SET NULL,
  inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL,
  type              VARCHAR(20) NOT NULL CHECK (type IN ('entrada','venta','ajuste','merma','anulacion_venta','devolucion')),
  quantity_delta    NUMERIC(14,3) NOT NULL CHECK (quantity_delta <> 0),
  balance_after     NUMERIC(14,3) NOT NULL,
  unit_cost_cents   NUMERIC(14,4),
  reason            VARCHAR(300),
  order_id          INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  supplier_id       INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  expires_at        DATE,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((product_id IS NULL) <> (inventory_item_id IS NULL))
);
CREATE INDEX stock_movements_product_idx ON stock_movements (product_id, created_at);
CREATE INDEX stock_movements_item_idx ON stock_movements (inventory_item_id, created_at);
CREATE INDEX stock_movements_created_idx ON stock_movements (created_at);

-- ---------- Auditoría y privacidad ----------
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(40) NOT NULL,
  entity_id  VARCHAR(40),
  before     JSONB,
  after      JSONB,
  ip         VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id);
CREATE INDEX audit_log_created_idx ON audit_log (created_at);

CREATE TABLE cookie_consents (
  id             BIGSERIAL PRIMARY KEY,
  consent_id     VARCHAR(64) NOT NULL,
  necessary      BOOLEAN NOT NULL DEFAULT TRUE,
  analytics      BOOLEAN NOT NULL DEFAULT FALSE,
  marketing      BOOLEAN NOT NULL DEFAULT FALSE,
  policy_version VARCHAR(20) NOT NULL,
  user_agent     VARCHAR(300),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cookie_consents_id_idx ON cookie_consents (consent_id);

-- Mantener updated_at
CREATE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER categories_touch BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER products_touch BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER payment_methods_touch BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER payments_touch BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER inventory_items_touch BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
