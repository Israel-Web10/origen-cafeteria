import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../services/api';
import { LogoMark } from '../components/Brand';

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      notify(t('auth.welcome', { name: user.name.split(' ')[0] }), 'success');
      navigate(from || (user.role === 'client' ? '/' : '/admin'), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section max-w-md py-16">
      <div className="text-center mb-8"><LogoMark className="w-14 h-14 mx-auto mb-4" /><h1 className="text-3xl mb-1">{t('auth.loginTitle')}</h1><p className="text-charcoal/60">{t('auth.loginSubtitle')}</p></div>
      <form onSubmit={submit} className="card p-6 space-y-4">
        {error && <p role="alert" className="text-sm text-rose bg-rose/10 rounded-lg px-3 py-2">{error}</p>}
        <label className="block"><span className="label">{t('auth.email')}</span><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="block"><span className="label">{t('auth.password')}</span><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? t('common.loading') : t('auth.loginCta')}</button>
      </form>
      <p className="text-center text-sm text-charcoal/60 mt-6">{t('auth.noAccount')} <Link to="/registro" className="text-gold-dark font-medium hover:underline">{t('auth.registerCta')}</Link></p>
      <p className="text-center text-xs text-charcoal/50 mt-3">{t('auth.guestHint')} <Link to="/carta" className="underline">{t('nav.menu')}</Link></p>
    </div>
  );
}
