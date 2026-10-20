// Gráficos SVG ligeros y accesibles (sin librerías). Cada gráfico incluye un
// título accesible y una tabla de datos alternativa para lectores de pantalla.
import { useId, useState } from 'react';

interface Point { label: string; value: number }

const nice = (max: number) => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / pow) * pow;
};

export function LineChart({ data, overlay, markers = [], format, title, height = 220 }: {
  data: Point[]; overlay?: (number | null)[]; markers?: string[]; format: (v: number) => string; title: string; height?: number;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const max = nice(Math.max(...data.map((d) => d.value), ...(overlay || []).map((v) => v ?? 0), 1));
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (data.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const area = `${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ma = overlay?.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean) as string[] | undefined;
  const step = Math.max(1, Math.ceil(data.length / 10));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{title}</title>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-gold))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--c-gold))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="rgb(var(--c-espresso) / 0.08)" />
            <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="rgb(var(--c-charcoal) / 0.6)">{format(max * f)}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${id}-g)`} />
        <path d={path} fill="none" stroke="rgb(var(--c-gold-dark))" strokeWidth="2" />
        {ma && ma.length > 1 && <polyline points={ma.join(' ')} fill="none" stroke="rgb(var(--c-espresso))" strokeWidth="1.5" strokeDasharray="5 4" />}
        {data.map((d, i) => (
          <g key={i}>
            {markers.includes(d.label) && <circle cx={x(i)} cy={y(d.value)} r="6" fill="none" stroke="rgb(var(--c-rose))" strokeWidth="2" />}
            <rect x={x(i) - (W / data.length) / 2} y={pad.t} width={W / data.length} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgb(var(--c-charcoal) / 0.6)">{d.label.slice(5)}</text>}
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--c-espresso) / 0.3)" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="rgb(var(--c-gold-dark))" />
            <rect x={Math.min(x(hover) + 8, W - 150)} y={pad.t} width="140" height="34" rx="6" fill="rgb(var(--c-espresso))" />
            <text x={Math.min(x(hover) + 16, W - 142)} y={pad.t + 14} fontSize="10" fill="rgb(var(--c-cream))">{data[hover].label}</text>
            <text x={Math.min(x(hover) + 16, W - 142)} y={pad.t + 27} fontSize="11" fontWeight="600" fill="rgb(var(--c-cream))">{format(data[hover].value)}</text>
          </g>
        )}
      </svg>
      <DataTable rows={data} format={format} caption={title} />
    </figure>
  );
}

export function BarChart({ data, format, title, horizontal = false, highlight }: {
  data: Point[]; format: (v: number) => string; title: string; horizontal?: boolean; highlight?: number;
}) {
  const id = useId();
  const max = Math.max(...data.map((d) => d.value), 1);
  if (horizontal) {
    return (
      <figure aria-labelledby={`${id}-t`}>
        <figcaption id={`${id}-t`} className="sr-only">{title}</figcaption>
        <ul className="space-y-2">
          {data.map((d, i) => (
            <li key={i} className="text-sm">
              <div className="flex justify-between gap-2 mb-1"><span className="truncate">{d.label}</span><span className="font-mono text-charcoal/70">{format(d.value)}</span></div>
              <div className="h-2.5 bg-almond/60 rounded-full overflow-hidden"><div className="h-full bg-gold rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </figure>
    );
  }
  const W = 720;
  const H = 180;
  const bw = W / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-auto" role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{title}</title>
        {data.map((d, i) => {
          const h = (d.value / max) * H;
          return (
            <g key={i}>
              <rect x={i * bw + bw * 0.15} y={H - h} width={bw * 0.7} height={h} rx="3" fill={highlight === i ? 'rgb(var(--c-espresso))' : 'rgb(var(--c-gold))'}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
              <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="rgb(var(--c-charcoal) / 0.6)">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <DataTable rows={data} format={format} caption={title} />
    </figure>
  );
}

function DataTable({ rows, format, caption }: { rows: Point[]; format: (v: number) => string; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r.label}</th><td>{format(r.value)}</td></tr>)}</tbody>
    </table>
  );
}
