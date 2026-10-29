import { ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Carrusel con scroll nativo (scroll-snap): funciona con dedo, rueda, teclado
 * y botones, sin dependencias ni cálculo de posiciones en cada fotograma.
 */
export function Carousel({ children, label, itemClassName = 'w-[72%] sm:w-[42%] lg:w-[24%]' }: {
  children: ReactNode[]; label: string; itemClassName?: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [pos, setPos] = useState({ width: 1, offset: 0 });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    // Tamaño y posición de la barra: parte visible del total
    setPos({ width: Math.min(1, el.clientWidth / el.scrollWidth), offset: el.scrollWidth > el.clientWidth ? el.scrollLeft / el.scrollWidth : 0 });
  };

  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [children.length]);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div ref={ref} className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0" tabIndex={0}>
        {children.map((child, i) => (
          <div key={i} className={`snap-start shrink-0 ${itemClassName}`} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${children.length}`}>
            {child}
          </div>
        ))}
      </div>
      {pos.width < 1 && (
        <div className="h-1 rounded-full bg-espresso/10 overflow-hidden mt-1" aria-hidden>
          <div className="h-full bg-gold rounded-full transition-transform duration-300 ease-out" style={{ width: `${pos.width * 100}%`, transform: `translateX(${(pos.offset / pos.width) * 100}%)` }} />
        </div>
      )}
      <div className="hidden sm:flex gap-2 absolute -top-14 right-0">
        <button className="w-10 h-10 rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream disabled:opacity-30 transition" onClick={() => scroll(-1)} disabled={edges.start} aria-label={t('common.previous')}>←</button>
        <button className="w-10 h-10 rounded-full border border-espresso/20 hover:bg-espresso hover:text-cream disabled:opacity-30 transition" onClick={() => scroll(1)} disabled={edges.end} aria-label={t('common.next')}>→</button>
      </div>
    </div>
  );
}
