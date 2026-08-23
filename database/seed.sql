-- ============================================================
-- ORIGEN CAFETERÍA — Datos de prueba (desarrollo)
-- ============================================================
-- IMPORTANTE: credenciales de DESARROLLO, no usar en producción.
--   Admin  -> email: admin@origen.dev     password: DevAdmin123!
--   Cliente-> email: cliente@origen.dev   password: DevClient123!
-- Ejecutar después de schema.sql:  mysql -u root -p origen_cafeteria < seed.sql
-- ============================================================

USE origen_cafeteria;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (name, email, password_hash, phone, role) VALUES
('Administrador ORIGEN', 'admin@origen.dev', '$2b$10$a1YjyA8Hi86Vxc1OIoySs.3zJVHv.cWhlagkgtK1GL2xJEUw0Trqy', '70000000', 'admin'),
('Cliente de Prueba', 'cliente@origen.dev', '$2b$10$wC0ANhQCyLF5s7vnXNk3p.yP3aapoFb5K1un63cnDaxyktkwGT35y', '70011111', 'client');

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO categories (name, description, display_order, active) VALUES
('Cafés', 'Espresso, americanos, capuchinos y más', 1, TRUE),
('Bebidas frías', 'Frappés, iced coffee y refrescos artesanales', 2, TRUE),
('Té', 'Tés e infusiones de origen', 3, TRUE),
('Repostería', 'Panadería y repostería horneada en casa', 4, TRUE),
('Desayunos', 'Desayunos completos para empezar el día', 5, TRUE),
('Sandwiches', 'Sandwiches artesanales', 6, TRUE),
('Postres', 'Postres de la casa', 7, TRUE),
('Combos', 'Combinaciones a buen precio', 8, TRUE);

-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO products (category_id, name, description, price, image_url, stock, available, active) VALUES
(1, 'Espresso', 'Shot doble de espresso, tueste medio de altura.', 12.00, '/uploads/seed/espresso.jpg', NULL, TRUE, TRUE),
(1, 'Cappuccino', 'Espresso, leche vaporizada y espuma cremosa.', 18.00, '/uploads/seed/cappuccino.jpg', NULL, TRUE, TRUE),
(1, 'Café Origen (signature)', 'Nuestra mezcla de la casa con notas a chocolate y frutos rojos.', 20.00, '/uploads/seed/cafe-origen.jpg', NULL, TRUE, TRUE),
(2, 'Iced Latte', 'Espresso, leche fría y hielo.', 19.00, '/uploads/seed/iced-latte.jpg', NULL, TRUE, TRUE),
(2, 'Frappé de Caramelo', 'Café frappé con caramelo y crema batida.', 22.00, '/uploads/seed/frappe-caramelo.jpg', NULL, TRUE, TRUE),
(3, 'Té Verde', 'Infusión de té verde de hoja suelta.', 14.00, '/uploads/seed/te-verde.jpg', NULL, TRUE, TRUE),
(4, 'Croissant de Almendra', 'Croissant relleno de crema de almendra.', 15.00, '/uploads/seed/croissant.jpg', 20, TRUE, TRUE),
(4, 'Muffin de Arándanos', 'Muffin horneado con arándanos frescos.', 13.00, '/uploads/seed/muffin.jpg', 15, TRUE, TRUE),
(5, 'Desayuno Origen', 'Huevos, pan artesanal, palta y café incluido.', 35.00, '/uploads/seed/desayuno-origen.jpg', NULL, TRUE, TRUE),
(6, 'Sandwich de Pollo', 'Pollo grillado, vegetales frescos y aderezo de la casa.', 28.00, '/uploads/seed/sandwich-pollo.jpg', NULL, TRUE, TRUE),
(7, 'Cheesecake de Maracuyá', 'Porción de cheesecake artesanal con maracuyá.', 18.00, '/uploads/seed/cheesecake.jpg', 10, TRUE, TRUE),
(8, 'Combo Desayuno + Café', 'Desayuno Origen más un café a elección.', 45.00, '/uploads/seed/combo-desayuno.jpg', NULL, TRUE, TRUE);

-- ============================================================
-- DELIVERY ZONES
-- ============================================================
INSERT INTO delivery_zones (name, cost, estimated_time_minutes, active) VALUES
('Zona Centro', 8.00, 25, TRUE),
('Zona Sur', 12.00, 35, TRUE),
('Zona Norte', 12.00, 35, TRUE);

-- ============================================================
-- PAYMENT METHODS
-- ============================================================
INSERT INTO payment_methods (type, name, active, config) VALUES
('qr', 'Pago con QR', TRUE, JSON_OBJECT(
  'bank', 'Banco de Desarrollo (ejemplo)',
  'account', '1234567890',
  'qr_image', '/uploads/seed/qr-ejemplo.png',
  'instructions', 'Escanea el código QR y sube tu comprobante de pago.'
)),
('cash', 'Efectivo al entregar', TRUE, JSON_OBJECT(
  'instructions', 'Paga en efectivo al recoger o al recibir tu pedido.'
)),
('card', 'Tarjeta (próximamente)', FALSE, JSON_OBJECT(
  'provider', 'pendiente_de_integracion',
  'instructions', 'Estructura preparada para conectar una pasarela de pago real.'
));

-- ============================================================
-- SETTINGS — información general y ubicación de la cafetería
-- ============================================================
INSERT INTO settings (setting_key, setting_value) VALUES
('cafe_name', 'ORIGEN'),
('cafe_slogan', 'Café artesanal, de origen a taza'),
('logo_url', '/uploads/seed/logo-origen.png'),
('address', 'Av. Ejemplo #123, La Paz, Bolivia'),
('latitude', '-16.5000'),
('longitude', '-68.1500'),
('phone', '70000000'),
('whatsapp', '70000000'),
('gmaps_link', 'https://maps.google.com/?q=-16.5000,-68.1500'),
('opening_hours', '{"lun_vie":"07:00-20:00","sab":"08:00-20:00","dom":"08:00-14:00"}'),
('social_facebook', 'https://facebook.com/origen.cafe.dev'),
('social_instagram', 'https://instagram.com/origen.cafe.dev'),
('delivery_min_order', '25.00'),
('delivery_enabled', 'true'),
('pickup_enabled', 'true');

-- ============================================================
-- SAMPLE ORDER (para poder probar el flujo de administración)
-- ============================================================
INSERT INTO delivery_addresses (user_id, recipient_name, phone, address, reference, zone_id, latitude, longitude) VALUES
(2, 'Cliente de Prueba', '70011111', 'Calle Ejemplo #456', 'Frente a la plaza', 1, -16.5010, -68.1490);

INSERT INTO orders (order_number, user_id, customer_name, customer_phone, customer_email, delivery_type, delivery_address_id, payment_method_id, subtotal, discount, delivery_fee, total, status, observations) VALUES
('ORD-2026-0001', 2, 'Cliente de Prueba', '70011111', 'cliente@origen.dev', 'delivery', 1, 1, 38.00, 0.00, 8.00, 46.00, 'confirmado', 'Sin cebolla en el sandwich, por favor.');

INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal) VALUES
(1, 2, 'Cappuccino', 18.00, 1, 18.00),
(1, 7, 'Croissant de Almendra', 15.00, 1, 15.00),
(1, 6, 'Té Verde', 14.00, 1, 14.00);

UPDATE orders SET subtotal = 47.00, total = 55.00 WHERE id = 1;

INSERT INTO payments (order_id, payment_method_id, amount, status, proof_image_url) VALUES
(1, 1, 55.00, 'verificado', '/uploads/seed/comprobante-ejemplo.jpg');

INSERT INTO tickets (order_id, ticket_number) VALUES
(1, 'TCK-2026-0001');
