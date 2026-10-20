// Banner de cookies. Hoy la web solo usa almacenamiento estrictamente necesario
// (sesión, carrito, preferencias). Las categorías opcionales existen para que,
// si en el futuro se agrega analítica, sus scripts SOLO se carguen con
// consentimiento (ver hasConsent). La elección se guarda en el navegador y se
// registra en el servidor con un identificador aleatorio (sin datos personales).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useConfig } from '../context/ConfigContext';
import { recordConsent } from '../services/contentService';

const KEY = 'origen_cookie_consent';
interface Consent { id: string; analytics: boolean; marketing: boolean; version: string; at: string }

export function readConsent(): Consent | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function hasConsent(kind: 'analytics' | 'marketing'): boolean {
  return Boolean(readConsent()?.[kind]);
}
export function openCookiePreferences() {
  window.dispatchEvent(new Event('origen:cookie-preferences'));
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function CookieBanner() {
  const { t } = useTranslation();
  const { settings, loading } = useConfig();
  const version = settings.policy_version || '1';
  const [visible, setVisible] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (loading) return;
    const current = readConsent();
    // Se vuelve a preguntar si cambió la versión de la política
    if (!current || current.version !== version) setVisible(true);
    else { setAnalytics(current.analytics); setMarketing(current.marketing); }
    const open = () => { setVisible(true); setCustom(true); };
    window.addEventListener('origen:cookie-preferences', open);
    return () => window.removeEventListener('origen:cookie-preferences', open);
  }, [loading, version]);

  function save(a: boolean, m: boolean) {
    const consent: Consent = { id: readConsent()?.id || randomId(), analytics: a, marketing: m, version, at: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(consent)); } catch { /* sin almacenamiento: se volverá a preguntar */ }
    recordConsent({ consent_id: consent.id, analytics: a, marketing: m, policy_version: version }).catch(() => {});
    setVisible(false);
    setCustom(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-live="polite"
          aria-label={t('cookies.title')}
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[420px] z-[60] card bg-cream p-5 shadow-lift"
        >
          <h2 className="font-display text-lg mb-1">{t('cookies.title')}</h2>
          <p className="text-sm text-charcoal/70 mb-3">
            {t('cookies.text')} <Link to="/legal/cookies" className="underline text-gold-dark">{t('cookies.policy')}</Link>
          </p>
          {custom && (
            <div className="space-y-2 mb-4 text-sm">
              <label className="flex items-start gap-2 opacity-70">
                <input type="checkbox" checked disabled className="mt-1" />
                <span><strong>{t('cookies.necessary')}</strong> — {t('cookies.necessaryDesc')}</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 accent-gold" />
                <span><strong>{t('cookies.analytics')}</strong> — {t('cookies.analyticsDesc')}</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 accent-gold" />
                <span><strong>{t('cookies.marketing')}</strong> — {t('cookies.marketingDesc')}</span>
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={() => save(false, false)}>{t('cookies.onlyNecessary')}</button>
            {custom
              ? <button className="btn-primary btn-sm" onClick={() => save(analytics, marketing)}>{t('cookies.save')}</button>
              : <button className="btn-ghost btn-sm" onClick={() => setCustom(true)}>{t('cookies.customize')}</button>}
            <button className="btn-primary btn-sm" onClick={() => save(true, true)}>{t('cookies.acceptAll')}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
