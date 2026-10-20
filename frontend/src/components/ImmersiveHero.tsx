// Escena de entrada a la cafetería.
//
// Profundidad real con perspectiva CSS 3D (sin WebGL): cada capa vive a una
// distancia Z distinta, así que al mover el puntero o hacer scroll se desplazan
// a velocidades diferentes (parallax verdadero) y la "cámara" puede avanzar
// hacia dentro del local. El video se carga en diferido y solo si el equipo y
// las preferencias del usuario lo permiten; si no, queda la imagen fija.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useAnimationControls, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { assetUrl } from '../services/api';
import { CacaoPod, ChocolateSquare, CoffeeBean, LogoMark, Steam } from './Brand';

interface Decor { kind: 'bean' | 'pod' | 'choc'; x: string; y: string; z: number; size: string; r: number; delay: number; mobile?: boolean }

const DECOR: Decor[] = [
  { kind: 'bean', x: '8%', y: '22%', z: 260, size: 'w-10', r: -20, delay: 0, mobile: true },
  { kind: 'pod', x: '84%', y: '16%', z: 180, size: 'w-16', r: 18, delay: 1.2 },
  { kind: 'bean', x: '76%', y: '68%', z: 320, size: 'w-12', r: 35, delay: 0.6, mobile: true },
  { kind: 'choc', x: '14%', y: '72%', z: 220, size: 'w-14', r: -12, delay: 2 },
  { kind: 'bean', x: '58%', y: '12%', z: 120, size: 'w-6', r: 60, delay: 1.6 },
  { kind: 'bean', x: '30%', y: '84%', z: 380, size: 'w-8', r: -45, delay: 0.3 },
  { kind: 'choc', x: '92%', y: '48%', z: 90, size: 'w-10', r: 25, delay: 2.4 },
];

function webmFor(url: string) {
  return url.startsWith('/media/') && url.endsWith('.mp4') ? url.replace(/\.mp4$/, '.webm') : null;
}

export function ImmersiveHero() {
  const { t, i18n } = useTranslation();
  const { settings } = useConfig();
  const calm = useCalmMotion();
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [entering, setEntering] = useState(false);
  const camera = useAnimationControls();

  // Puntero → rotación suave de la escena
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotY = useSpring(useTransform(px, [-1, 1], [-4, 4]), { stiffness: 60, damping: 18 });
  const rotX = useSpring(useTransform(py, [-1, 1], [3, -3]), { stiffness: 60, damping: 18 });
  const shiftX = useSpring(useTransform(px, [-1, 1], [-24, 24]), { stiffness: 50, damping: 20 });
  const shiftY = useSpring(useTransform(py, [-1, 1], [-16, 16]), { stiffness: 50, damping: 20 });

  // Scroll → la cámara avanza hacia el interior
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const dollyScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const dollyBlur = useTransform(scrollYProgress, [0, 0.8], ['blur(0px)', 'blur(6px)']);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    if (calm || !settings.hero_video_url) return;
    // Cargar el video cuando el navegador está libre (no bloquea la carga inicial)
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setLoadVideo(true)) : window.setTimeout(() => setLoadVideo(true), 1200);
    return () => { if (!w.requestIdleCallback) clearTimeout(id); };
  }, [calm, settings.hero_video_url]);

  useEffect(() => {
    if (calm) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px.set((e.clientX / window.innerWidth) * 2 - 1);
      py.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [calm, px, py]);

  /** Avanza la cámara hacia el local y luego navega (la transición de página continúa el movimiento). */
  async function enter(to: string) {
    if (calm) { navigate(to); return; }
    setEntering(true);
    // La animación nunca debe bloquear la navegación (p. ej. pestaña en segundo plano sin requestAnimationFrame)
    await Promise.race([
      camera.start({ scale: 2.1, filter: 'blur(14px) brightness(1.35)', transition: { duration: 0.75, ease: [0.6, 0, 0.3, 1] } }),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
    navigate(to);
  }

  const lang = i18n.language;
  const title = settings[`hero_title_${lang}`] || settings.hero_title_es || t('home.heroTitle');
  const subtitle = settings[`hero_subtitle_${lang}`] || settings.hero_subtitle_es || '';
  const poster = assetUrl(settings.hero_poster_url);
  const video = settings.hero_video_url;

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[620px] overflow-hidden bg-espresso text-cream" aria-label={t('home.heroLabel')}>
      <div className="scene absolute inset-0">
        <motion.div className="scene-world absolute inset-0" style={calm ? undefined : { rotateX: rotX, rotateY: rotY, scale: dollyScale, filter: dollyBlur }}>
          <motion.div className="absolute inset-0" animate={camera} style={{ transformOrigin: '55% 55%' }}>
            {/* Capa 0: el local */}
            <div className="scene-layer" style={{ transform: 'translateZ(-160px) scale(1.18)' }}>
              {poster && <img src={poster} alt="" {...{ fetchpriority: 'high' }} className="absolute inset-0 w-full h-full object-cover" />}
              {loadVideo && video && (
                <video
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                  autoPlay muted loop playsInline preload="auto" poster={poster} aria-hidden="true"
                  onCanPlay={() => setVideoReady(true)}
                >
                  {webmFor(video) && <source src={webmFor(video)!} type="video/webm" />}
                  <source src={assetUrl(video)} type="video/mp4" />
                </video>
              )}
            </div>
            {/* Capa 1: luz cálida que respira */}
            <div className="scene-layer warm-light animate-flicker" style={{ transform: 'translateZ(-40px)' }} />
            {/* Capa 2: viñeta y grano */}
            <div className="scene-layer vignette" />
            <div className="scene-layer grain opacity-70" />
            {/* Capa 3: elementos de café, cacao y chocolate en primer plano */}
            {!calm && (
              <motion.div className="scene-layer" style={{ x: shiftX, y: shiftY }} aria-hidden="true">
                {DECOR.map((d, i) => {
                  const Comp = d.kind === 'bean' ? CoffeeBean : d.kind === 'pod' ? CacaoPod : ChocolateSquare;
                  return (
                    <div key={i} className={`absolute ${d.mobile ? '' : 'hidden md:block'}`} style={{ left: d.x, top: d.y, transform: `translateZ(${d.z}px)` }}>
                      <Comp className={`${d.size} drop-shadow-[0_18px_20px_rgba(0,0,0,0.55)] animate-float`} style={{ animationDelay: `${d.delay}s`, ['--r' as string]: `${d.r}deg` } as React.CSSProperties} />
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Contenido */}
      <motion.div className="relative z-10 h-full section flex flex-col justify-center pt-16" style={calm ? undefined : { y: contentY, opacity: contentOpacity }}>
        <motion.div initial={calm ? false : { opacity: 0, y: 30 }} animate={{ opacity: entering ? 0 : 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }} className="max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <LogoMark className="w-12 h-12" />
            <span className="eyebrow !text-gold-light">{settings.slogan || t('home.eyebrow')}</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[0.98] text-cream text-glow mb-6">{title}</h1>
          {subtitle && <p className="text-lg sm:text-xl text-cream/80 max-w-xl mb-9 text-glow">{subtitle}</p>}
          <div className="flex flex-wrap gap-3">
            <button className="btn-gold text-base !px-8 !py-4" onClick={() => enter('/carta')}>
              {t('home.ctaMenu')} <span aria-hidden>→</span>
            </button>
            <button className="btn-glass" onClick={() => enter('/la-cafeteria')}>{t('home.ctaInside')}</button>
            <button className="btn-glass" onClick={() => enter('/historia')}>{t('home.ctaStory')}</button>
            <button className="btn-glass" onClick={() => enter('/visitanos')}>{t('home.ctaVisit')}</button>
          </div>
        </motion.div>
      </motion.div>

      {/* Vapor saliendo de la barra */}
      {!calm && <Steam className="absolute bottom-24 left-1/2 -translate-x-1/2 w-24 h-28 z-10" />}

      {settings.hero_is_illustrative === 'true' && (
        <p className="absolute bottom-4 left-4 z-10 text-[11px] text-cream/60 bg-espresso/50 backdrop-blur px-3 py-1 rounded-full">{t('home.illustrative')}</p>
      )}
      <motion.a
        href="#explorar"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-cream/70 text-xs tracking-[0.3em] uppercase flex flex-col items-center gap-2"
        animate={calm ? undefined : { y: [0, 8, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
      >
        {t('home.scroll')}<span aria-hidden>↓</span>
      </motion.a>

      {/* Destello de luz al cruzar la puerta */}
      {entering && <motion.div className="absolute inset-0 z-20 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}
        style={{ background: 'radial-gradient(circle at 55% 55%, rgb(255 214 160 / 0.55), rgb(var(--c-espresso) / 0.9) 70%)' }} />}
    </section>
  );
}

/** Cabecera con profundidad para páginas internas (imagen + parallax de scroll). */
export function SceneBand({ title, eyebrow, subtitle, image, children }: { title: string; eyebrow?: string; subtitle?: string; image?: string; children?: React.ReactNode }) {
  const calm = useCalmMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  return (
    <section ref={ref} className="relative overflow-hidden bg-espresso text-cream pt-16">
      {image && (
        <motion.img src={image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-45" style={calm ? undefined : { y, scale }} />
      )}
      <div className="absolute inset-0 vignette" aria-hidden />
      <div className="absolute inset-0 warm-light" aria-hidden />
      <div className="relative section py-16 md:py-24">
        <motion.div initial={calm ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
          {eyebrow && <p className="eyebrow !text-gold-light mb-3">{eyebrow}</p>}
          <h1 className="text-4xl md:text-6xl text-cream text-glow">{title}</h1>
          {subtitle && <p className="text-cream/75 mt-4 max-w-2xl text-lg">{subtitle}</p>}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
