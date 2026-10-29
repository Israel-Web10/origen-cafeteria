#!/usr/bin/env node
// Prueba de humo: revisa una web publicada como lo haría un cliente, en ~30 segundos.
//
//   npm run smoke -- https://tu-web.vercel.app            (o http://localhost:5173)
//   npm run smoke -- https://tu-web.vercel.app --carga 50  (+ 50 visitas simultáneas a la carta)
//
// Solo hace lecturas (GET): no crea pedidos ni cuentas. Termina con código 1 si algo falla,
// así también sirve en un pipeline de despliegue.
const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || '').replace(/\/$/, '');
const loadIdx = args.indexOf('--carga');
const load = loadIdx > -1 ? Math.min(200, Number(args[loadIdx + 1]) || 50) : 0;
if (!base) {
  console.log('Uso: npm run smoke -- https://tu-web.com [--carga 50]');
  process.exit(2);
}

let failed = 0;
const ok = (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`);
const bad = (m) => { failed++; console.log(`\x1b[31m✖\x1b[0m ${m}`); };
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);

async function get(path, { json = false } = {}) {
  const t0 = performance.now();
  const res = await fetch(base + path, { headers: { 'User-Agent': 'origen-smoke/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const ms = Math.round(performance.now() - t0);
  const body = json ? await res.json().catch(() => null) : await res.text();
  return { res, ms, body };
}

async function check(name, fn) {
  try { await fn(); } catch (e) { bad(`${name}: ${e.name === 'TimeoutError' ? 'sin respuesta en 15 s' : e.message}`); }
}

console.log(`\nPrueba de humo de ${base}\n`);

await check('API', async () => {
  const { res, ms, body } = await get('/api/v1/health', { json: true });
  if (res.ok && body?.db === 'ok') ok(`API y base de datos responden (${ms} ms)`);
  else bad(`/api/v1/health → ${res.status} ${JSON.stringify(body)}`);
  if (ms > 3000) warn('La primera respuesta tardó más de 3 s: ¿el servidor gratuito estaba "dormido"?');
});

await check('Carta', async () => {
  const { res, ms, body } = await get('/api/v1/products?limit=50', { json: true });
  const n = body?.products?.length ?? 0;
  if (res.ok && n > 0) ok(`Carta con ${n} producto(s) (${ms} ms)`);
  else if (res.ok) warn('La carta está vacía: carga productos desde el panel');
  else bad(`/api/v1/products → ${res.status}`);
  const missing = (body?.products || []).filter((p) => !p.image_url).map((p) => p.name);
  if (missing.length) warn(`Productos sin foto: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
});

await check('Configuración', async () => {
  const { res, body } = await get('/api/v1/settings', { json: true });
  if (!res.ok) return bad(`/api/v1/settings → ${res.status}`);
  ok('Configuración pública disponible');
  const s = body.settings || {};
  if (!s.address || /ejemplo/i.test(s.address)) warn('Dirección de ejemplo: complétala en Configuración → Negocio');
  if (!s.phone && !s.whatsapp) warn('Sin teléfono ni WhatsApp de contacto');
});

// Rutas de la web (SPA): cada una debe devolver la página, no un 404 del hosting
for (const path of ['/', '/carta', '/visitanos', '/historia', '/promociones', '/login', '/legal/privacy']) {
  await check(path, async () => {
    const { res, ms, body } = await get(path);
    if (res.ok && /<div id="root">/.test(body)) ok(`${path} carga (${ms} ms)`);
    else bad(`${path} → ${res.status}${res.ok ? ' (no es la web)' : ''}. Revisa las reglas de reescritura del hosting`);
  });
}

await check('Cabeceras', async () => {
  const { res } = await get('/');
  const h = res.headers;
  if (base.startsWith('https://')) {
    if (h.get('strict-transport-security')) ok('HTTPS con HSTS'); else warn('Falta Strict-Transport-Security');
  }
  if (h.get('content-security-policy')) ok('Content-Security-Policy presente'); else warn('Falta Content-Security-Policy (ver vercel.json / _headers / Nginx)');
  if (h.get('x-content-type-options') === 'nosniff') ok('X-Content-Type-Options: nosniff'); else warn('Falta X-Content-Type-Options');
});

await check('Errores controlados', async () => {
  const { res, body } = await get('/api/v1/products/no-existe-este-producto', { json: true });
  if (res.status === 404 && body?.code) ok('Un producto inexistente devuelve 404 con mensaje claro');
  else bad(`Producto inexistente → ${res.status}`);
});

if (load) {
  await check('Carga', async () => {
    const t0 = performance.now();
    const results = await Promise.all(Array.from({ length: load }, () => get('/api/v1/products?limit=24').then((r) => r.res.status).catch(() => 0)));
    const ms = Math.round(performance.now() - t0);
    const errors = results.filter((s) => s !== 200).length;
    const limited = results.filter((s) => s === 429).length;
    if (!errors) ok(`${load} visitas simultáneas a la carta sin errores (${ms} ms en total)`);
    else if (limited === errors) warn(`${limited} de ${load} recibieron 429: el límite por IP funciona (todas salen de tu IP)`);
    else bad(`${errors} de ${load} visitas fallaron (${ms} ms)`);
  });
}

console.log(failed ? `\n\x1b[31m${failed} problema(s).\x1b[0m` : '\n\x1b[32mTodo en orden.\x1b[0m');
process.exit(failed ? 1 : 0);
