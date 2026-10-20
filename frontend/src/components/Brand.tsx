// Logotipo y elementos decorativos ORIGINALES (SVG dibujado para el proyecto,
// sin recursos de terceros). Si el gerente sube un logo oficial, se usa ese.
import { useConfig } from '../context/ConfigContext';
import { assetUrl } from '../services/api';

export function LogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="rgb(var(--c-espresso))" />
      <circle cx="32" cy="32" r="26.5" fill="none" stroke="rgb(var(--c-gold))" strokeWidth="1.2" opacity="0.7" />
      {/* vapor */}
      <path d="M27 14c-2 3 2 5 0 8M33 12c-2 3 2 5 0 8M39 14c-2 3 2 5 0 8" stroke="rgb(var(--c-cream))" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.85" />
      {/* taza */}
      <path d="M18 27h26v6c0 8-5.5 13-13 13s-13-5-13-13z" fill="rgb(var(--c-gold))" />
      <path d="M44 29.5h2.5a4.5 4.5 0 0 1 0 9H43" fill="none" stroke="rgb(var(--c-gold))" strokeWidth="2.6" />
      <path d="M15 48h32" stroke="rgb(var(--c-cream))" strokeWidth="2" strokeLinecap="round" />
      {/* hoja de cacao */}
      <path d="M24 35c4-5 10-5 14 0-4 5-10 5-14 0z" fill="rgb(var(--c-espresso))" opacity="0.55" />
    </svg>
  );
}

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  const { settings } = useConfig();
  const name = settings.business_name || 'ORIGEN';
  if (settings.logo_url) {
    return <img src={assetUrl(settings.logo_url)} alt={name} className={`h-10 w-auto object-contain ${className}`} />;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`font-display text-2xl tracking-[0.18em] ${light ? 'text-cream' : 'text-espresso'}`}>{name}</span>
    </span>
  );
}

export function CoffeeBean({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 56" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id="bean" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#7a4a2c" />
          <stop offset="70%" stopColor="#3b2216" />
          <stop offset="100%" stopColor="#1e110a" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="28" rx="17" ry="25" fill="url(#bean)" />
      <path d="M20 5c-6 8 6 15 0 23s6 15 0 23" stroke="#1a0e08" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CacaoPod({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 110" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="pod" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#d08a3c" />
          <stop offset="55%" stopColor="#9c4e22" />
          <stop offset="100%" stopColor="#5c2a12" />
        </linearGradient>
      </defs>
      <path d="M30 4c18 10 26 32 26 52S46 100 30 106C14 100 4 76 4 56S12 14 30 4z" fill="url(#pod)" />
      {[16, 30, 44].map((x) => (
        <path key={x} d={`M${x} 14c${x === 30 ? 0 : (x < 30 ? -4 : 4)} 25 ${x === 30 ? 0 : (x < 30 ? -4 : 4)} 60 0 86`} stroke="#5a2810" strokeWidth="1.6" fill="none" opacity="0.6" />
      ))}
      <path d="M30 4c-2-3 0-4 3-3" stroke="#3f5a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ChocolateSquare({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" className={className} style={style} aria-hidden="true">
      <rect x="3" y="3" width="54" height="54" rx="5" fill="#3a1c10" />
      {[0, 1].map((r) => [0, 1].map((c) => (
        <g key={`${r}${c}`}>
          <rect x={8 + c * 25} y={8 + r * 25} width="19" height="19" rx="2.5" fill="#55291a" />
          <path d={`M${8 + c * 25} ${8 + r * 25}h19l-3 3h-13z`} fill="#6e3824" />
        </g>
      )))}
    </svg>
  );
}

export function Steam({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute bottom-0 block w-6 h-24 rounded-full bg-gradient-to-t from-cream/0 via-cream/40 to-cream/0 blur-md animate-steam"
          style={{ left: `${i * 26}px`, animationDelay: `${i * 1.3}s` }}
        />
      ))}
    </div>
  );
}
