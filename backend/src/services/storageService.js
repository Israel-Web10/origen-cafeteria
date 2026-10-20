// Almacenamiento de archivos subidos, con dos controladores intercambiables:
//
//  STORAGE_DRIVER=local (por defecto)
//    Disco en UPLOAD_DIR, dividido en public/ (servido en /uploads/public) y
//    private/ (comprobantes de pago; NUNCA servido estáticamente).
//    Adecuado para un VPS con disco persistente. En plataformas con disco
//    efímero (Render, Railway, Fly sin volumen) los archivos se perderían.
//
//  STORAGE_DRIVER=s3
//    Cualquier servicio compatible con S3 (Cloudflare R2, Backblaze B2, AWS S3).
//    Objetos públicos bajo "public/" (servidos desde S3_PUBLIC_BASE_URL) y
//    privados bajo "private/" (solo se leen a través de la API autorizada).
//    Requiere crear el bucket y las credenciales: puede tener costos (ver docs).
//
// En ambos casos el tipo de archivo se valida por su firma binaria antes de guardar.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { badRequest } = require('../utils/errors');

const ROOT = env.uploadRoot;
const DIRS = { public: path.join(ROOT, 'public'), private: path.join(ROOT, 'private') };
const KEY_RE = /^[0-9]{4}-[0-9]{2}\/[a-f0-9]{32}\.(jpg|png|webp)$/;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// ---------------- Validación ----------------

/**
 * Detecta el tipo REAL por su firma binaria. No se confía en el nombre ni en
 * el Content-Type enviados por el navegador. SVG/HTML/GIF no se aceptan.
 */
function sniffImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

/** Lee ancho/alto de PNG, JPEG o WEBP sin dependencias (solo cabeceras). */
function imageSize(buf, ext) {
  try {
    if (ext === 'png') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (ext === 'webp') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
    }
    if (ext === 'jpg') {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* cabecera truncada */
  }
  return null;
}

const MAX_DIMENSION = 8000;
const validKey = (key) => typeof key === 'string' && KEY_RE.test(key);

// ---------------- Controlador local ----------------

function localPath(visibility, key) {
  if (!validKey(key)) return null;
  const full = path.resolve(DIRS[visibility], key);
  return full.startsWith(DIRS[visibility] + path.sep) ? full : null; // sin path traversal
}

const localDriver = {
  name: 'local',
  init() {
    for (const dir of Object.values(DIRS)) fs.mkdirSync(dir, { recursive: true });
  },
  async put(visibility, key, buffer) {
    const target = localPath(visibility, key);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, buffer, { flag: 'wx' });
  },
  async remove(visibility, key) {
    const full = localPath(visibility, key);
    if (full) await fsp.unlink(full).catch(() => {});
  },
  async read(visibility, key) {
    const full = localPath(visibility, key);
    if (!full) return null;
    try { return await fsp.readFile(full); } catch { return null; }
  },
  publicUrl: (key) => `/uploads/public/${key}`,
};

// ---------------- Controlador S3 / R2 / B2 ----------------

function makeS3Driver() {
  // Carga diferida: el SDK solo se requiere si se usa este controlador.
  const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
  const required = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_BASE_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[storage] STORAGE_DRIVER=s3 requiere: ${missing.join(', ')}`);
    process.exit(1);
  }
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  });
  const Bucket = process.env.S3_BUCKET;
  const base = process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '');
  const objectKey = (visibility, key) => `${visibility}/${key}`;
  return {
    name: 's3',
    init() {},
    async put(visibility, key, buffer) {
      await client.send(new PutObjectCommand({
        Bucket, Key: objectKey(visibility, key), Body: buffer, ContentType: MIME[key.split('.').pop()],
        CacheControl: visibility === 'public' ? 'public, max-age=2592000, immutable' : 'private, no-store',
      }));
    },
    async remove(visibility, key) {
      if (!validKey(key)) return;
      await client.send(new DeleteObjectCommand({ Bucket, Key: objectKey(visibility, key) })).catch(() => {});
    },
    async read(visibility, key) {
      if (!validKey(key)) return null;
      try {
        const res = await client.send(new GetObjectCommand({ Bucket, Key: objectKey(visibility, key) }));
        return Buffer.from(await res.Body.transformToByteArray());
      } catch {
        return null;
      }
    },
    // Las URLs públicas apuntan al dominio público del bucket (p. ej. un subdominio propio en R2)
    publicUrl: (key) => `${base}/public/${key}`,
  };
}

const driver = (process.env.STORAGE_DRIVER || 'local') === 's3' ? makeS3Driver() : localDriver;
driver.init();

// ---------------- API común ----------------

/** Valida y guarda una imagen recibida en memoria. visibility: 'public' | 'private' */
async function saveImage(file, visibility = 'public') {
  if (!file || !file.buffer) throw badRequest('file_missing', 'No se recibió ningún archivo.');
  const type = sniffImage(file.buffer);
  if (!type) throw badRequest('file_type', 'Tipo de archivo no permitido. Usa JPG, PNG o WEBP.');
  const size = imageSize(file.buffer, type.ext);
  if (!size || size.width < 1 || size.height < 1 || size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) {
    throw badRequest('file_dimensions', `La imagen es inválida o supera ${MAX_DIMENSION}px por lado.`);
  }
  const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  await driver.put(visibility, key, file.buffer);
  return { key, visibility, mime: type.mime, url: visibility === 'public' ? driver.publicUrl(key) : null, ...size };
}

const remove = (visibility, key) => driver.remove(visibility, key);

/** Lee un archivo (p. ej. un comprobante privado) y devuelve { buffer, mime } o null. */
async function read(visibility, key) {
  const buffer = await driver.read(visibility, key);
  return buffer ? { buffer, mime: MIME[String(key).split('.').pop()] } : null;
}

/** Extrae la clave de una URL pública generada por cualquiera de los controladores. */
function keyFromPublicUrl(url) {
  const m = /\/public\/(\d{4}-\d{2}\/[a-f0-9]{32}\.(?:jpg|png|webp))$/.exec(url || '');
  return m ? m[1] : null;
}

/** ¿La URL pertenece a nuestro almacenamiento público? (para validar configuración) */
function isOwnPublicUrl(url) {
  return keyFromPublicUrl(url) !== null && (url.startsWith('/uploads/public/') || url.startsWith(driver.publicUrl('')));
}

module.exports = { saveImage, remove, read, keyFromPublicUrl, isOwnPublicUrl, sniffImage, imageSize, DIRS, driverName: driver.name };
