import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AnalyticsSummary, Insight } from '../../types';
import * as admin from '../../services/adminService';
import type { PeriodParams } from '../../services/adminService';
import { downloadFile, errorMessage } from '../../services/api';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatMoney, formatNumber, formatPercent } from '../../lib/format';
import { PeriodPicker, todayLocal } from '../PeriodPicker';
import { KpiCard, PageHeader } from '../ui';
import { BarChart, LineChart } from '../charts';
import { PageLoading } from '../../components/Loading';

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const { settings } = useConfig();
  const { notify } = useToast();
  const [params, setParams] = useState<PeriodParams>({ period: 'monthly', date: todayLocal(settings.timezone) });
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lang = i18n.language;

  useEffect(() => {
    if (params.period === 'custom' && (!params.from || !params.to)) return;
    setLoading(true);
    admin.analytics(params).then((d) => { setData(d); setError(null); }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [params]);

  const money = (c: number) => formatMoney(c, data?.currency || 'BOB', lang);
  const compact = (c: number) => formatNumber(c / 100, lang, 0);

  async function exportReport(type: string, format: 'pdf' | 'xlsx') {
    try { await downloadFile(`/reports/${type}/${format}`, { ...params, locale: lang }, `origen-${type}.${format}`); }
    catch (e) { notify(errorMessage(e), 'error'); }
  }

  if (!data && !error) return <PageLoading />;
  const k = data?.kpis;
  const days = ['', t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun')];

  return (
    <div className={loading ? 'opacity-70 transition-opacity' : ''}>
      <PageHeader
        title={t('admin.dash.title')}
        subtitle={data ? t('admin.dash.range', { from: data.range.from, to: data.range.lastDay, tz: data.range.timezone }) : undefined}
        actions={<>
          <button className="btn-outline btn-sm" onClick={() => exportReport('sales', 'pdf')}>PDF</button>
          <button className="btn-outline btn-sm" onClick={() => exportReport('sales', 'xlsx')}>Excel</button>
          <Link to="/admin/reportes" className="btn-primary btn-sm">{t('admin.nav.reports')}</Link>
        </>}
      />
      <PeriodPicker value={params} onChange={setParams} />
      {error && <p role="alert" className="text-rose mb-4">{error}</p>}
      {data && k && (
        <>
          {data.data_quality.days_with_sales_total === 0 && (
            <div className="card p-4 mb-6 border-l-4 border-l-gold text-sm">{t('admin.dash.noData')}</div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label={t('admin.dash.revenue')} value={money(k.revenue_cents)} change={data.comparison.previous.revenue_change} hint={t('admin.dash.revenueHint')} />
            <KpiCard label={t('admin.dash.orders')} value={formatNumber(k.orders, lang)} change={data.comparison.previous.orders_change} />
            <KpiCard label={t('admin.dash.avgTicket')} value={money(k.avg_ticket_cents)} />
            <KpiCard label={t('admin.dash.units')} value={formatNumber(k.units, lang)} />
            <KpiCard label={t('admin.dash.discounts')} value={money(k.discounts_cents)} />
            <KpiCard label={t('admin.dash.cancelled')} value={`${k.cancelled.orders} · ${money(k.cancelled.value_cents)}`} tone={k.cancelled.orders > 0 ? 'warn' : 'default'} />
            <KpiCard label={t('admin.dash.refunds')} value={`${k.refunds.count} · ${money(k.refunds.value_cents)}`} />
            <KpiCard
              label={t('admin.dash.margin')}
              value={k.margin.cents === null ? '—' : money(k.margin.cents)}
              hint={k.margin.cents === null ? t('admin.dash.marginMissing', { pct: Math.round(k.margin.coverage * 100) }) : t('admin.dash.marginEstimated')}
            />
          </div>

          <Insights items={data.insights} days={days} />

          <div className="grid xl:grid-cols-3 gap-6 mb-6">
            <section className="card p-5 xl:col-span-2">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <h2 className="text-xl">{t('admin.dash.salesTrend')}</h2>
                <p className="text-xs text-charcoal/60">— {t('admin.dash.daily')} · - - {t('admin.dash.movingAvg')} · ○ {t('admin.dash.anomaly')}</p>
              </div>
              <LineChart
                title={t('admin.dash.salesTrend')}
                data={data.series.map((s) => ({ label: s.date, value: s.revenue_cents }))}
                overlay={data.moving_average_7d.map((m) => m.value)}
                markers={data.anomalies.map((a) => a.date)}
                format={compact}
              />
              {data.anomalies.length > 0 && (
                <ul className="text-xs text-charcoal/70 mt-3 space-y-1">
                  {data.anomalies.map((a) => (
                    <li key={a.date}>⚠ {t('admin.dash.anomalyLine', { date: a.date, value: money(a.revenue_cents), expected: money(a.expected_cents) })}</li>
                  ))}
                </ul>
              )}
              <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                <div className="rounded-lg bg-almond/40 p-3">
                  <p className="text-xs text-charcoal/60">{t(data.comparison.basis === 'to_date' ? 'admin.dash.prevToDate' : 'admin.dash.prevPeriod', { from: (data.comparison.previous_range ?? data.range.previous).from, to: (data.comparison.previous_range ?? data.range.previous).to })}</p>
                  <p className="font-semibold">{money(data.comparison.previous.kpis.revenue_cents)} · {formatPercent(data.comparison.previous.revenue_change, lang)}</p>
                </div>
                <div className="rounded-lg bg-almond/40 p-3">
                  <p className="text-xs text-charcoal/60">{t('admin.dash.prevYear')}</p>
                  <p className="font-semibold">
                    {data.comparison.previous_year.kpis ? `${money(data.comparison.previous_year.kpis.revenue_cents)} · ${formatPercent(data.comparison.previous_year.revenue_change, lang)}` : t('admin.dash.noPrevYear')}
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-xl mb-1">{t('admin.dash.forecast')}</h2>
              <p className="text-xs text-rose mb-3">{t('admin.dash.forecastDisclaimer')}</p>
              {data.forecast.available ? (
                <ul className="divide-y divide-espresso/10 text-sm">
                  {data.forecast.days.map((d) => (
                    <li key={d.date} className="py-2 flex justify-between">
                      <span>{formatDate(`${d.date}T12:00:00`, lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="font-mono">≈ {money(d.expected_cents)}<span className="text-charcoal/50 text-xs"> ({money(d.low_cents)}–{money(d.high_cents)})</span></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal/70">{t('admin.dash.forecastMissing', { days: data.forecast.active_days, required: data.forecast.required_days })}</p>
              )}
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="card p-5">
              <h2 className="text-xl mb-3">{t('admin.dash.byHour')}</h2>
              <BarChart title={t('admin.dash.byHour')} data={data.time.hours.filter((h) => h.hour >= 6 && h.hour <= 23).map((h) => ({ label: `${h.hour}h`, value: h.orders }))} format={(v) => formatNumber(v, lang)}
                highlight={(() => { const hs = data.time.hours.filter((h) => h.hour >= 6); const m = Math.max(...hs.map((h) => h.orders)); return m ? hs.findIndex((h) => h.orders === m) : undefined; })()} />
            </section>
            <section className="card p-5">
              <h2 className="text-xl mb-3">{t('admin.dash.byWeekday')}</h2>
              <BarChart title={t('admin.dash.byWeekday')} data={data.time.weekdays.map((d) => ({ label: days[d.dow], value: d.revenue_cents }))} format={compact} />
            </section>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <section className="card p-5">
              <h2 className="text-xl mb-3">{t('admin.dash.byCategory')}</h2>
              <BarChart horizontal title={t('admin.dash.byCategory')} data={data.categories.map((c) => ({ label: c.name, value: c.revenue_cents }))} format={money} />
            </section>
            <section className="card p-5">
              <h2 className="text-xl mb-3">{t('admin.dash.byMethod')}</h2>
              <BarChart horizontal title={t('admin.dash.byMethod')} data={data.payment_methods.map((m) => ({ label: `${m.name} (${m.orders})`, value: m.total_cents }))} format={money} />
            </section>
            <section className="card p-5">
              <div className="flex justify-between items-center mb-3"><h2 className="text-xl">{t('admin.dash.inventory')}</h2><Link to="/admin/inventario" className="text-xs underline">{t('common.viewAll')}</Link></div>
              <ul className="text-sm divide-y divide-espresso/10">
                {data.inventory.slice(0, 8).map((i) => (
                  <li key={i.id} className="py-2 flex justify-between gap-2">
                    <span className={i.low ? 'text-rose font-semibold' : ''}>{i.low ? '⚠ ' : ''}{i.name}</span>
                    <span className="text-charcoal/60 text-xs text-right">{formatNumber(Number(i.quantity), lang, 1)} {i.unit}<br />{i.coverage_days !== null ? t('admin.dash.coverage', { days: i.coverage_days }) : t('admin.dash.noConsumption')}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <ProductTable title={t('admin.dash.top')} rows={data.products.top} money={money} />
            <ProductTable title={t('admin.dash.bottom')} rows={data.products.bottom} money={money} />
          </div>
          <p className="text-xs text-charcoal/50 mt-6">{t('admin.dash.abcHelp')}</p>
        </>
      )}
    </div>
  );
}

function ProductTable({ title, rows, money }: { title: string; rows: AnalyticsSummary['products']['top']; money: (c: number) => string }) {
  const { t, i18n } = useTranslation();
  return (
    <section className="card p-5 overflow-x-auto">
      <h2 className="text-xl mb-3">{title}</h2>
      <table className="table-base">
        <thead><tr><th>{t('admin.fields.product')}</th><th className="text-right">{t('admin.dash.units')}</th><th className="text-right">{t('admin.dash.revenue')}</th><th className="text-right">%</th><th>ABC</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.id}-${i}`}>
              <td>{r.name}</td>
              <td className="text-right">{formatNumber(r.units, i18n.language)}</td>
              <td className="text-right font-mono">{money(r.revenue_cents)}</td>
              <td className="text-right">{r.share !== undefined ? formatPercent(r.share, i18n.language).replace('+', '') : '—'}</td>
              <td>{r.class ? <span className={`badge ${r.class === 'A' ? 'bg-olive/15 text-olive' : r.class === 'B' ? 'bg-gold/15 text-gold-dark' : 'bg-rose/10 text-rose'}`}>{r.class}</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const INSIGHT_TONE: Record<Insight['severity'], string> = {
  warn: 'border-l-rose bg-rose/5',
  info: 'border-l-gold bg-gold/5',
  good: 'border-l-olive bg-olive/5',
};
const INSIGHT_ICON: Record<Insight['severity'], string> = { warn: '⚠', info: '💡', good: '▲' };

/** Recomendaciones por reglas (servidor). Sin IA externa: costo cero y explicables. */
function Insights({ items, days }: { items: Insight[]; days: string[] }) {
  const { t } = useTranslation();
  const text = (i: Insight) => {
    const p: Record<string, string | number> = { ...i.params };
    if (typeof p.dow === 'number') p.day = days[p.dow];
    if (typeof p.bestDow === 'number') p.bestDay = days[p.bestDow];
    return t(`admin.dash.insights.${i.code}`, p);
  };
  return (
    <section className="card p-5 mb-6" aria-labelledby="insights-title">
      <h2 id="insights-title" className="text-xl">{t('admin.dash.insights.title')}</h2>
      <p className="text-xs text-charcoal/60 mb-4">{t('admin.dash.insights.subtitle')}</p>
      {items.length ? (
        <ul className="grid md:grid-cols-2 gap-3">
          {items.map((i, n) => (
            <li key={`${i.code}-${n}`} className={`rounded-lg border-l-4 p-3 text-sm ${INSIGHT_TONE[i.severity]}`}>
              <span aria-hidden className="mr-1">{INSIGHT_ICON[i.severity]}</span>{text(i)}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-charcoal/60">{t('admin.dash.insights.none')}</p>}
      <details className="mt-4 text-xs text-charcoal/60">
        <summary className="cursor-pointer">{t('admin.dash.insights.aiTitle')}</summary>
        <p className="mt-1">{t('admin.dash.insights.aiText')}</p>
      </details>
    </section>
  );
}
