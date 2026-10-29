#!/usr/bin/env node
// Crea la PRIMERA cuenta de administrador en producción (sin credenciales
// predeterminadas en el código ni en el repositorio).
//
// Uso:  npm run create-admin -- --email gerente@tu-dominio.com --name "Nombre"
// La contraseña se pide por teclado (no queda en el historial de la terminal).
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(32);
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function main() {
  const email = arg('email');
  const name = arg('name') || 'Administrador';
  const role = arg('role') === 'manager' ? 'manager' : 'admin';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Indica un correo válido con --email');
  const password = process.env.ADMIN_PASSWORD || (await askHidden('Contraseña (mín. 10 caracteres, letras y números): '));
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('La contraseña debe tener al menos 10 caracteres e incluir letras y números.');
  }
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, lower($2), $3, $4)
     ON CONFLICT (lower(email)) DO NOTHING RETURNING id`,
    [name, email, hash, role]
  );
  console.log(rows.length ? `Cuenta ${role} creada para ${email}.` : `Ya existe una cuenta con ${email}; no se modificó.`);
}

main()
  .catch((err) => { console.error('[create-admin]', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
