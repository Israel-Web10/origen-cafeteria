// Verifica el controlador S3 con un cliente simulado (sin red ni credenciales reales).
// No sustituye una prueba contra un bucket real: ver docs/DESPLIEGUE.md antes de activarlo.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('controlador S3: rutas public/private, URL pública y lectura', () => {
  const script = `
    const Module = require('module');
    const store = new Map();
    const fake = {
      S3Client: class { async send(cmd) { return cmd.run(); } },
      PutObjectCommand: class { constructor(p) { this.run = async () => { store.set(p.Key, { body: p.Body, type: p.ContentType, cache: p.CacheControl }); }; } },
      DeleteObjectCommand: class { constructor(p) { this.run = async () => { store.delete(p.Key); }; } },
      GetObjectCommand: class { constructor(p) { this.run = async () => { const o = store.get(p.Key); if (!o) throw new Error('NoSuchKey'); return { Body: { transformToByteArray: async () => new Uint8Array(o.body) } }; }; } },
    };
    const orig = Module._load;
    Module._load = function (req, ...rest) { return req === '@aws-sdk/client-s3' ? fake : orig.call(this, req, ...rest); };
    const storage = require('./src/services/storageService');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    (async () => {
      const pub = await storage.saveImage({ buffer: png }, 'public');
      const priv = await storage.saveImage({ buffer: png }, 'private');
      const read = await storage.read('private', priv.key);
      const out = {
        driver: storage.driverName,
        pubUrl: pub.url, pubKeyStored: store.has('public/' + pub.key), pubCache: store.get('public/' + pub.key).cache,
        privUrl: priv.url, privStored: store.has('private/' + priv.key), privCache: store.get('private/' + priv.key).cache,
        readOk: read && read.buffer.equals(png) && read.mime === 'image/png',
        own: storage.isOwnPublicUrl(pub.url), foreign: storage.isOwnPublicUrl('https://evil.example/public/2026-10/' + 'a'.repeat(32) + '.png'),
        traversal: await storage.read('private', '../../etc/passwd'),
      };
      await storage.remove('private', priv.key);
      out.removed = !store.has('private/' + priv.key);
      console.log(JSON.stringify(out));
    })();
  `;
  const res = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env, NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(40), STORAGE_DRIVER: 's3', S3_BUCKET: 'origen-test',
      S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test', S3_PUBLIC_BASE_URL: 'https://media.example.com/',
    },
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout.trim().split('\n').pop());
  assert.equal(out.driver, 's3');
  assert.match(out.pubUrl, /^https:\/\/media\.example\.com\/public\/\d{4}-\d{2}\/[a-f0-9]{32}\.png$/);
  assert.equal(out.pubKeyStored, true);
  assert.match(out.pubCache, /public/);
  assert.equal(out.privUrl, null);
  assert.equal(out.privStored, true);
  assert.match(out.privCache, /private/);
  assert.equal(out.readOk, true);
  assert.equal(out.own, true);
  assert.equal(out.foreign, false);
  assert.equal(out.traversal, null);
  assert.equal(out.removed, true);
});
