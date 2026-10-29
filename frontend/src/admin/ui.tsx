import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Translations } from '../types';
import { formatPercent } from '../lib/format';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div><h1 className="text-3xl">{title}</h1>{subtitle && <p className="text-sm text-charcoal/60 mt-1 max-w-2xl">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({ label, value, change, hint, tone = 'default' }: { label: string; value: string; change?: number | null; hint?: string; tone?: 'default' | 'warn' }) {
  const { i18n, t } = useTranslation();
  return (
    <div className={`card p-4 ${tone === 'warn' ? 'border-l-4 border-l-rose' : ''}`}>
      <p className="text-xs uppercase tracking-wider text-charcoal/60 font-semibold">{label}</p>
      <p className="font-display text-2xl text-espresso mt-1">{value}</p>
      {change !== undefined && (
        <p className={`text-xs mt-1 ${change === null ? 'text-charcoal/40' : change >= 0 ? 'text-olive' : 'text-rose'}`}>
          {change === null ? t('admin.dash.noComparison') : `${formatPercent(change, i18n.language)} ${t('admin.dash.vsPrevious')}`}
        </p>
      )}
      {hint && <p className="text-[11px] text-charcoal/50 mt-1">{hint}</p>}
    </div>
  );
}

export function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
  const { t } = useTranslation();
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-charcoal/60">{t('admin.pagination', { from: offset + 1, to: Math.min(offset + limit, total), total })}</span>
      <div className="flex gap-2">
        <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => onChange(offset - limit)}>←</button>
        <span className="px-2 py-1">{page}/{pages}</span>
        <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => onChange(offset + limit)}>→</button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-olive' : 'bg-espresso/20'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      {label}
    </label>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-espresso/10 mb-6 overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${value === t.id ? 'border-gold text-espresso' : 'border-transparent text-charcoal/60 hover:text-espresso'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Edición de nombre/descripción en inglés y francés (el español es el campo principal). */
export function TranslationFields({ value, onChange, fields = ['name', 'description'] }: {
  value: Translations; onChange: (v: Translations) => void; fields?: ('name' | 'description' | 'ingredients')[];
}) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const entry = value[lang] || {};
  const set = (field: string, v: string) => onChange({ ...value, [lang]: { ...entry, [field]: v } });
  return (
    <fieldset className="rounded-xl border border-espresso/10 p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-espresso/70">{t('admin.translations')}</legend>
      <div className="flex gap-2 mb-3">{(['en', 'fr'] as const).map((l) => <button type="button" key={l} onClick={() => setLang(l)} className={`chip !py-1 ${lang === l ? 'chip-on' : 'chip-off'}`}>{l.toUpperCase()}</button>)}</div>
      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f} className="block">
            <span className="label">{t(`admin.fields.${f}`)} ({lang.toUpperCase()})</span>
            {f === 'name'
              ? <input className="input" value={entry[f] || ''} onChange={(e) => set(f, e.target.value)} />
              : <textarea className="input min-h-[70px]" value={entry[f] || ''} onChange={(e) => set(f, e.target.value)} />}
          </label>
        ))}
      </div>
      <p className="text-xs text-charcoal/50 mt-2">{t('admin.translationsHint')}</p>
    </fieldset>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-charcoal/50 mt-1">{hint}</span>}
    </label>
  );
}
