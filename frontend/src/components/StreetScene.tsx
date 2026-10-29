// Escena exterior: la calle frente a ORIGEN.
//
// La fachada es una ILUSTRACIÓN ORIGINAL de la marca (no una foto de otro local).
// Si el gerente sube una foto real de la fachada (Configuración → Identidad visual),
// se muestra la foto en su lugar.
//
// Movimientos de cámara:
//  - "Entrar": la cámara avanza hasta la puerta y la atraviesa (luego se ve el interior).
//  - "Ubicación": la cámara se inclina hacia arriba hasta una vista aérea y el mapa se
//    desplaza hasta el pin del local, antes de abrir la página Visítanos.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useAnimationControls, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useConfig, useCalmMotion } from '../context/ConfigContext';
import { assetUrl } from '../services/api';
import { openStatus, parseHours } from '../lib/hours';
import { Steam } from './Brand';

function hourIn(timeZone: string) {
  const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hour12: false }).format(new Date());
  return Number(h) % 24;
}

/** Mapa ilustrado de la zona (calles genéricas, sin nombres inventados) con el pin del local. */
export function CityMap({ className = '', pinLabel = 'ORIGEN' }: { className?: string; pinLabel?: string }) {
  return (
    <svg viewBox="0 0 1600 1000" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="1000" fill="#efe6d6" />
      {/* manzanas */}
      {Array.from({ length: 9 }).map((_, r) =>
        Array.from({ length: 12 }).map((__, c) => (
          <rect key={`${r}-${c}`} x={c * 140 + 18} y={r * 120 + 14} width="112" height="92" rx="6"
            fill={(r * 7 + c * 3) % 11 === 0 ? '#cfe0b8' : '#e2d6c2'} />
        )),
      )}
      {/* avenidas principales */}
      <path d="M-50 640 C 300 560, 700 700, 1650 470" stroke="#fffaf0" strokeWidth="46" fill="none" />
      <path d="M-50 640 C 300 560, 700 700, 1650 470" stroke="#d9c7a7" strokeWidth="2" strokeDasharray="18 14" fill="none" />
      <path d="M520 -40 L 760 1040" stroke="#fffaf0" strokeWidth="38" />
      {/* río */}
      <path d="M-40 140 C 260 220, 420 80, 700 170 S 1200 260, 1650 120" stroke="#a9c8d8" strokeWidth="30" fill="none" />
      {/* plaza */}
      <circle cx="1120" cy="300" r="70" fill="#cfe0b8" stroke="#fffaf0" strokeWidth="10" />
      {/* pin del local */}
      <g transform="translate(800 520)">
        <circle r="120" fill="rgb(var(--c-gold))" opacity="0.18">
          <animate attributeName="r" values="60;130;60" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <path d="M0 0 C -34 -46 -46 -64 -46 -86 A 46 46 0 1 1 46 -86 C 46 -64 34 -46 0 0 Z" fill="rgb(var(--c-espresso))" />
        <circle cy="-88" r="20" fill="rgb(var(--c-gold))" />
        <rect x="-78" y="16" width="156" height="40" rx="20" fill="rgb(var(--c-espresso))" />
        <text y="43" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="24" letterSpacing="5" fill="rgb(var(--c-cream))">{pinLabel}</text>
      </g>
    </svg>
  );
}

function Facade({ name, isOpen, openLabel, interior }: { name: string; isOpen: boolean; openLabel: string; interior?: string }) {
  // Ventanas que muestran el interior real (fotograma del video) con luz cálida
  const windowImg = (x: number, y: number, w: number, h: number, id: string) => (
    <g>
      <clipPath id={id}><rect x={x} y={y} width={w} height={h} rx="6" /></clipPath>
      <rect x={x} y={y} width={w} height={h} rx="6" fill="#3b2416" />
      {interior && <image href={interior} x={x - 120} y={y - 80} width={w + 240} height={h + 160} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} opacity="0.92" />}
      <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#glass)" />
      <rect x={x} y={y} width={w} height={h} rx="6" fill="none" stroke="#1d120b" strokeWidth="12" />
    </g>
  );
  return (
    <g>
      {/* muro */}
      <rect x="330" y="150" width="940" height="690" fill="url(#wall)" />
      <rect x="330" y="150" width="940" height="30" fill="#5a3826" />
      {Array.from({ length: 13 }).map((_, i) => <line key={i} x1="330" x2="1270" y1={210 + i * 48} y2={210 + i * 48} stroke="#000" opacity="0.05" />)}
      {/* letrero */}
      <g>
        <rect x="560" y="200" width="480" height="104" rx="14" fill="rgb(var(--c-espresso))" stroke="rgb(var(--c-gold))" strokeWidth="4" />
        <circle cx="618" cy="252" r="30" fill="rgb(var(--c-gold))" />
        <path d="M604 248h28v6c0 8-6 13-14 13s-14-5-14-13z" fill="rgb(var(--c-espresso))" />
        <text x="830" y="268" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="58" letterSpacing="14" fill="rgb(var(--c-cream))">{name}</text>
        <rect x="560" y="200" width="480" height="104" rx="14" fill="url(#signGlow)" opacity="0.6" />
      </g>
      {/* toldo */}
      <g>
        <clipPath id="awning"><path d="M360 340 h880 l-40 70 h-800 z" /></clipPath>
        <g clipPath="url(#awning)">
          {Array.from({ length: 22 }).map((_, i) => <rect key={i} x={360 + i * 40} y="340" width="40" height="70" fill={i % 2 ? 'rgb(var(--c-cream))' : 'rgb(var(--c-espresso))'} />)}
          <rect x="360" y="398" width="880" height="12" fill="#000" opacity="0.18" />
        </g>
        {Array.from({ length: 20 }).map((_, i) => <path key={i} d={`M${400 + i * 40} 410 q20 26 40 0 z`} fill={i % 2 ? 'rgb(var(--c-cream))' : 'rgb(var(--c-espresso))'} />)}
      </g>
      {/* ventanas y puerta */}
      {windowImg(380, 470, 280, 250, 'w1')}
      {windowImg(940, 470, 280, 250, 'w2')}
      {windowImg(700, 450, 200, 350, 'door')}
      <line x1="800" y1="450" x2="800" y2="800" stroke="#1d120b" strokeWidth="8" />
      <rect x="776" y="610" width="8" height="46" rx="4" fill="rgb(var(--c-gold-light))" />
      <rect x="816" y="610" width="8" height="46" rx="4" fill="rgb(var(--c-gold-light))" />
      {/* letrero abierto/cerrado (horario real del negocio) */}
      <g transform="translate(800 505)">
        <rect x="-62" y="-20" width="124" height="40" rx="8" fill={isOpen ? '#2f6b3a' : '#7a2b2e'} />
        <text textAnchor="middle" y="8" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="18" letterSpacing="3" fill="#fff">{openLabel}</text>
      </g>
      {/* marco de puerta, escalón y macetas */}
      <rect x="690" y="800" width="220" height="40" fill="#6e4b36" />
      {[[350, 760], [1180, 760]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0 h70 l-10 80 h-50 z" fill="rgb(var(--c-olive))" />
          {Array.from({ length: 7 }).map((__, j) => <ellipse key={j} cx={35 + (j - 3) * 9} cy={-30 - (j % 3) * 18} rx="14" ry="40" fill="#4f7a3a" transform={`rotate(${(j - 3) * 16} ${35 + (j - 3) * 9} 0)`} />)}
        </g>
      ))}
      {/* banca */}
      <g transform="translate(980 760)">
        <rect width="200" height="16" rx="4" fill="#5a3826" /><rect x="10" y="16" width="12" height="60" fill="#3b2416" /><rect x="178" y="16" width="12" height="60" fill="#3b2416" />
      </g>
      {/* guirnalda de luces */}
      <path d="M340 330 Q 800 400 1260 330" stroke="#2a1a12" strokeWidth="2" fill="none" />
      {Array.from({ length: 18 }).map((_, i) => {
        const t = i / 17; const x = 340 + t * 920; const y = 330 + Math.sin(t * Math.PI) * 35;
        return <circle key={i} cx={x} cy={y + 6} r="6" fill="#ffd38a" className="animate-flicker" style={{ animationDelay: `${(i % 5) * 0.6}s` }} />;
      })}
    </g>
  );
}

export function StreetScene({ onEnter }: { onEnter: () => void }) {
  const { t } = useTranslation();
  const { settings } = useConfig();
  const calm = useCalmMotion();
  const navigate = useNavigate();
  const camera = useAnimationControls();
  const mapCam = useAnimationControls();
  const [mode, setMode] = useState<'idle' | 'entering' | 'locating'>('idle');
  const tz = settings.timezone || 'America/La_Paz';
  const night = useMemo(() => { const h = hourIn(tz); return h < 6 || h >= 19; }, [tz]);
  const status = openStatus(parseHours(settings.opening_hours), tz);
  const name = settings.business_name || 'ORIGEN';
  const photo = assetUrl(settings.facade_image_url);
  const interior = assetUrl(settings.hero_poster_url || '/media/cafe-interior-poster.webp');

  // Parallax por puntero (capas a distinta profundidad)
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const far = { x: useSpring(useTransform(px, [-1, 1], [-8, 8]), { stiffness: 50, damping: 20 }), y: useSpring(useTransform(py, [-1, 1], [-4, 4]), { stiffness: 50, damping: 20 }) };
  const mid = { x: useSpring(useTransform(px, [-1, 1], [-20, 20]), { stiffness: 50, damping: 20 }), y: useSpring(useTransform(py, [-1, 1], [-8, 8]), { stiffness: 50, damping: 20 }) };
  const near = { x: useSpring(useTransform(px, [-1, 1], [-42, 42]), { stiffness: 50, damping: 20 }), y: useSpring(useTransform(py, [-1, 1], [-14, 14]), { stiffness: 50, damping: 20 }) };
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

  const withTimeout = (p: Promise<unknown>, ms: number) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

  async function enter() {
    if (calm) { onEnter(); return; }
    setMode('entering');
    // La cámara avanza hacia la puerta (centro del edificio) y la atraviesa
    await withTimeout(camera.start({ scale: 4.2, y: '-6%', filter: 'brightness(1.5) blur(6px)', transition: { duration: 1.05, ease: [0.55, 0, 0.25, 1] } }), 1300);
    onEnter();
  }

  async function locate() {
    if (calm) { navigate('/visitanos'); return; }
    setMode('locating');
    // La calle se inclina hacia abajo (cámara mirando desde el aire) y aparece el mapa
    await withTimeout(Promise.all([
      camera.start({ rotateX: 62, y: '38%', scale: 0.55, opacity: 0, transition: { duration: 1.1, ease: [0.5, 0, 0.3, 1] } }),
      mapCam.start({ opacity: 1, scale: [2.6, 1.15], x: ['18%', '0%'], y: ['-14%', '0%'], transition: { duration: 1.8, ease: [0.3, 0, 0.2, 1] } }),
    ]), 2100);
    navigate('/visitanos');
  }

  const sky = night ? ['#0e1530', '#2a2350', '#7a4a3a'] : ['#7fb3d9', '#bcd6e6', '#f2d6b0'];

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden text-cream" style={{ background: sky[0] }} aria-label={t('home.street.label')}>
      <div className="absolute inset-0" style={{ perspective: '1100px', perspectiveOrigin: '50% 60%' }}>
        {/* Mapa (vista aérea) que aparece al buscar la ubicación */}
        <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={mapCam} style={{ transformOrigin: '50% 52%' }}>
          <CityMap className="w-full h-full" pinLabel={name} />
        </motion.div>

        <motion.div className="absolute inset-0" animate={camera} style={{ transformOrigin: '62% 66%', transformStyle: 'preserve-3d' }}>
          <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" role="img" aria-label={t('home.street.alt', { name })}>
            <defs>
              <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={sky[0]} /><stop offset="0.6" stopColor={sky[1]} /><stop offset="1" stopColor={sky[2]} />
              </linearGradient>
              <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={night ? '#7d5240' : '#c98f6b'} /><stop offset="1" stopColor={night ? '#5b3a2c' : '#a8704f'} />
              </linearGradient>
              <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.18" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#ffb860" stopOpacity="0.25" />
              </linearGradient>
              <radialGradient id="signGlow"><stop offset="0" stopColor="#ffd38a" stopOpacity="0.5" /><stop offset="1" stopColor="#ffd38a" stopOpacity="0" /></radialGradient>
              <radialGradient id="lamp"><stop offset="0" stopColor="#ffe2a8" stopOpacity="0.9" /><stop offset="1" stopColor="#ffe2a8" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width="1600" height="1000" fill="url(#sky)" />
            {night && Array.from({ length: 60 }).map((_, i) => (
              <circle key={i} cx={(i * 263) % 1600} cy={(i * 97) % 380} r={i % 7 === 0 ? 1.8 : 1} fill="#fff" opacity={0.4 + (i % 5) * 0.1} />
            ))}
            {/* Illimani (capa lejana) */}
            <motion.g style={calm ? undefined : far}>
              <path d="M0 520 L220 360 L330 420 L520 250 L610 300 L700 210 L820 320 L960 280 L1120 380 L1300 330 L1600 470 L1600 620 L0 620 Z" fill={night ? '#3b3f66' : '#8fa3bf'} />
              <path d="M470 290 L520 250 L560 280 L540 290 L520 278 L500 296 Z M660 240 L700 210 L745 250 L720 256 L700 236 L684 258 Z M920 296 L960 280 L1000 304 L975 304 L960 294 L945 306 Z" fill="#f6f4f0" opacity="0.9" />
            </motion.g>
            {/* Ciudad en las laderas */}
            <motion.g style={calm ? undefined : mid}>
              <path d="M0 600 C 300 520, 500 560, 800 540 S 1300 520, 1600 580 L1600 760 L0 760 Z" fill={night ? '#2b2342' : '#b9a88f'} />
              {Array.from({ length: 140 }).map((_, i) => {
                const x = (i * 113) % 1600; const y = 560 + ((i * 37) % 160);
                return <rect key={i} x={x} y={y} width="10" height="7" fill={night ? '#ffcf7a' : '#e9dcc6'} opacity={night ? 0.25 + (i % 4) * 0.15 : 0.6} />;
              })}
            </motion.g>
            {/* Edificio de ORIGEN (o foto real de la fachada) */}
            <motion.g style={calm ? undefined : near}>
              {photo ? (
                <image href={photo} x="560" y="160" width="980" height="690" preserveAspectRatio="xMidYMid slice" />
              ) : (
                <g transform="translate(330 150) scale(0.82)">
                  <Facade name={name} isOpen={status.open} openLabel={status.open ? t('home.street.open') : t('home.street.closed')} interior={interior} />
                </g>
              )}
              {/* acera y calle */}
              <rect x="0" y="838" width="1600" height="40" fill={night ? '#5b5250' : '#b7aca0'} />
              <rect x="0" y="878" width="1600" height="122" fill={night ? '#2e2a2e' : '#6f6a68'} />
              {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={i * 220 + 40} y="935" width="120" height="8" fill="#e8e0d0" opacity="0.6" />)}
              {/* farola */}
              <g transform="translate(200 470)">
                <rect x="-6" y="0" width="12" height="370" fill="#1d1a1a" />
                <rect x="-26" y="-20" width="52" height="34" rx="6" fill="#1d1a1a" />
                <circle cy="20" r={night ? 150 : 60} fill="url(#lamp)" opacity={night ? 1 : 0.4} />
              </g>
            </motion.g>
          </svg>
          {!calm && <Steam className="absolute left-[61%] top-[46%] -translate-x-1/2 w-24 h-24" />}
        </motion.div>
      </div>

      {/* Viñeta y contenido */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgb(0 0 0 / 0.45) 0%, transparent 30%, transparent 62%, rgb(0 0 0 / 0.55) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none hidden md:block" style={{ background: 'linear-gradient(90deg, rgb(var(--c-espresso) / 0.75) 0%, rgb(var(--c-espresso) / 0.35) 38%, transparent 60%)' }} />
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 section pb-10 sm:pb-14"
        animate={{ opacity: mode === 'idle' ? 1 : 0, y: mode === 'idle' ? 0 : 30 }}
        transition={{ duration: 0.4 }}
      >
        <p className="eyebrow !text-gold-light mb-2">{settings.slogan || t('home.eyebrow')}</p>
        <h1 className="text-4xl sm:text-6xl text-cream text-glow max-w-xl mb-6">{t('home.street.title', { name })}</h1>
        <div className="flex flex-wrap gap-3">
          <button className="btn-gold text-base !px-8 !py-4" onClick={enter} disabled={mode !== 'idle'}>{t('home.street.enter')} <span aria-hidden>→</span></button>
          <button className="btn-glass" onClick={locate} disabled={mode !== 'idle'}>📍 {t('home.street.locate')}</button>
          <button className="btn-glass" onClick={() => navigate('/carta')} disabled={mode !== 'idle'}>{t('home.ctaMenu')}</button>
        </div>
        <p className="text-[11px] text-cream/70 mt-4">{photo ? t('home.street.photoNote') : t('home.street.illustration')}</p>
      </motion.div>
    </section>
  );
}
