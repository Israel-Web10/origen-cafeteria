// Prepara una base de datos de PRUEBAS aislada (nunca la de desarrollo ni producción).
// Variables: TEST_DATABASE_URL o DB_* con DB_NAME terminado en "_test".
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'origen_test';
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
process.env.CARD_PROVIDER = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'origen-uploads-'));

if (!/_test$/.test(process.env.DB_NAME) && !process.env.TEST_DATABASE_URL) {
  throw new Error('Las pruebas solo se ejecutan contra una base cuyo nombre termina en _test.');
}

const { pool } = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const env = { ...process.env };
  const root = path.join(__dirname, '..');
  execFileSync(process.execPath, ['scripts/migrate.js'], { cwd: root, env, stdio: 'pipe' });
  execFileSync(process.execPath, ['scripts/seed-reference.js'], { cwd: root, env, stdio: 'pipe' });
}

async function createUser(role, email, password = 'Password123') {
  const hash = await bcrypt.hash(password, 4);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [`${role} test`, email, hash, role, '70012345']
  );
  return { id: rows[0].id, email, password };
}

// PNG 1x1 válido
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

module.exports = { pool, resetDatabase, createUser, PNG_1PX };
