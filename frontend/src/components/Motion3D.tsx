// Efectos de movimiento y profundidad reutilizables (Framer Motion, sin dependencias extra).
// Todos respetan "movimiento reducido" y los que siguen al ratón no se activan en pantallas táctiles.
import { createElement, ReactNode, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion, MotionValue, useAnimationFrame, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, useVelocity,
} from 'framer-motion';
import { useCalmMotion } from '../context/ConfigContext';
import { CoffeeBean } from './Brand';

const isMouse = (e: React.PointerEvent) => e.pointerType === 'mouse';

/** Inclinación 3D que sigue al ratón, con un reflejo de luz. */
export function Tilt3D({ children, className = '', max = 9, glare = true }: { children: ReactNode; className?: string; max?: number; glare?: boolean }) {
  const calm = useCalmMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const light = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.38), rgba(255,255,255,0) 55%)`;
  const glow = useSpring(0, { stiffness: 200, damping: 25 });
  if (calm) return <div className={className}>{children}</div>;
  return (
    <div className={className} style={{ perspective: 900 }}>
      <motion.div
        className="relative h-full"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onPointerMove={(e) => {
          if (!isMouse(e)) return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
          glow.set(1);
        }}
        onPointerLeave={() => { px.set(0.5); py.set(0.5); glow.set(0); }}
      >
        {children}
        {glare && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-card mix-blend-soft-light" style={{ background: light, opacity: glow }} />}
      </motion.div>
    </div>
  );
}

/** Título que aparece palabra por palabra al entrar en pantalla. */
export function RevealText({ text, as = 'h2', className = '' }: { text: string; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  const calm = useCalmMotion();
  if (calm) return createElement(as, { className }, text);
  const words = text.split(' ');
  const Tag = motion[as];
  return (
    <Tag className={className} aria-label={text} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
          <motion.span className="inline-block origin-bottom-left"
            variants={{ hidden: { y: '110%', rotate: 5 }, show: { y: '0%', rotate: 0, transition: { duration: 0.75, ease: [0.22, 0.8, 0.2, 1] } } }}>
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

/** Botón "magnético": se desplaza suavemente hacia el cursor. */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const calm = useCalmMotion();
  const x = useSpring(0, { stiffness: 260, damping: 16 });
  const y = useSpring(0, { stiffness: 260, damping: 16 });
  if (calm) return <>{children}</>;
  return (
    <motion.span className="inline-block" style={{ x, y }}
      onPointerMove={(e) => {
        if (!isMouse(e)) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

const wrap = (min: number, max: number, v: number) => { const r = max - min; return ((((v - min) % r) + r) % r) + min; };

export interface MarqueeItem { src: string; label: string; to: string }
/** Cinta infinita de fotos: acelera y se inclina según la velocidad del scroll; se detiene al pasar el ratón. */
export function VelocityMarquee({ items, label }: { items: MarqueeItem[]; label: string }) {
  const calm = useCalmMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1000], [0, 4], { clamp: false });
  const skewX = useTransform(velocity, [-2500, 2500], [7, -7]);
  const dir = useRef(1);
  const [paused, setPaused] = useState(false);
  useAnimationFrame((_, delta) => {
    if (calm || paused) return;
    const b = boost.get();
    if (b < 0) dir.current = -1; else if (b > 0) dir.current = 1;
    const step = dir.current * 1.6 * (delta / 1000);
    base.set(wrap(-50, 0, base.get() + step + step * Math.abs(b)));
  });
  const x = useTransform(base, (v) => `${v}%`);
  const card = (it: MarqueeItem, i: number) => (
    <Link key={i} to={it.to} className="group relative block w-56 md:w-64 aspect-[4/3] shrink-0 rounded-card overflow-hidden shadow-soft" tabIndex={i < items.length ? 0 : -1} aria-hidden={i >= items.length || undefined}>
      <img src={it.src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <span className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/10 to-transparent" />
      <span className="absolute bottom-3 left-3 right-3 text-cream font-display text-lg leading-tight">{it.label}</span>
    </Link>
  );
  if (calm) {
    return <div className="flex gap-4 overflow-x-auto no-scrollbar px-4" role="region" aria-label={label}>{items.map(card)}</div>;
  }
  return (
    <div className="overflow-hidden py-2" role="region" aria-label={label} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <motion.div className="flex gap-4 w-max" style={{ x, skewX }}>
        {[...items, ...items].map(card)}
      </motion.div>
    </div>
  );
}

// Granos decorativos en los márgenes laterales (fuera de la columna de contenido, cuyas tarjetas son
// translúcidas): posición, tamaño, profundidad (más profundidad = más movimiento), giro y opacidad
const BEANS = [
  { x: '2%', y: '6%', s: 46, d: 0.9, r: -20, o: 0.5 },
  { x: '6.5%', y: '58%', s: 30, d: 0.4, r: 60, o: 0.32 },
  { x: '3%', y: '84%', s: 38, d: 0.7, r: -45, o: 0.38 },
  { x: '94%', y: '10%', s: 34, d: 0.5, r: 30, o: 0.35 },
  { x: '91%', y: '48%', s: 56, d: 1, r: 10, o: 0.45 },
  { x: '96%', y: '80%', s: 26, d: 0.3, r: 15, o: 0.28 },
];
function Bean({ b, progress }: { b: typeof BEANS[number]; progress: MotionValue<number> }) {
  const y = useTransform(progress, [0, 1], [b.d * 140, -b.d * 140]);
  const rotate = useTransform(progress, [0, 1], [b.r, b.r + b.d * 120]);
  return (
    <motion.div className="absolute" style={{ left: b.x, top: b.y, width: b.s, y, rotate, opacity: b.o, filter: b.d < 0.5 ? 'blur(1.5px)' : undefined }}>
      <CoffeeBean className="w-full" />
    </motion.div>
  );
}
/** Granos de café flotando a distintas profundidades (parallax al hacer scroll). */
export function FloatingBeans() {
  const calm = useCalmMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  if (calm) return null;
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-hidden -z-10 hidden xl:block">
      {BEANS.map((b, i) => <Bean key={i} b={b} progress={scrollYProgress} />)}
    </div>
  );
}
