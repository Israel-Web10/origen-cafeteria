// Micro-caché de lecturas públicas: no requiere base de datos.
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
const express = require('express');
const request = require('supertest');
const cache = require('../src/middleware/microCache');

function buildApp(ttl) {
  let calls = 0;
  const app = express();
  app.use(cache.microCache(ttl));
  app.get('/items', (req, res) => { calls++; res.set('Cache-Control', 'public, max-age=30'); res.json({ n: calls, q: req.query.q || null }); });
  app.get('/fail', (req, res) => { calls++; res.status(500).json({ n: calls }); });
  return { app, calls: () => calls };
}

test('micro-caché: sirve lecturas anónimas repetidas desde memoria', async () => {
  cache.clear();
  const { app, calls } = buildApp(5000);
  const a = await request(app).get('/items');
  const b = await request(app).get('/items');
  assert.equal(a.headers['x-cache'], 'MISS');
  assert.equal(b.headers['x-cache'], 'HIT');
  assert.deepEqual(b.body, a.body);
  assert.equal(b.headers['cache-control'], 'public, max-age=30');
  assert.equal(calls(), 1);
  // Otra query string es otra entrada
  await request(app).get('/items?q=latte');
  assert.equal(calls(), 2);
});

test('micro-caché: nunca cachea peticiones autenticadas ni errores', async () => {
  cache.clear();
  const { app, calls } = buildApp(5000);
  await request(app).get('/items').set('Authorization', 'Bearer abc');
  await request(app).get('/items').set('Authorization', 'Bearer abc');
  assert.equal(calls(), 2);
  await request(app).get('/fail');
  await request(app).get('/fail');
  assert.equal(calls(), 4);
});

test('micro-caché: clear() invalida y TTL 0 la desactiva', async () => {
  cache.clear();
  const { app, calls } = buildApp(5000);
  await request(app).get('/items');
  cache.clear();
  await request(app).get('/items');
  assert.equal(calls(), 2);
  const off = buildApp(0);
  await request(off.app).get('/items');
  await request(off.app).get('/items');
  assert.equal(off.calls(), 2);
});

test('micro-caché: tamaño acotado ante URLs aleatorias', async () => {
  cache.clear();
  const { app } = buildApp(5000);
  for (let i = 0; i < 520; i++) await request(app).get(`/items?q=${i}`);
  assert.ok(cache.size() <= 500);
});

test('micro-caché: 50 peticiones simultáneas sin caché → una sola consulta (sin estampida)', async () => {
  cache.clear();
  let calls = 0;
  const app = express();
  app.use(cache.microCache(5000));
  app.get('/slow', async (req, res) => { calls++; await new Promise((r) => setTimeout(r, 80)); res.json({ ok: true }); });
  const results = await Promise.all(Array.from({ length: 50 }, () => request(app).get('/slow')));
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.status === 200 && r.body.ok));
  assert.ok(results.some((r) => r.headers['x-cache'] === 'COALESCED'));
});

test('micro-caché: una lectura iniciada antes de una edición no guarda datos viejos', async () => {
  cache.clear();
  let calls = 0;
  const app = express();
  app.use(cache.microCache(5000));
  app.get('/data', async (req, res) => {
    calls++;
    if (calls === 1) cache.clear(); // el gerente guarda un cambio mientras esta lectura está en curso
    await new Promise((r) => setTimeout(r, 20));
    res.json({ v: calls });
  });
  await request(app).get('/data');
  const after = await request(app).get('/data');
  assert.equal(after.headers['x-cache'], 'MISS');
  assert.equal(calls, 2);
});
