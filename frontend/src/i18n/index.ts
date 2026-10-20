import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const LOCALES = ['es', 'en', 'fr'] as const;
export const LOCALE_KEY = 'origen_locale';

function detect(): string {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && (LOCALES as readonly string[]).includes(saved)) return saved;
  } catch { /* sin almacenamiento */ }
  const nav = (navigator.language || 'es').slice(0, 2);
  return (LOCALES as readonly string[]).includes(nav) ? nav : 'es';
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, fr: { translation: fr } },
  lng: detect(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false }, // React ya escapa
  returnNull: false,
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  try { localStorage.setItem(LOCALE_KEY, lng); } catch { /* noop */ }
});

export default i18n;
