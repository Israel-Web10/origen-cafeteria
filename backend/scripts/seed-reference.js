#!/usr/bin/env node
// Datos de referencia necesarios TAMBIÉN en producción. Idempotente: solo
// inserta lo que falta y nunca sobrescribe lo que el gerente ya editó.
//  - Monedas (BOB base habilitada; USD/EUR deshabilitadas, sin tipo de cambio:
//    el gerente debe cargarlo indicando fecha y fuente)
//  - Métodos de pago: efectivo activo; QR inactivo hasta subir el QR oficial;
//    tarjeta inactiva (no hay proveedor real configurado)
//  - Páginas editables (plantillas)
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(32);
const { pool } = require('../src/config/db');
const pages = require('../content/defaultPages');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO currencies (code, name, symbol, decimals, enabled, is_base) VALUES
        ('BOB', 'Boliviano', 'Bs', 2, TRUE, TRUE),
        ('USD', 'Dólar estadounidense', 'US$', 2, FALSE, FALSE),
        ('EUR', 'Euro', '€', 2, FALSE, FALSE)
      ON CONFLICT (code) DO NOTHING`);

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM payment_methods');
    if (rows[0].n === 0) {
      await client.query(`
        INSERT INTO payment_methods (type, name, active, display_order, config, translations) VALUES
          ('cash', 'Efectivo', TRUE, 1,
            '{"instructions":"Paga en efectivo al recoger tu pedido o al recibirlo.","instructions_en":"Pay cash on pickup or delivery.","instructions_fr":"Payez en espèces au retrait ou à la livraison.","cash_on_pickup":true,"cash_on_delivery":true}',
            '{"en":{"name":"Cash"},"fr":{"name":"Espèces"}}'),
          ('qr', 'QR bancario', FALSE, 2,
            '{"instructions":"Escanea el QR desde la app de tu banco por el monto exacto e informa la referencia de la operación.","instructions_en":"Scan the QR with your banking app for the exact amount and enter the transaction reference.","instructions_fr":"Scannez le QR avec votre application bancaire pour le montant exact et indiquez la référence."}',
            '{"en":{"name":"Bank QR"},"fr":{"name":"QR bancaire"}}'),
          ('card', 'Tarjeta', FALSE, 3, '{}', '{"en":{"name":"Card"},"fr":{"name":"Carte"}}')`);
    }

    let inserted = 0;
    for (const [slug, locales] of Object.entries(pages)) {
      for (const [locale, page] of Object.entries(locales)) {
        const r = await client.query(
          `INSERT INTO pages (slug, locale, title, body, published, version) VALUES ($1, $2, $3, $4, TRUE, 1)
           ON CONFLICT (slug, locale) DO NOTHING`,
          [slug, locale, page.title, page.body]
        );
        inserted += r.rowCount;
      }
    }
    await client.query('COMMIT');
    console.log(`Datos de referencia listos (${inserted} página(s) nueva(s)).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed-reference]', err.message);
  process.exit(1);
});
