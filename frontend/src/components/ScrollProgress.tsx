// Barra fina dorada en la parte superior que indica cuánto se ha leído de la página.
import { motion, useScroll, useSpring } from 'framer-motion';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden className="fixed top-0 inset-x-0 h-[3px] bg-gold z-[60] origin-left pointer-events-none" style={{ scaleX }} />;
}
