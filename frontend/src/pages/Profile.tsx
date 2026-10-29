import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as authService from '../services/authService';
import { errorMessage } from '../services/api';
import { ConfirmModal } from '../components/Modal';

export function Profile() {
  const { t } = useTranslation();
  const { user, refresh, setToken, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  if (!user) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    try { await authService.updateProfile({ name, phone: phone || undefined }); await refresh(); notify(t('common.saved'), 'success'); }
    catch (err) { notify(errorMessage(err), 'error'); }
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    try { const { token } = await authService.changePassword(pw.current, pw.next); setToken(token); setPw({ current: '', next: '' }); notify(t('profile.passwordChanged'), 'success'); }
    catch (err) { notify(errorMessage(err), 'error'); }
  }
  async function exportData() {
    try {
      const data = await authService.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'mis-datos-origen.json' });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { notify(errorMessage(err), 'error'); }
  }
  async function deleteAccount() {
    try { await authService.deleteAccount(deletePw); logout(); notify(t('profile.deleted'), 'success'); navigate('/'); }
    catch (err) { notify(errorMessage(err), 'error'); }
  }

  return (
    <div className="section max-w-2xl py-10 space-y-6">
      <h1 className="text-4xl">{t('nav.profile')}</h1>
      <form onSubmit={saveProfile} className="card p-6 space-y-4">
        <h2 className="text-xl">{t('profile.data')}</h2>
        <p className="text-sm text-charcoal/60">{user.email}</p>
        <label className="block"><span className="label">{t('checkout.name')}</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label>
        <label className="block"><span className="label">{t('checkout.phone')}</span><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <button className="btn-primary">{t('common.save')}</button>
      </form>
      <form onSubmit={changePw} className="card p-6 space-y-4">
        <h2 className="text-xl">{t('profile.password')}</h2>
        <label className="block"><span className="label">{t('profile.currentPassword')}</span><input type="password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></label>
        <label className="block"><span className="label">{t('profile.newPassword')}</span><input type="password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={8} required /></label>
        <p className="text-xs text-charcoal/50">{t('auth.passwordRules')} {t('profile.passwordSessions')}</p>
        <button className="btn-primary">{t('profile.changePassword')}</button>
      </form>
      <section className="card p-6 space-y-3">
        <h2 className="text-xl">{t('profile.privacy')}</h2>
        <p className="text-sm text-charcoal/60">{t('profile.privacyText')}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" onClick={exportData}>{t('profile.export')}</button>
          <button className="btn-outline btn-sm" onClick={async () => { await authService.logoutAll(); logout(); navigate('/login'); }}>{t('profile.logoutAll')}</button>
          <button className="btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>{t('profile.delete')}</button>
        </div>
      </section>
      <ConfirmModal open={deleteOpen} danger title={t('profile.deleteTitle')} description={t('profile.deleteText')} confirmLabel={t('profile.delete')} onConfirm={deleteAccount} onCancel={() => setDeleteOpen(false)}>
        <label className="block"><span className="label">{t('auth.password')}</span><input type="password" className="input" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} /></label>
      </ConfirmModal>
    </div>
  );
}
