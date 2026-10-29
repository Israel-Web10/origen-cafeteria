// Ubicación, horarios y contacto.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CityMap } from '../components/StreetScene';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { DAYS, openStatus, parseHours } from '../lib/hours';

export function Visit() {
  const { t } = useTranslation();
  const { settings } = useConfig();
  const calm = useCalmMotion();
  const hours = parseHours(settings.opening_hours);
  const status = openStatus(hours, settings.timezone);
  const lat = settings.latitude;
  const lng = settings.longitude;
  const mapsHref = settings.gmaps_link && /^https:\/\//.test(settings.gmaps_link)
    ? settings.gmaps_link
    : lat && lng ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}` : null;
  // OpenStreetMap embebido: gratuito y sin clave de API.
  const osm = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.004},${Number(lat) - 0.003},${Number(lng) + 0.004},${Number(lat) + 0.003}&layer=mapnik&marker=${lat},${lng}`
    : null;
  const todayKey = new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone || 'America/La_Paz', weekday: 'short' }).format(new Date()).toLowerCase().slice(0, 3);

  return (
    <div>
      {/* Continúa el movimiento de la portada: el mapa se desplaza hasta el pin del local */}
      <section className="relative overflow-hidden bg-espresso text-cream pt-16 min-h-[420px]">
        <motion.div className="absolute inset-0" initial={calm ? false : { scale: 1.6, x: '12%', y: '-8%' }} animate={{ scale: 1.15, x: '0%', y: '0%' }} transition={{ duration: 1.6, ease: [0.3, 0, 0.2, 1] }} style={{ transformOrigin: '50% 52%' }}>
          <CityMap className="w-full h-full" pinLabel={settings.business_name || 'ORIGEN'} />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/70 to-transparent" aria-hidden />
        <div className="relative section py-16 md:py-24">
          <p className="eyebrow !text-gold-light mb-3">{t('visit.eyebrow')}</p>
          <h1 className="text-4xl md:text-6xl text-cream text-glow">{t('visit.title')}</h1>
          <p className="text-cream/80 mt-4 max-w-xl text-lg">{settings.address || t('visit.addressPending')}</p>
          <span className={`badge mt-5 ${status.open ? 'bg-olive text-cream' : 'bg-rose text-cream'}`}>
            ● {status.open ? t('hours.openNow', { time: status.closesAt }) : status.opensAt ? t('hours.closedNow', { day: t(`days.${status.opensDay}`), time: status.opensAt }) : t('hours.closed')}
          </span>
          <p className="text-[11px] text-cream/60 mt-3">{t('visit.mapIllustration')}</p>
        </div>
      </section>
      <div className="section py-14 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-2xl mb-4">{t('footer.hours')}</h2>
            {hours ? (
              <dl className="divide-y divide-espresso/10">
                {DAYS.map((d) => (
                  <div key={d} className={`flex justify-between py-2 ${d === todayKey ? 'font-semibold text-espresso' : 'text-charcoal/70'}`}>
                    <dt>{t(`days.${d}`)}{d === todayKey ? ` · ${t('hours.today')}` : ''}</dt>
                    <dd>{hours[d].length ? hours[d].map(([a, b]) => `${a}–${b}`).join(', ') : t('hours.closed')}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="text-charcoal/60">{t('hours.notConfigured')}</p>}
            <p className="text-xs text-charcoal/50 mt-3">{t('visit.timezone', { tz: settings.timezone })}</p>
          </section>
          <section className="card p-6">
            <h2 className="text-2xl mb-4">{t('footer.contact')}</h2>
            <ul className="space-y-2 text-charcoal/80">
              {settings.phone && <li>📞 <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="underline">{settings.phone}</a></li>}
              {settings.whatsapp && <li>💬 <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a></li>}
              {settings.email && <li>✉️ <a href={`mailto:${settings.email}`} className="underline">{settings.email}</a></li>}
              {!settings.phone && !settings.email && !settings.whatsapp && <li className="text-charcoal/50">{t('visit.contactPending')}</li>}
            </ul>
            <div className="flex flex-wrap gap-3 mt-5">
              {mapsHref && <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="btn-primary">{t('visit.directions')}</a>}
              <Link to="/preguntas-frecuentes" className="btn-outline">{t('nav.faq')}</Link>
            </div>
          </section>
        </div>
        <div className="rounded-card overflow-hidden bg-almond min-h-[360px] shadow-soft">
          {osm ? (
            <iframe title={t('visit.map')} src={osm} className="w-full h-full min-h-[360px] border-0" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <div className="h-full min-h-[360px] flex items-center justify-center text-charcoal/50 text-sm p-6 text-center">{t('visit.mapPending')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
