#!/usr/bin/env node
// Arranca API y web a la vez en UNA terminal:  npm run dev   (desde la raíz)
// Ctrl + C detiene las dos. Cada línea lleva su prefijo: [api] o [web].
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

if (!fs.existsSync(path.join(ROOT, 'backend', '.env')) || !fs.existsSync(path.join(ROOT, 'backend', 'node_modules')) || !fs.existsSync(path.join(ROOT, 'frontend', 'node_modules'))) {
  console.log('\x1b[33m!\x1b[0m Falta la instalación. Ejecuta primero:  npm run setup');
  process.exit(1);
}

const children = [];
function start(name, dir, color) {
  const opts = { cwd: path.join(ROOT, dir), env: { ...process.env, FORCE_COLOR: '1' } };
  const child = isWin ? spawn('npm run dev', { ...opts, shell: true }) : spawn('npm', ['run', 'dev'], opts);
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) out.write(prefix + l + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`${prefix}se detuvo (código ${code}). Si es la API, prueba "npm run doctor".`);
      stop();
    }
  });
  children.push(child);
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (c.exitCode !== null) continue;
    // En Windows hay que cerrar el árbol de procesos (npm → node)
    if (isWin) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    else c.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start('api', 'backend', '36');
start('web', 'frontend', '35');

// Aviso cuando la API responde
const t0 = Date.now();
const timer = setInterval(async () => {
  try {
    const r = await fetch('http://localhost:4000/api/v1/health');
    if (r.ok) {
      clearInterval(timer);
      console.log('\n\x1b[32m✔ Listo:\x1b[0m web http://localhost:5173  ·  panel http://localhost:5173/login  ·  Ctrl + C para detener\n');
    }
  } catch { /* aún arrancando */ }
  if (Date.now() - t0 > 60_000) { clearInterval(timer); console.log('\x1b[33m!\x1b[0m La API no respondió en 60 s. Revisa los mensajes [api] o ejecuta "npm run doctor".'); }
}, 1500);
