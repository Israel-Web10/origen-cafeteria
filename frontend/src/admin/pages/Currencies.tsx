import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Currency, ExchangeRate } from '../../types';
import * as content from '../../services/contentService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { convertCents, formatDate, formatMoney } from '../../lib/format';
import { Field, PageHeader, Toggle } from '../ui';

/** Invierte "1 USD = X BOB" a "1 BOB = 1/X USD" con 8 decimales, sin floats acumulados relevantes. */
function invert(v: string): string | null {
  const n = Number(v.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  return (1 / n).toFixed(8);
}

export function Currencies() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const { settings, reload, baseCurrency } = useConfig();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [form, setForm] = useState({ quote_code: 'USD', mode: 'inverse' as 'inverse' | 'direct', value: '', rate_type: 'manual', source: '', notes: '' });

  const load = useCallback(() => {
    content.listCurrencies().then((r) => setCurrencies(r.currencies)).catch(() => {});
    content.rateHistory().then(setHistory).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const rate = form.mode === 'direct' ? (Number(form.value.replace(',', '.')) > 0 ? Number(form.value.replace(',', '.')).toFixed(8) : null) : invert(form.value);

  async function addRate() {
    if (!rate || !form.source.trim()) { notify(t('admin.currencies.invalid'), 'error'); return; }
    try {
      await content.addRate({ quote_code: form.quote_code, rate, rate_type: form.rate_type, source: form.source.trim(), notes: form.notes || undefined });
      notify(t('common.saved'), 'success'); setForm({ ...form, value: '', notes: '' }); load(); reload();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function toggle(c: Currency, enabled: boolean) {
    try { await content.updateCurrency(c.code, { enabled }); load(); reload(); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function setting(key: string, value: string) {
    try { await content.updateSettings({ [key]: value }); reload(); } catch (e) { notify(errorMessage(e), 'error'); }
  }

  const others = currencies.filter((c) => !c.is_base);
  return (
    <div className="max-w-5xl">
      <PageHeader title={t('admin.nav.currencies')} subtitle={t('admin.currencies.subtitle', { base: baseCurrency })} />
      <p className="card p-4 mb-6 text-sm border-l-4 border-l-gold">{t('admin.currencies.notice')}</p>

      <section className="card p-6 mb-6 grid sm:grid-cols-2 gap-4">
        <Toggle checked={settings.currency_display_enabled === 'true'} onChange={(v) => setting('currency_display_enabled', String(v))} label={t('admin.currencies.enableDisplay')} />
        <Field label={t('admin.currencies.rounding')}>
          <select className="input" value={settings.display_rounding || 'none'} onChange={(e) => setting('display_rounding', e.target.value)}>
            {['none', '0.05', '0.10', '0.50', '1'].map((r) => <option key={r} value={r}>{r === 'none' ? t('admin.currencies.noRounding') : r}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2 flex flex-wrap gap-4">
          {others.map((c) => <Toggle key={c.code} checked={c.enabled} onChange={(v) => toggle(c, v)} label={`${c.code} · ${c.name}`} />)}
        </div>
      </section>

      <section className="card p-6 mb-6">
        <h2 className="text-xl mb-4">{t('admin.currencies.newRate')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label={t('admin.currencies.currency')}><select className="input" value={form.quote_code} onChange={(e) => setForm({ ...form, quote_code: e.target.value })}>{others.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select></Field>
          <Field label={t('admin.currencies.entryMode')}>
            <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as 'inverse' | 'direct' })}>
              <option value="inverse">1 {form.quote_code} = X {baseCurrency}</option>
              <option value="direct">1 {baseCurrency} = X {form.quote_code}</option>
            </select>
          </Field>
          <Field label="X" hint={rate ? t('admin.currencies.stored', { base: baseCurrency, rate, quote: form.quote_code }) : undefined}><input className="input" inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label={t('admin.currencies.type')}>
            <select className="input" value={form.rate_type} onChange={(e) => setForm({ ...form, rate_type: e.target.value })}>
              {['oficial', 'comercial', 'manual'].map((k) => <option key={k} value={k}>{t(`currency.types.${k}`)}</option>)}
            </select>
          </Field>
          <Field label={`${t('admin.currencies.source')} *`} hint={t('admin.currencies.sourceHint')}><input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
          <Field label={t('admin.currencies.notes')}><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        {rate && <p className="text-sm text-charcoal/70 mt-3">{t('admin.currencies.example', { base: formatMoney(10000, baseCurrency, i18n.language), converted: formatMoney(convertCents(10000, rate), form.quote_code, i18n.language) })}</p>}
        <button className="btn-primary mt-4" onClick={addRate}>{t('admin.currencies.save')}</button>
      </section>

      <section className="card p-6 overflow-x-auto">
        <h2 className="text-xl mb-3">{t('admin.currencies.history')}</h2>
        <table className="table-base">
          <thead><tr><th>{t('admin.currencies.effective')}</th><th>{t('admin.currencies.pair')}</th><th className="text-right">{t('admin.currencies.rate')}</th><th>{t('admin.currencies.type')}</th><th>{t('admin.currencies.source')}</th><th>{t('admin.inventory.user')}</th></tr></thead>
          <tbody>{history.map((r) => (
            <tr key={r.id}>
              <td className="text-xs whitespace-nowrap">{formatDate(r.effective_at, i18n.language)}</td>
              <td>1 {r.base_code} → {r.quote_code}</td>
              <td className="text-right font-mono">{r.rate}<span className="block text-[11px] text-charcoal/50">1 {r.quote_code} = {(1 / Number(r.rate)).toFixed(4)} {r.base_code}</span></td>
              <td>{t(`currency.types.${r.rate_type}`)}</td>
              <td className="text-xs">{r.source}{r.notes ? ` · ${r.notes}` : ''}</td>
              <td className="text-xs">{r.created_by_name || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  );
}
