import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadFile, errorMessage } from '../../services/api';
import type { PeriodParams } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { PeriodPicker, todayLocal } from '../PeriodPicker';
import { PageHeader } from '../ui';

const TYPES = ['sales', 'orders', 'products', 'categories', 'top_products', 'bottom_products', 'payment_methods', 'inventory', 'movements',
  'cancellations', 'refunds', 'margins', 'comparison', 'audit'] as const;

export function Reports() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const { settings } = useConfig();
  const { isAdmin } = useAuth();
  const [params, setParams] = useState<PeriodParams>({ period: 'monthly', date: todayLocal(settings.timezone) });
  const [locale, setLocale] = useState(i18n.language);
  const [busy, setBusy] = useState<string | null>(null);

  async function download(type: string, format: 'pdf' | 'xlsx') {
    setBusy(`${type}.${format}`);
    try { await downloadFile(`/reports/${type}/${format}`, { ...params, locale }, `origen-${type}.${format}`); }
    catch (e) { notify(errorMessage(e), 'error'); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title={t('admin.nav.reports')} subtitle={t('admin.reports.subtitle')} />
      <PeriodPicker value={params} onChange={setParams} />
      <label className="inline-flex items-center gap-2 mb-6 text-sm"><span className="label !mb-0">{t('admin.reports.language')}</span>
        <select className="input !w-auto !py-1.5" value={locale} onChange={(e) => setLocale(e.target.value)}><option value="es">Español</option><option value="en">English</option><option value="fr">Français</option></select>
      </label>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {TYPES.filter((type) => type !== 'audit' || isAdmin).map((type) => (
          <div key={type} className="card p-5 flex flex-col">
            <h2 className="text-lg">{t(`admin.reports.types.${type}`)}</h2>
            <p className="text-sm text-charcoal/60 flex-1 mt-1">{t(`admin.reports.desc.${type}`)}</p>
            <div className="flex gap-2 mt-4">
              <button className="btn-primary btn-sm" disabled={!!busy} onClick={() => download(type, 'pdf')}>{busy === `${type}.pdf` ? '…' : 'PDF'}</button>
              <button className="btn-outline btn-sm" disabled={!!busy} onClick={() => download(type, 'xlsx')}>{busy === `${type}.xlsx` ? '…' : 'Excel'}</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-charcoal/50 mt-6">{t('admin.reports.note')}</p>
    </div>
  );
}
