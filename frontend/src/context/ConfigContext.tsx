// Configuración pública del negocio (una sola carga) + moneda de visualización
// elegida por el visitante + paleta de marca + modo ligero de animaciones.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExchangeRate, PublicConfig, Settings } from '../types';
import * as contentService from '../services/contentService';
import { formatDisplay, formatMoney } from '../lib/format';
import { assetUrl } from '../services/api';

const DISPLAY_KEY = 'origen_display_currency';
const LITE_KEY = 'origen_lite_mode';

interface ConfigValue {
  config: PublicConfig | null;
  settings: Settings;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  baseCurrency: string;
  displayCurrency: string;
  setDisplayCurrency: (code: string) => void;
  activeRate: ExchangeRate | null;
  /** Precio formateado en la moneda base (oficial) */
  money: (cents: number) => string;
  /** Precio en la moneda elegida (aproximado si no es la base) */
  displayMoney: (cents: number) => string;
  liteMode: boolean;
  setLiteMode: (v: boolean) => void;
  reducedMotion: boolean;
}

const ConfigContext = createContext<ConfigValue | undefined>(undefined);

function detectLowPower(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if (nav.connection?.effectiveType && /2g/.test(nav.connection.effectiveType)) return true;
  if (nav.deviceMemory && nav.deviceMemory < 3) return true;
  return false;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [displayCurrency, setDisplay] = useState<string>(() => {
    try { return localStorage.getItem(DISPLAY_KEY) || ''; } catch { return ''; }
  });
  const [liteMode, setLite] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(LITE_KEY);
      return saved === null ? detectLowPower() : saved === 'true';
    } catch { return false; }
  });
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  const reload = useCallback(async () => {
    try {
      setConfig(await contentService.getConfig());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const settings = config?.settings ?? {};
  const baseCurrency = config?.currencies.find((c) => c.is_base)?.code ?? 'BOB';

  // Paleta y favicon definidos por el gerente (solo opciones seguras)
  useEffect(() => {
    document.documentElement.dataset.palette = settings.brand_palette || 'espresso';
    document.documentElement.dataset.lite = liteMode || reducedMotion ? 'true' : 'false';
    if (settings.favicon_url) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = assetUrl(settings.favicon_url) || link.href;
    }
    if (settings.business_name) document.title = `${settings.business_name} — ${settings.slogan || ''}`.replace(/ — $/, '');
  }, [settings.brand_palette, settings.favicon_url, settings.business_name, settings.slogan, liteMode, reducedMotion]);

  const conversionOn = settings.currency_display_enabled === 'true';
  const activeRate = useMemo(() => {
    if (!conversionOn || !displayCurrency || displayCurrency === baseCurrency) return null;
    return config?.exchangeRates.find((r) => r.quote_code === displayCurrency) ?? null;
  }, [conversionOn, displayCurrency, baseCurrency, config]);

  const value: ConfigValue = {
    config,
    settings,
    loading,
    error,
    reload,
    baseCurrency,
    displayCurrency: activeRate ? displayCurrency : baseCurrency,
    setDisplayCurrency: (code) => {
      setDisplay(code);
      try { localStorage.setItem(DISPLAY_KEY, code); } catch { /* noop */ }
    },
    activeRate,
    money: (cents) => formatMoney(cents, baseCurrency, i18n.language),
    displayMoney: (cents) => formatDisplay(cents, { locale: i18n.language, base: baseCurrency, rate: activeRate, rounding: settings.display_rounding }),
    liteMode,
    setLiteMode: (v) => {
      setLite(v);
      try { localStorage.setItem(LITE_KEY, String(v)); } catch { /* noop */ }
    },
    reducedMotion,
  };
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>');
  return ctx;
}

/** true si deben reducirse animaciones (preferencia del sistema o modo ligero). */
export function useCalmMotion() {
  const { liteMode, reducedMotion } = useConfig();
  return liteMode || reducedMotion;
}
