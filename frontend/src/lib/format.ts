import type { ExchangeRate, Locale, Translations } from '../types';

const LOCALE_TAG: Record<Locale, string> = { es: 'es-BO', en: 'en-US', fr: 'fr-FR' };
export const localeTag = (l: string) => LOCALE_TAG[(l as Locale)] || 'es-BO';

const SYMBOLS: Record<string, string> = { BOB: 'Bs', USD: 'US$', EUR: '€' };

/** Formatea centavos (enteros) en la moneda indicada sin usar aritmética float acumulada. */
export function formatMoney(cents: number, currency = 'BOB', locale = 'es', symbol?: string): string {
  const value = new Intl.NumberFormat(localeTag(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
  const sym = symbol || SYMBOLS[currency] || currency;
  return locale === 'fr' ? `${value} ${sym}` : `${sym} ${value}`;
}

/**
 * Conversión SOLO para mostrar: centavos base × tasa (string con 8 decimales),
 * con BigInt para no perder precisión, y redondeo de presentación opcional.
 */
export function convertCents(cents: number, rate: string, rounding = 'none'): number {
  const [i, f = ''] = rate.split('.');
  const scaled = BigInt(i + (f + '00000000').slice(0, 8));
  const num = BigInt(Math.round(cents)) * scaled;
  const den = 100000000n;
  let out = Number((num + den / 2n) / den);
  const step = { '0.05': 5, '0.10': 10, '0.50': 50, '1': 100 }[rounding];
  if (step) out = Math.round(out / step) * step;
  return out;
}

export function formatDisplay(cents: number, opts: { locale: string; base: string; rate?: ExchangeRate | null; rounding?: string }) {
  if (!opts.rate) return formatMoney(cents, opts.base, opts.locale);
  return `≈ ${formatMoney(convertCents(cents, opts.rate.rate, opts.rounding), opts.rate.quote_code, opts.locale, opts.rate.symbol)}`;
}

export function formatDate(iso: string | Date, locale = 'es', opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }, timeZone?: string) {
  return new Intl.DateTimeFormat(localeTag(locale), { ...opts, timeZone }).format(new Date(iso));
}

export function formatNumber(n: number, locale = 'es', digits = 0) {
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: digits }).format(n);
}

export function formatPercent(n: number | null | undefined, locale = 'es') {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(localeTag(locale), { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(n);
}

/** Texto traducido de una entidad del catálogo con fallback al español. */
export function tr<T extends { name: string; description?: string | null; translations?: Translations }>(
  entity: T | null | undefined,
  locale: string,
  field: 'name' | 'description' | 'ingredients' = 'name'
): string {
  if (!entity) return '';
  const t = locale !== 'es' ? entity.translations?.[locale as 'en' | 'fr']?.[field] : undefined;
  return (t && t.trim()) || ((entity as Record<string, unknown>)[field] as string) || '';
}

/** Decimal escrito por el usuario ("12,50") → centavos enteros, o null si es inválido. */
export function parseMoneyInput(value: string): number | null {
  const s = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [i, f = ''] = s.split('.');
  return Number(i) * 100 + Number((f + '00').slice(0, 2));
}

export const centsToInput = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2));
