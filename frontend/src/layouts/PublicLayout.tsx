import { useEffect, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { CookieBanner } from '../components/CookieBanner';
import { kindFor, pageVariants, TransitionKind } from '../lib/transitions';
import { useCalmMotion } from '../context/ConfigContext';
import { useTranslation } from 'react-i18next';

export function PublicLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const outlet = useOutlet();
  const calm = useCalmMotion();
  const prev = useRef<string | null>(null);
  const kindRef = useRef<TransitionKind>('calm');

  // Calcula el tipo de movimiento cuando cambia la ruta (antes de pintar)
  if (prev.current !== location.pathname) {
    kindRef.current = calm ? 'calm' : kindFor(location.pathname, prev.current);
  }
  useEffect(() => {
    prev.current = location.pathname;
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Páginas con escena de cabecera: la barra flota transparente sobre la imagen
  const isHome = location.pathname === '/';
  const overlay = isHome || ['/carta', '/historia', '/la-cafeteria', '/visitanos', '/promociones', '/preguntas-frecuentes'].some((p) => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn-primary">{t('a11y.skip')}</a>
      <Navbar overlay={overlay} />
      <main id="contenido" className={`relative flex-1 outline-none ${overlay ? '' : 'pt-16'}`} tabIndex={-1}>
        {/* popLayout: la página nueva se monta de inmediato y la anterior sale superpuesta.
            La navegación nunca espera a que termine una animación. */}
        <AnimatePresence mode="popLayout" custom={kindRef.current} initial={false}>
          <motion.div
            key={location.pathname}
            custom={kindRef.current}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={{ transformOrigin: '50% 30vh' }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartDrawer />
      <CookieBanner />
    </div>
  );
}
