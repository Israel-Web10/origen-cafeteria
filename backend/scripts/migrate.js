#!/usr/bin/env node
// Ejecuta las migraciones pendientes de backend/migrations en orden.
// Cada archivo se aplica una sola vez, dentro de una transacción, y queda
// registrado en schema_migrations con su checksum. Si alguien modifica una
// migración ya aplicada, el script se detiene (las migraciones son inmutables:
// para cambiar algo se crea una nueva).
//
// Uso:  npm run migrate            (aplica pendientes)
//       npm run migrate -- --status (solo muestra el estado)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(32); // no se usa aquí
const { buildConfig } = require('../src/config/db');

const DIR = path.join(__dirname, '..', 'migrations');

async function main() {
  const statusOnly = process.argv.includes('--status');
  const client = new Client(buildConfig());
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(200) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    // Evita que dos procesos migren a la vez (p. ej. dos instancias arrancando).
    await client.query('SELECT pg_advisory_lock(727001)');

    const applied = new Map(
      (await client.query('SELECT name, checksum FROM schema_migrations')).rows.map((r) => [r.name, r.checksum])
    );
    const files = fs.readdirSync(DIR).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();

    let pending = 0;
    for (const file of files) {
      const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`La migración ${file} cambió después de aplicarse. Crea una migración nueva en su lugar.`);
        }
        if (statusOnly) console.log(`  aplicada   ${file}`);
        continue;
      }
      pending++;
      if (statusOnly) { console.log(`  PENDIENTE  ${file}`); continue; }
      process.stdout.write(`  aplicando  ${file} ... `);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('ERROR');
        throw err;
      }
    }
    console.log(statusOnly ? `${pending} migración(es) pendiente(s).` : pending ? 'Migraciones aplicadas.' : 'La base de datos ya está al día.');
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n[migrate] ${err.message}`);
  process.exit(1);
});
