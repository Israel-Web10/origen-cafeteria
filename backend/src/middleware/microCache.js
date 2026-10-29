// Micro-caché en memoria para lecturas PÚBLICAS (carta, configuración, páginas).
// Con 1000 visitantes mirando la carta a la vez, casi todas las peticiones son
// idénticas: se responde desde memoria durante unos segundos en vez de repetir
// la misma consulta a PostgreSQL. Reglas:
//  - Solo GET anónimos (sin cabecera Authorization): nunca se cachea nada personal.
//  - Solo respuestas 200; los errores siempre se recalculan.
//  - Vida corta (TTL) + borrado completo cuando el personal modifica algo.
//  - Tamaño acotado (FIFO): una URL con ?search= aleatorio no puede agotar la memoria.
//  - Sin "estampida": si llegan 1000 peticiones iguales cuando la entrada no existe
//    o caducó, solo UNA consulta va a la BD; las demás esperan ese resultado o,
//    si hay una copia anterior, la reciben al instante mientras se refresca.
// Con varias instancias/procesos, cada uno tiene su caché: un cambio del gerente
// puede tardar como máximo el TTL en verse en los demás procesos.
const store = new Map();
const pending = new Map();
const MAX_ENTRIES = 500;
const STALE_FACTOR = 6; // una copia caducada se puede servir mientras se refresca, hasta 6 × TTL
const stats = { hits: 0, misses: 0, coalesced: 0, stale: 0 };
// Cambia con cada clear(): una consulta que empezó ANTES de una edición no guarda datos viejos
let generation = 0;

function send(res, entry, state) {
  res.set('X-Cache', state);
  if (entry.cacheControl) res.set('Cache-Control', entry.cacheControl);
  return res.type('application/json').send(entry.body);
}

function microCache(ttlMs) {
  return (req, res, next) => {
    if (ttlMs <= 0 || req.method !== 'GET' || req.headers.authorization) return next();
    const key = req.originalUrl;
    const now = Date.now();
    const entry = store.get(key);
    if (entry && entry.expires > now) { stats.hits++; return send(res, entry, 'HIT'); }

    const inflight = pending.get(key);
    if (inflight) {
      // Ya hay una consulta en curso para esta URL
      if (entry && entry.staleUntil > now) { stats.stale++; return send(res, entry, 'STALE'); }
      stats.coalesced++;
      return inflight.then((fresh) => (fresh ? send(res, fresh, 'COALESCED') : next()), next);
    }

    // Esta petición es la que consulta la BD; las demás se enganchan a su resultado
    stats.misses++;
    const startedAt = generation;
    let settle;
    const promise = new Promise((resolve) => { settle = resolve; });
    pending.set(key, promise);
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      if (pending.get(key) === promise) pending.delete(key);
      settle(value);
    };
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && startedAt === generation) {
        const fresh = {
          expires: Date.now() + ttlMs,
          staleUntil: Date.now() + ttlMs * STALE_FACTOR,
          body: JSON.stringify(body),
          cacheControl: res.get('Cache-Control'),
        };
        store.delete(key);
        if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
        store.set(key, fresh);
        done(fresh);
      } else done(null);
      res.set('X-Cache', 'MISS');
      return json(body);
    };
    // Si la respuesta termina sin pasar por res.json (error, conexión cortada), libera a los que esperan
    res.on('close', () => done(null));
    next();
  };
}

function clear() {
  generation++;
  store.clear();
  pending.clear();
}

module.exports = { microCache, clear, stats, size: () => store.size };
