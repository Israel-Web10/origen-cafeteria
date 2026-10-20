import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, PaymentMethod, Product } from '../types';
import * as catalog from '../services/catalogService';
import { listMethods } from '../services/paymentService';
import type { PeriodParams } from '../services/adminService';

export const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom'] as const;

export function todayLocal(tz = 'America/La_Paz') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function PeriodPicker({ value, onChange, filters = true }: { value: PeriodParams; onChange: (v: PeriodParams) => void; filters?: boolean }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (!filters) return;
    catalog.listCategories(true).then(setCategories).catch(() => {});
    catalog.listProducts({ include_inactive: true, limit: 200 }).then(setProducts).catch(() => {});
    listMethods(true).then(setMethods).catch(() => {});
  }, [filters]);

  const set = (patch: Partial<PeriodParams>) => onChange({ ...value, ...patch });
  const num = (v: string) => (v ? Number(v) : undefined);

  return (
    <div className="card p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <label className="lg:col-span-2">
        <span className="label">{t('admin.period.label')}</span>
        <select className="input" value={value.period} onChange={(e) => set({ period: e.target.value })}>
          {PERIODS.map((p) => <option key={p} value={p}>{t(`admin.period.${p}`)}</option>)}
        </select>
      </label>
      {value.period === 'custom' ? (
        <>
          <label><span className="label">{t('admin.period.from')}</span><input type="date" className="input" value={value.from || ''} onChange={(e) => set({ from: e.target.value })} /></label>
          <label><span className="label">{t('admin.period.to')}</span><input type="date" className="input" value={value.to || ''} onChange={(e) => set({ to: e.target.value })} /></label>
        </>
      ) : (
        <label className="lg:col-span-2"><span className="label">{t('admin.period.anchor')}</span><input type="date" className="input" value={value.date || ''} onChange={(e) => set({ date: e.target.value })} /></label>
      )}
      {filters && (
        <>
          <label><span className="label">{t('admin.fields.category')}</span>
            <select className="input" value={value.categoryId ?? ''} onChange={(e) => set({ categoryId: num(e.target.value) })}>
              <option value="">{t('menu.all')}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label><span className="label">{t('admin.fields.product')}</span>
            <select className="input" value={value.productId ?? ''} onChange={(e) => set({ productId: num(e.target.value) })}>
              <option value="">{t('menu.all')}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
          <label><span className="label">{t('admin.fields.paymentMethod')}</span>
            <select className="input" value={value.paymentMethodId ?? ''} onChange={(e) => set({ paymentMethodId: num(e.target.value) })}>
              <option value="">{t('menu.all')}</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></label>
        </>
      )}
    </div>
  );
}
