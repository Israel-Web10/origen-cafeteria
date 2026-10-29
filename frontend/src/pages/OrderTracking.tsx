import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import * as orderService from '../services/orderService';
import { errorMessage } from '../services/api';
import { formatDate } from '../lib/format';

export function OrderTracking() {
  const { t, i18n } = useTranslation();
  const [number, setNumber] = useState('');
  const [phone4, setPhone4] = useState('');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(orderService.recentOrders());
  const navigate = useNavigate();
  const { notify } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = number.trim().toUpperCase();
    setLoading(true);
    try {
      await orderService.track(n, { phone4 });
      navigate(`/pedido/${n}`, { state: { phone4 } });
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section max-w-xl py-16">
      <h1 className="text-4xl mb-2 text-center">{t('track.title')}</h1>
      <p className="text-charcoal/60 text-center mb-8">{t('track.subtitle')}</p>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <label className="block"><span className="label">{t('track.number')}</span>
          <input className="input font-mono uppercase" placeholder="ORD-2026-000123" value={number} onChange={(e) => setNumber(e.target.value)} pattern="[Oo][Rr][Dd]-\d{4}-\d{4,8}" required /></label>
        <label className="block"><span className="label">{t('track.phone4')}</span>
          <input className="input font-mono tracking-[0.4em]" inputMode="numeric" maxLength={4} value={phone4} onChange={(e) => setPhone4(e.target.value.replace(/\D/g, ''))} required /></label>
        <button className="btn-primary w-full" disabled={loading || phone4.length !== 4}>{loading ? t('common.loading') : t('track.submit')}</button>
        <p className="text-xs text-charcoal/50">{t('track.privacyNote')}</p>
      </form>
      {recent.length > 0 && (
        <section className="mt-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl">{t('track.recent')}</h2>
            <button className="text-xs text-charcoal/50 underline" onClick={() => { orderService.forgetOrders(); setRecent([]); }}>{t('track.forget')}</button>
          </div>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id}>
                <Link to={`/pedido/${r.order_number}?t=${encodeURIComponent(r.token)}`} className="card p-4 flex justify-between hover:shadow-lift transition">
                  <span className="font-mono">{r.order_number}</span>
                  <span className="text-sm text-charcoal/60">{formatDate(r.created_at, i18n.language, { dateStyle: 'medium' })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
