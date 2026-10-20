// Aritmética monetaria en unidades menores ENTERAS (centavos). Nunca floats.

/** Convierte un importe decimal recibido ("12.5", 12.5) a centavos enteros, validando. */
function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(str)) throw new Error(`Importe inválido: ${value}`);
  const negative = str.startsWith('-');
  const [int, frac = ''] = str.replace('-', '').split('.');
  const cents = Number(int) * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}

/** Centavos → string decimal "12.50" (para PDF/Excel/logs; la UI formatea con Intl). */
function centsToDecimalString(cents) {
  const neg = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  return `${neg ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Porcentaje aplicado a centavos con redondeo "half up" entero. */
function percentOf(cents, percent) {
  return Math.round((cents * percent) / 100);
}

/**
 * Convierte centavos de la moneda base a la moneda destino usando una tasa
 * en string NUMERIC (1 base = rate destino). Usa BigInt con 8 decimales de
 * escala para no perder precisión. Devuelve centavos de la moneda destino.
 */
function convertCents(cents, rate, targetDecimals = 2) {
  const [i, f = ''] = String(rate).split('.');
  const scaled = BigInt(i + (f + '00000000').slice(0, 8)); // rate * 1e8
  const factor = 10n ** BigInt(targetDecimals);
  // cents (2 decimales) → unidades destino con targetDecimals
  const numerator = BigInt(cents) * scaled * factor;
  const denominator = 100000000n * 100n;
  const q = numerator / denominator;
  const r = numerator % denominator;
  return Number(r * 2n >= denominator ? q + 1n : q);
}

module.exports = { toCents, centsToDecimalString, percentOf, convertCents };
