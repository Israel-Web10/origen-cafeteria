// "Del cafetal a la taza": relato guiado por el scroll. La sección queda fija mientras
// el visitante baja; el texto avanza por etapas y la foto de fondo cambia con un fundido.
// Con movimiento reducido se muestra como una cuadrícula estática.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalmMotion } from '../context/ConfigContext';

// Fotos ilustrativas (Unsplash; ver docs/RECURSOS-Y-LICENCIAS.md)
const STEPS = [
  { key: 'grow', img: '/media/historia/cafetal.webp' },
  { key: 'harvest', img: '/media/historia/cosecha.webp' },
  { key: 'roast', img: '/media/historia/tostado.webp' },
  { key: 'cup', img: '/media/menu/latte-art.webp' },
] as const;

export function CoffeeJourney() {
  const { t } = useTranslation();
  const calm = useCalmMotion();
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const line = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)))));

  const heading = (
    <>
      <p className="eyebrow !text-gold-light mb-3">{t('home.journey.eyebrow')}</p>
      <h2 id="journey-title" className="text-3xl md:text-5xl text-cream mb-8">{t('home.journey.title')}</h2>
    </>
  );

  if (calm) {
    return (
      <section className="bg-espresso text-cream py-16" aria-labelledby="journey-title">
        <div className="section">
          {heading}
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <li key={s.key} className="rounded-card overflow-hidden bg-cream/5">
                <img src={s.img} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" />
                <div className="p-4"><p className="text-gold-light text-sm">0{i + 1}</p><h3 className="text-xl text-cream">{t(`home.journey.${s.key}.title`)}</h3><p className="text-cream/70 text-sm mt-1">{t(`home.journey.${s.key}.text`)}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative bg-espresso" style={{ height: `${STEPS.length * 75}vh` }} aria-labelledby="journey-title">
      <div className="sticky top-0 h-screen overflow-hidden text-cream">
        {STEPS.map((s, i) => (
          <motion.img
            key={s.key} src={s.img} alt="" aria-hidden loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{ opacity: i === active ? 1 : 0, scale: i === active ? 1 : 1.08 }}
            transition={{ duration: 1.1, ease: [0.22, 0.8, 0.2, 1] }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/95 via-espresso/70 to-espresso/10" aria-hidden />
        <div className="relative section h-full flex items-center">
          <div className="max-w-xl">
            {heading}
            <div className="flex gap-6">
              {/* Línea de progreso del relato */}
              <div className="relative w-0.5 bg-cream/15 rounded-full" aria-hidden>
                <motion.div className="absolute inset-x-0 top-0 h-full bg-gold origin-top rounded-full" style={{ scaleY: line }} />
              </div>
              <div className="min-h-[180px]">
                <AnimatePresence mode="wait">
                  <motion.div key={active} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }} transition={{ duration: 0.45 }}>
                    <p className="font-mono text-gold-light text-sm mb-2">0{active + 1} / 0{STEPS.length}</p>
                    <h3 className="text-2xl md:text-4xl text-cream mb-3">{t(`home.journey.${STEPS[active].key}.title`)}</h3>
                    <p className="text-cream/75 text-lg">{t(`home.journey.${STEPS[active].key}.text`)}</p>
                  </motion.div>
                </AnimatePresence>
                <ol className="flex gap-2 mt-8" aria-label={t('home.journey.title')}>
                  {STEPS.map((s, i) => (
                    <li key={s.key} aria-current={i === active ? 'step' : undefined}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-10 bg-gold' : 'w-4 bg-cream/25'}`}>
                      <span className="sr-only">{t(`home.journey.${s.key}.title`)}</span>
                    </li>
                  ))}
                </ol>
                <Link to="/historia" className="btn-glass mt-8 inline-flex">{t('home.journey.cta')}</Link>
              </div>
            </div>
          </div>
        </div>
        <p className="absolute bottom-3 right-4 text-[11px] text-cream/50">{t('home.illustrativeShort')}</p>
      </div>
    </section>
  );
}
