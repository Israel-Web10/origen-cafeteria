import type { Variants } from 'framer-motion';

/**
 * Tipo de movimiento de "cámara" según el destino, para que navegar se sienta
 * como recorrer el local:
 *  - forward: avanzar hacia dentro (carta, producto, checkout)
 *  - back:    retroceder hacia la entrada (volver al inicio)
 *  - lateral: desplazarse a otro espacio (la cafetería, visítanos)
 *  - rise:    subir/descubrir (historia, promociones)
 *  - calm:    fundido simple (legales, cuenta, panel, movimiento reducido)
 */
export type TransitionKind = 'forward' | 'back' | 'lateral' | 'rise' | 'calm';

const DEPTH: Record<string, number> = {
  '/': 0, '/historia': 1, '/la-cafeteria': 1, '/visitanos': 1, '/promociones': 1,
  '/carta': 2, '/producto': 3, '/carrito': 3, '/checkout': 4, '/pedido': 5,
};

function depthOf(path: string): number | null {
  if (path === '/') return 0;
  const seg = '/' + path.split('/')[1];
  return seg in DEPTH ? DEPTH[seg] : null;
}

export function kindFor(to: string, from: string | null): TransitionKind {
  const seg = '/' + to.split('/')[1];
  if (['/historia', '/promociones'].includes(seg)) return 'rise';
  if (['/la-cafeteria', '/visitanos'].includes(seg)) return 'lateral';
  const a = from ? depthOf(from) : 0;
  const b = depthOf(to);
  if (a === null || b === null) return 'calm';
  if (b > a) return 'forward';
  if (b < a) return 'back';
  return 'lateral';
}

const ease = [0.22, 0.8, 0.2, 1] as const;

export const pageVariants: Variants = {
  initial: (k: TransitionKind) => ({
    forward: { opacity: 0, scale: 0.94, filter: 'blur(8px)' },
    back: { opacity: 0, scale: 1.06, filter: 'blur(6px)' },
    lateral: { opacity: 0, x: 70, filter: 'blur(4px)' },
    rise: { opacity: 0, y: 50, filter: 'blur(4px)' },
    calm: { opacity: 0 },
  }[k]),
  enter: (k: TransitionKind) => ({
    opacity: 1, scale: 1, x: 0, y: 0, filter: 'blur(0px)',
    transition: { duration: k === 'calm' ? 0.18 : 0.55, ease },
  }),
  exit: (k: TransitionKind) => ({
    ...{
      forward: { opacity: 0, scale: 1.14, filter: 'blur(10px)' },
      back: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
      lateral: { opacity: 0, x: -70, filter: 'blur(4px)' },
      rise: { opacity: 0, y: -40, filter: 'blur(4px)' },
      calm: { opacity: 0 },
    }[k],
    // La página que sale queda superpuesta: no debe capturar clics
    pointerEvents: 'none',
    transition: { duration: k === 'calm' ? 0.12 : 0.38, ease },
  }),
};

/** Aparición escalonada de listas (productos, tarjetas). */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease } },
};
