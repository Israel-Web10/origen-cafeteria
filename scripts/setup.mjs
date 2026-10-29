#!/usr/bin/env node
// Asistente de instalación para DESARROLLO (tu PC). Un solo comando desde la raíz:
//
//   npm run setup          instala, configura backend/.env, crea la base y carga datos
//   npm run doctor         solo revisa y explica qué falta (no cambia nada)
//
// Qué hace, en orden:
//  1. Comprueba Node.js (20 o superior).
//  2. Instala dependencias de backend y frontend si faltan.
//  3. Crea o repara backend/.env (genera JWT_SECRET si falta).
//  4. Prueba la conexión a PostgreSQL y traduce cada error a una instrucción concreta.
//     Si el usuario de .env no existe o la clave falla, ofrece usar el usuario "postgres"
//     (solo en tu PC; en producción se usan los roles de database/roles.sql).
//  5. Crea la base si no existe, aplica migraciones y datos de referencia y, si quieres,
//     datos de demostración.
//
// Nunca muestra contraseñas en pantalla ni las escribe fuera de backend/.env (ignorado por Git).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const ENV_FILE = process.env.SETUP_ENV_FILE || path.join(BACKEND, '.env');
const CHECK_ONLY = process.argv.includes('--check');
const ASSUME_YES = process.argv.includes('--yes');
const isWin = process.platform === 'win32';

const c = { ok: (s) => `\x1b[32m✔\x1b[0m ${s}`, warn: (s) => `\x1b[33m!\x1b[0m ${s}`, err: (s) => `\x1b[31m✖\x1b[0m ${s}`, step: (s) => `\n\x1b[1m${s}\x1b[0m` };
const log = (...a) => console.log(...a);
let problems = 0;

// ---------- utilidades ----------
function ask(question, { hidden = false } = {}) {
  if (!process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      process.stdout.write(question);
      rl._writeToOutput = (s) => { if (s.includes('\n')) rl.output.write('\n'); else rl.output.write('*'.repeat(s.length)); };
      rl.question('', (a) => { rl.close(); resolve(a); });
    } else {
      rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
    }
  });
}
async function confirm(question, def = true) {
  if (ASSUME_YES) return true;
  if (!process.stdin.isTTY) return def;
  const a = (await ask(`${question} ${def ? '(S/n)' : '(s/N)'} `)).toLowerCase();
  return a === '' ? def : ['s', 'si', 'sí', 'y', 'yes'].includes(a);
}
function run(cmd, args, cwd, env = {}) {
  // Comando fijo del propio script (sin datos del usuario): en Windows se pasa como una sola cadena
  const r = isWin
    ? spawnSync([cmd, ...args].join(' '), { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } })
    : spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
  return r.status === 0;
}
function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return null;
  const vars = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}
/** Cambia o agrega claves en backend/.env conservando el resto del archivo y sus comentarios. */
function writeEnv(updates) {
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^\\s*${k}\\s*=.*$`, 'm');
    // Comillas si el valor tiene espacios, # o $ (dotenv los interpretaría); función para que "$" no sea un patrón
    const val = /[\s#"'`$\\]/.test(v) ? (v.includes("'") ? `"${v.replace(/"/g, '\\"')}"` : `'${v}'`) : v;
    text = re.test(text) ? text.replace(re, () => `${k}=${val}`) : `${text.replace(/\s*$/, '\n')}${k}=${val}\n`;
  }
  fs.writeFileSync(ENV_FILE, text);
}

/** Traduce errores de PostgreSQL a instrucciones. */
function explain(err, cfg) {
  const where = `${cfg.host}:${cfg.port}`;
  switch (err.code) {
    case 'ECONNREFUSED': return { kind: 'down', msg: `PostgreSQL no responde en ${where}. ¿Está instalado y encendido? En Windows: Servicios → "postgresql-x64-17" → Iniciar (o revisa DB_PORT en backend/.env; por defecto es 5432).` };
    case 'ENOTFOUND': return { kind: 'down', msg: `No se encuentra el servidor "${cfg.host}". En tu PC usa DB_HOST=localhost.` };
    case '28P01': return { kind: 'auth', msg: `PostgreSQL rechazó el usuario "${cfg.user}" (contraseña incorrecta o el usuario no existe).` };
    case '28000': return { kind: 'auth', msg: `El usuario "${cfg.user}" no existe en PostgreSQL (se crea con database/roles.sql).` };
    case '3D000': return { kind: 'nodb', msg: `La base "${cfg.database}" todavía no existe.` };
    default: return { kind: 'other', msg: `${err.code || ''} ${err.message}`.trim() };
  }
}

async function tryConnect(pg, cfg) {
  const client = new pg.Client({ ...cfg, connectionTimeoutMillis: 5000 });
  try { await client.connect(); await client.query('SELECT 1'); return null; } catch (e) { return e; } finally { await client.end().catch(() => {}); }
}

// ---------- pasos ----------
async function main() {
  log(c.step(CHECK_ONLY ? 'ORIGEN · diagnóstico' : 'ORIGEN · instalación para desarrollo'));

  // 1. Node
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) { log(c.err(`Necesitas Node.js 20 o superior (tienes ${process.versions.node}). Descárgalo de https://nodejs.org (versión LTS).`)); process.exit(1); }
  log(c.ok(`Node.js ${process.versions.node}`));

  // 2. Dependencias
  for (const [name, dir] of [['backend', BACKEND], ['frontend', FRONTEND]]) {
    if (fs.existsSync(path.join(dir, 'node_modules'))) { log(c.ok(`Dependencias de ${name} instaladas`)); continue; }
    if (CHECK_ONLY) { log(c.err(`Faltan las dependencias de ${name}: ejecuta "npm run setup"`)); problems++; continue; }
    log(c.warn(`Instalando dependencias de ${name} (puede tardar unos minutos)…`));
    if (!run('npm', ['install', '--no-fund', '--no-audit'], dir)) { log(c.err(`Falló "npm install" en ${name}. Revisa tu conexión a Internet y vuelve a ejecutar.`)); process.exit(1); }
  }
  const req = createRequire(path.join(BACKEND, 'package.json'));
  const pg = req('pg');

  // 3. backend/.env
  let env = readEnv();
  if (!env) {
    if (CHECK_ONLY) { log(c.err('No existe backend/.env: ejecuta "npm run setup"')); process.exit(1); }
    fs.copyFileSync(path.join(BACKEND, '.env.example'), ENV_FILE);
    log(c.ok('Creado backend/.env a partir de .env.example'));
    env = readEnv();
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    if (CHECK_ONLY) { log(c.err('JWT_SECRET vacío o corto en backend/.env (por eso el backend no arranca)')); problems++; }
    else { writeEnv({ JWT_SECRET: randomBytes(48).toString('base64') }); log(c.ok('JWT_SECRET generado en backend/.env')); }
  } else log(c.ok('JWT_SECRET configurado'));
  env = readEnv();

  // 4. Conexión a PostgreSQL
  const cfg = {
    host: process.env.DB_HOST || env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || env.DB_PORT || 5432),
    user: process.env.DB_USER || env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ?? env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || env.DB_NAME || 'origen_cafeteria',
  };
  let err = await tryConnect(pg, cfg);
  let info = err && explain(err, cfg);

  if (info?.kind === 'down' || info?.kind === 'other') { log(c.err(info.msg)); process.exit(1); }

  if (info?.kind === 'nodb' || info?.kind === 'auth') {
    log(c.warn(info.msg));
    if (CHECK_ONLY) { log('  → Ejecuta "npm run setup" y el asistente lo resuelve.'); process.exit(1); }
    // ¿El usuario actual puede crear la base?
    let admin = info.kind === 'nodb' ? { ...cfg, database: 'postgres' } : null;
    if (admin && (await tryConnect(pg, admin))) admin = null;
    if (!admin) {
      log('  Para tu PC lo más simple es usar el usuario "postgres" (el que creaste al instalar PostgreSQL).');
      if (!(await confirm('  ¿Configurar ORIGEN con el usuario postgres?'))) { log('  Sin cambios. Revisa backend/.env o docs/GUIA-VSCODE.md.'); process.exit(1); }
      const pw = process.env.PGPASSWORD || (await ask('  Contraseña del usuario postgres: ', { hidden: true }));
      admin = { ...cfg, user: 'postgres', password: pw, database: 'postgres' };
      const e2 = await tryConnect(pg, admin);
      if (e2) { log(c.err(explain(e2, admin).msg + ' Vuelve a intentarlo.')); process.exit(1); }
      writeEnv({ DB_USER: 'postgres', DB_PASSWORD: pw, DB_HOST: cfg.host, DB_PORT: String(cfg.port), DB_NAME: cfg.database });
      Object.assign(cfg, { user: 'postgres', password: pw });
      log(c.ok('backend/.env actualizado para usar el usuario postgres'));
    }
    const a = new pg.Client(admin);
    await a.connect();
    const exists = await a.query('SELECT 1 FROM pg_database WHERE datname = $1', [cfg.database]);
    if (!exists.rowCount) {
      if (!/^[a-z_][a-z0-9_]*$/.test(cfg.database)) { log(c.err(`Nombre de base no válido: ${cfg.database}`)); process.exit(1); }
      await a.query(`CREATE DATABASE ${cfg.database}`); // nombre validado arriba
      log(c.ok(`Base "${cfg.database}" creada`));
    }
    await a.end();
    err = await tryConnect(pg, cfg);
    if (err) { log(c.err(explain(err, cfg).msg)); process.exit(1); }
  }
  log(c.ok(`Conectado a PostgreSQL ${cfg.host}:${cfg.port} / ${cfg.database} como "${cfg.user}"`));

  // Estado de migraciones
  const db = new pg.Client(cfg);
  await db.connect();
  const migrated = (await db.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t;
  const products = migrated ? (await db.query("SELECT to_regclass('public.products') AS t")).rows[0].t && Number((await db.query('SELECT COUNT(*) FROM products')).rows[0].count) : 0;
  await db.end();

  if (CHECK_ONLY) {
    log(migrated ? c.ok('Tablas creadas (migraciones aplicadas)') : c.err('Faltan las tablas: ejecuta "npm run setup"'));
    if (!migrated) problems++;
    log(products ? c.ok(`${products} producto(s) en la carta`) : c.warn('La carta está vacía (cárgala desde el panel o con datos de demostración)'));
    log('');
    log(problems ? c.err(`${problems} problema(s). Ejecuta "npm run setup".`) : c.ok('Todo listo. Arranca con "npm run dev".'));
    process.exit(problems ? 1 : 0);
  }

  // 5. Migraciones y datos
  const childEnv = { DB_HOST: cfg.host, DB_PORT: String(cfg.port), DB_USER: cfg.user, DB_PASSWORD: cfg.password, DB_NAME: cfg.database, JWT_SECRET: readEnv().JWT_SECRET };
  log(c.step('Creando tablas y datos de referencia…'));
  if (!run('node', ['scripts/migrate.js'], BACKEND, childEnv) || !run('node', ['scripts/seed-reference.js'], BACKEND, childEnv)) {
    log(c.err('Falló la creación de tablas. Copia el mensaje de arriba para revisarlo.')); process.exit(1);
  }
  if (!products && (await confirm('\n¿Cargar datos de DEMOSTRACIÓN (19 productos con fotos, pedidos de ejemplo y cuentas @origen.dev)?'))) {
    run('node', ['scripts/seed-dev.js', '--with-history'], BACKEND, childEnv);
    log(c.ok('Datos de demostración cargados. Cuentas de prueba: ver backend/scripts/seed-dev.js (línea 8).'));
  }

  log(c.step('Listo.'));
  log('  1. Arranca todo:      npm run dev');
  log('  2. Abre la web:       http://localhost:5173');
  log('  3. Panel del gerente: http://localhost:5173/login');
}

main().catch((e) => { log(c.err(e.message)); process.exit(1); });
