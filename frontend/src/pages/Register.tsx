import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, errorMessage } from '../services/api';

export function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const strongEnough = form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!strongEnough) return setError(t('auth.passwordRules'));
    if (form.password !== form.confirm) return setError(t('auth.passwordMismatch'));
    if (!accept) return setError(t('checkout.errors.accept'));
    setLoading(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() || undefined });
      notify(t('auth.registered'), 'success');
      navigate('/', { replace: true });
    } catch (err) {
      const fields = (err as ApiError).details?.fields;
      setError(fields?.length ? fields.map((f) => f.message).join(' · ') : errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section max-w-md py-16">
      <h1 className="text-3xl mb-1 text-center">{t('auth.registerTitle')}</h1>
      <p className="text-charcoal/60 text-center mb-8">{t('auth.registerSubtitle')}</p>
      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p role="alert" className="text-sm text-rose bg-rose/10 rounded-lg px-3 py-2">{error}</p>}
        <label className="block"><span className="label">{t('checkout.name')}</span><input className="input" value={form.name} onChange={set('name')} autoComplete="name" required minLength={2} /></label>
        <label className="block"><span className="label">{t('auth.email')}</span><input type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label className="block"><span className="label">{t('checkout.phone')} ({t('common.optional')})</span><input className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" /></label>
        <label className="block">
          <span className="label">{t('auth.password')}</span>
          <input type="password" className="input" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={8} aria-describedby="pw-rules" />
          <span id="pw-rules" className={`text-xs mt-1 block ${strongEnough ? 'text-olive' : 'text-charcoal/50'}`}>{t('auth.passwordRules')}</span>
        </label>
        <label className="block"><span className="label">{t('auth.confirmPassword')}</span><input type="password" className="input" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" className="accent-gold mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>{t('auth.acceptPrivacy')} <Link to="/legal/privacy" target="_blank" className="underline text-gold-dark">{t('legal.privacy')}</Link></span></label>
        <button className="btn-primary w-full" disabled={loading}>{loading ? t('common.loading') : t('auth.registerCta')}</button>
      </form>
      <p className="text-center text-sm text-charcoal/60 mt-6">{t('auth.haveAccount')} <Link to="/login" className="text-gold-dark font-medium hover:underline">{t('auth.loginCta')}</Link></p>
    </div>
  );
}
