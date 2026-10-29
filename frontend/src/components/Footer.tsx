import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfig } from '../context/ConfigContext';
import { Logo } from './Brand';
import { DAYS, parseHours } from '../lib/hours';
import { openCookiePreferences } from './CookieBanner';

const safeUrl = (u?: string) => (u && /^https:\/\//.test(u) ? u : undefined);

export function Footer() {
  const { t } = useTranslation();
  const { settings, liteMode, setLiteMode } = useConfig();
  const hours = parseHours(settings.opening_hours);
  const name = settings.business_name || 'ORIGEN';
  const socials = [
    ['Instagram', safeUrl(settings.social_instagram)],
    ['Facebook', safeUrl(settings.social_facebook)],
    ['TikTok', safeUrl(settings.social_tiktok)],
  ].filter(([, u]) => u) as [string, string][];

  return (
    <footer className="bg-espresso text-cream/80 mt-24 relative overflow-hidden">
      <div className="absolute inset-0 grain opacity-60 pointer-events-none" aria-hidden />
      <div className="section relative py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          {settings.slogan && <p className="text-sm text-cream/60 mt-3">{settings.slogan}</p>}
          {socials.length > 0 && (
            <ul className="flex gap-3 mt-5 text-sm">
              {socials.map(([label, url]) => (
                <li key={label}><a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-gold-light underline-offset-4 hover:underline">{label}</a></li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label={t('footer.explore')}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gold-light mb-3 font-body">{t('footer.explore')}</h2>
          <ul className="space-y-2 text-sm">
            {[['/carta', 'nav.menu'], ['/promociones', 'nav.promotions'], ['/historia', 'nav.story'], ['/la-cafeteria', 'nav.cafe'],
              ['/visitanos', 'nav.visit'], ['/seguimiento', 'nav.track'], ['/preguntas-frecuentes', 'nav.faq']].map(([to, key]) => (
              <li key={to}><Link to={to} className="hover:text-cream">{t(key)}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gold-light mb-3 font-body">{t('footer.hours')}</h2>
          {hours ? (
            <dl className="text-sm space-y-1">
              {DAYS.map((d) => (
                <div key={d} className="flex justify-between gap-4">
                  <dt className="text-cream/60">{t(`days.${d}`)}</dt>
                  <dd>{hours[d].length ? hours[d].map(([a, b]) => `${a}–${b}`).join(', ') : t('hours.closed')}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="text-sm text-cream/60">{t('hours.notConfigured')}</p>}
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gold-light mb-3 font-body">{t('footer.contact')}</h2>
          <ul className="space-y-2 text-sm">
            {settings.address && <li>{settings.address}{settings.city ? `, ${settings.city}` : ''}</li>}
            {settings.phone && <li><a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="hover:text-cream">{settings.phone}</a></li>}
            {settings.whatsapp && (
              <li><a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-cream">WhatsApp</a></li>
            )}
            {settings.email && <li><a href={`mailto:${settings.email}`} className="hover:text-cream">{settings.email}</a></li>}
          </ul>
        </div>
      </div>

      <div className="relative border-t border-cream/10">
        <div className="section py-5 flex flex-col md:flex-row gap-4 md:items-center justify-between text-xs text-cream/50">
          <p>
            © {new Date().getFullYear()} {settings.legal_name || name}
            {settings.tax_id ? ` · NIT ${settings.tax_id}` : ''}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li><Link to="/legal/privacy" className="hover:text-cream">{t('legal.privacy')}</Link></li>
            <li><Link to="/legal/cookies" className="hover:text-cream">{t('legal.cookies')}</Link></li>
            <li><Link to="/legal/terms" className="hover:text-cream">{t('legal.terms')}</Link></li>
            <li><Link to="/legal/refunds" className="hover:text-cream">{t('legal.refunds')}</Link></li>
            <li><button onClick={openCookiePreferences} className="hover:text-cream underline-offset-2 hover:underline">{t('cookies.preferences')}</button></li>
            <li>
              <label className="inline-flex items-center gap-2 cursor-pointer hover:text-cream">
                <input type="checkbox" checked={liteMode} onChange={(e) => setLiteMode(e.target.checked)} className="accent-gold" />
                {t('footer.liteMode')}
              </label>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
