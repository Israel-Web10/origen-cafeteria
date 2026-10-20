// Logger mínimo en JSON (una línea por evento), apto para cualquier recolector
// de logs. Nunca registrar contraseñas, tokens, comprobantes ni datos de tarjeta.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;
const silent = process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS;

function write(level, event, data) {
  if (silent || LEVELS[level] < threshold) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...data });
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

module.exports = {
  debug: (e, d) => write('debug', e, d),
  info: (e, d) => write('info', e, d),
  warn: (e, d) => write('warn', e, d),
  error: (e, d) => write('error', e, d),
};
