// "Tu pedido en tres pasos": iconos que se dibujan al entrar en pantalla y una línea que los une.
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalmMotion } from '../context/ConfigContext';

const ICONS: Record<string, string[]> = {
  // Carta abierta
  choose: ['M8 10h20a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H8z', 'M30 12h10a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2H30', 'M13 18h10', 'M13 24h10', 'M13 30h6'],
  // Teléfono con código QR
  pay: ['M15 6h18a3 3 0 0 1 3 3v30a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z', 'M18 14h5v5h-5z', 'M25 14h5v5h-5z', 'M18 21h5v5h-5z', 'M26 22h4v4h-4z', 'M21 36h6'],
  // Taza para llevar
  pickup: ['M14 14h20l-2.5 26a2 2 0 0 1-2 1.8H18.5a2 2 0 0 1-2-1.8z', 'M12 10h24v4H12z', 'M17 24h14', 'M20 4c0 2 2 2 2 4', 'M26 4c0 2 2 2 2 4'],
};
const STEPS = ['choose', 'pay', 'pickup'] as const;

export function HowToOrder() {
  const { t } = useTranslation();
  const calm = useCalmMotion();
  const draw = (delay: number) => (calm
    ? {}
    : { initial: { pathLength: 0, opacity: 0 }, whileInView: { pathLength: 1, opacity: 1 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 1.1, delay, ease: 'easeInOut' as const } });

  return (
    <section className="section py-16" aria-labelledby="how-title">
      <p className="eyebrow mb-2">{t('home.how.eyebrow')}</p>
      <h2 id="how-title" className="text-3xl md:text-4xl mb-10">{t('home.how.title')}</h2>
      <div className="relative">
        {/* Línea que une los pasos (escritorio) */}
        <motion.div aria-hidden className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-gold/0 via-gold to-gold/0 origin-left"
          initial={calm ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
        <ol className="grid md:grid-cols-3 gap-8 relative">
          {STEPS.map((s, i) => (
            <motion.li key={s} className="text-center"
              initial={calm ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay: i * 0.2 }}>
              <div className="mx-auto w-24 h-24 rounded-full bg-cream shadow-soft border border-espresso/10 flex items-center justify-center relative">
                <svg viewBox="0 0 48 48" className="w-12 h-12 text-espresso" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {ICONS[s].map((d, k) => <motion.path key={k} d={d} {...draw(i * 0.25 + k * 0.08)} />)}
                </svg>
                <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gold text-espresso font-bold text-sm flex items-center justify-center">{i + 1}</span>
              </div>
              <h3 className="text-xl mt-5 mb-2">{t(`home.how.${s}.title`)}</h3>
              <p className="text-charcoal/70 max-w-xs mx-auto">{t(`home.how.${s}.text`)}</p>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="text-center mt-10"><Link to="/carta" className="btn-primary">{t('home.how.cta')}</Link></div>
    </section>
  );
}
