import { useTranslation } from 'react-i18next';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/authService';
import { formatDate } from '../lib/format';
import type { Locale } from '../types';

const LANGS: { code: Locale; label: string; name: string }[] = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
];

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const change = (code: Locale) => {
    i18n.changeLanguage(code);
    if (user) updateProfile({ preferred_locale: code }).catch(() => {});
  };
  return (
    <label className="relative">
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={i18n.language}
        onChange={(e) => change(e.target.value as Locale)}
        className={`appearance-none rounded-full text-xs font-semibold pl-3 pr-7 py-2 cursor-pointer border ${light ? 'bg-cream/10 text-cream border-cream/30' : 'bg-white/70 text-espresso border-espresso/15'}`}
      >
        {LANGS.map((l) => <option key={l.code} value={l.code} className="text-espresso">{l.label} · {l.name}</option>)}
      </select>
      <span aria-hidden className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] ${light ? 'text-cream' : 'text-espresso'}`}>▾</span>
    </label>
  );
}

/** Solo aparece si el gerente habilitó la conversión y cargó tipos de cambio. */
export function CurrencySwitcher({ light = false }: { light?: boolean }) {
  const { t, i18n } = useTranslation();
  const { config, settings, baseCurrency, displayCurrency, setDisplayCurrency, activeRate } = useConfig();
  if (settings.currency_display_enabled !== 'true' || !config?.exchangeRates.length) return null;
  const options = [baseCurrency, ...config.exchangeRates.map((r) => r.quote_code)];
  const title = activeRate
    ? t('currency.rateInfo', {
        rate: activeRate.rate, base: baseCurrency, quote: activeRate.quote_code,
        type: t(`currency.types.${activeRate.rate_type}`), source: activeRate.source,
        date: formatDate(activeRate.effective_at, i18n.language, { dateStyle: 'medium' }),
      })
    : t('currency.official');
  return (
    <label className="relative" title={title}>
      <span className="sr-only">{t('currency.label')}</span>
      <select
        value={displayCurrency}
        onChange={(e) => setDisplayCurrency(e.target.value)}
        className={`appearance-none rounded-full text-xs font-semibold pl-3 pr-7 py-2 cursor-pointer border ${light ? 'bg-cream/10 text-cream border-cream/30' : 'bg-white/70 text-espresso border-espresso/15'}`}
      >
        {options.map((c) => <option key={c} value={c} className="text-espresso">{c}{c === baseCurrency ? ` · ${t('currency.officialShort')}` : ' ≈'}</option>)}
      </select>
      <span aria-hidden className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] ${light ? 'text-cream' : 'text-espresso'}`}>▾</span>
    </label>
  );
}
