// Visor de fotos a pantalla completa: flechas, teclado (← → Esc), deslizar con el dedo
// y transición animada al cambiar de foto. Respeta el movimiento reducido.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDialog } from './Modal';
import { useCalmMotion } from '../context/ConfigContext';

export interface LightboxImage { src: string; alt: string; illustrative?: boolean }

export function Lightbox({ images, index, onClose }: { images: LightboxImage[]; index: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  const calm = useCalmMotion();
  const open = index !== null;
  const [current, setCurrent] = useState(index ?? 0);
  const [dir, setDir] = useState(0);
  // Referencia estable: si la página se vuelve a dibujar, el visor no reinicia el foco
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = useCallback(() => closeRef.current(), []);
  const ref = useDialog(open, close);

  useEffect(() => { if (index !== null) setCurrent(index); }, [index]);

  const go = useCallback((step: number) => {
    setDir(step);
    setCurrent((c) => (c + step + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go]);

  const img = images[current];
  return createPortal(
    <AnimatePresence>
      {open && img && (
        <motion.div
          ref={ref}
          role="dialog" aria-modal="true" aria-label={img.alt || t('home.galleryTitle')} tabIndex={-1}
          className="fixed inset-0 z-[90] bg-espresso/95 backdrop-blur-sm flex items-center justify-center outline-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.figure
              key={current}
              custom={dir}
              className="relative max-w-[92vw] max-h-[82vh]"
              initial={calm ? { opacity: 0 } : { opacity: 0, x: dir * 80, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={calm ? { opacity: 0 } : { opacity: 0, x: dir * -80, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 0.8, 0.2, 1] }}
              drag={calm ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) go(info.offset.x < 0 ? 1 : -1); }}
            >
              <img src={img.src} alt={img.alt} className="max-w-[92vw] max-h-[82vh] rounded-card object-contain shadow-lift select-none" draggable={false} />
              <figcaption className="mt-3 text-center text-cream/80 text-sm">
                {img.alt}{img.illustrative ? ` · ${t('home.illustrativeShort')}` : ''}
                <span className="ml-2 text-cream/50">{current + 1} / {images.length}</span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
          {images.length > 1 && <>
            <button onClick={() => go(-1)} aria-label={t('common.previous')} className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cream/10 text-cream text-xl hover:bg-cream/20 transition">←</button>
            <button onClick={() => go(1)} aria-label={t('common.next')} className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cream/10 text-cream text-xl hover:bg-cream/20 transition">→</button>
          </>}
          <button onClick={onClose} aria-label={t('common.close')} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-cream/10 text-cream text-2xl leading-none hover:bg-cream/20 transition">×</button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
