#!/usr/bin/env node
// Detector de secretos: evita subir claves, contraseñas o archivos .env al repositorio.
//   node scripts/check-secrets.mjs          → revisa los archivos preparados para commit (git add)
//   node scripts/check-secrets.mjs --all    → revisa todos los archivos versionados
// Lo ejecuta automáticamente el hook .githooks/pre-commit.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const all = process.argv.includes('--all');
const files = execSync(all ? 'git ls-files' : 'git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  .split('\n').map((f) => f.trim()).filter(Boolean);

// Archivos que nunca deben versionarse
const FORBIDDEN_FILES = [/(^|\/)\.env$/, /(^|\/)\.env\.(local|production|development)$/, /\.dump$/, /\.pem$/, /\.key$/, /(^|\/)id_rsa/, /\.p12$/, /\.pfx$/];

// Patrones de secretos conocidos (valores reales, no nombres de variables vacías)
const PATTERNS = [
  ['Clave privada', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['Clave de AWS', /AKIA[0-9A-Z]{16}/],
  ['Token de GitHub', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['Clave de Anthropic/OpenAI', /sk-(ant-)?[A-Za-z0-9_-]{24,}/],
  ['Clave de Stripe', /(sk|rk)_live_[A-Za-z0-9]{20,}/],
  ['Clave de Google', /AIza[0-9A-Za-z_-]{35}/],
  ['URL de base de datos con contraseña', /postgres(ql)?:\/\/[^:\s/]+:[^@\s]{6,}@(?!host|localhost|usuario)/i],
  ['JWT_SECRET con valor', /JWT_SECRET\s*=\s*[A-Za-z0-9+/=_-]{24,}/],
  // Ignora marcadores de ejemplo: <...>, "contraseña...", cambia..., CAMBIAR..., tu_..., $variable
  ['Contraseña con valor', /(DB_PASSWORD|S3_SECRET_ACCESS_KEY|ADMIN_PASSWORD)\s*=\s*(?!["']?(<|cambia|CAMBIAR|contrase|tu_|\$|\.\.\.))["']?[^\s"';]{8,}/],
];
const SKIP = [/package-lock\.json$/, /\.(mp4|webm|webp|png|jpe?g|gif|ico|pdf|woff2?)$/i, /scripts\/check-secrets\.mjs$/];

const problems = [];
for (const file of files) {
  if (FORBIDDEN_FILES.some((re) => re.test(file)) && !file.endsWith('.example')) {
    problems.push(`${file}: este tipo de archivo no debe versionarse`);
    continue;
  }
  if (SKIP.some((re) => re.test(file)) || !existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [name, re] of PATTERNS) if (re.test(line)) problems.push(`${file}:${i + 1}: posible ${name}`);
  });
}

if (problems.length) {
  console.error('✖ Se detectaron posibles secretos. El commit se detuvo:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nMueve los valores a un archivo .env (ignorado por git) y usa .env.example solo con ejemplos.');
  process.exit(1);
}
console.log(`✔ Sin secretos en ${files.length} archivo(s) revisado(s).`);
