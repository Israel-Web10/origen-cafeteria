import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Role, User } from '../../types';
import * as admin from '../../services/adminService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Modal';
import { Field, PageHeader, Pagination } from '../ui';

const LIMIT = 30;

export function Users() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { user: me } = useAuth();
  const [role, setRole] = useState<Role | ''>('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ users: User[]; total: number }>({ users: [], total: 0 });
  const [creating, setCreating] = useState<{ name: string; email: string; role: 'manager' | 'admin' } | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const load = useCallback(() => { admin.listUsers({ role: role || undefined, limit: LIMIT, offset }).then(setData).catch(() => {}); }, [role, offset]);
  useEffect(() => { load(); }, [load]);

  async function update(u: User, patch: { role?: Role; active?: boolean }) {
    try { await admin.updateUser(u.id, patch); notify(t('admin.users.updated'), 'success'); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function reset(u: User) {
    try { const r = await admin.resetPassword(u.id); setTemp(r.temporary_password); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function create() {
    if (!creating) return;
    try { const r = await admin.createStaff(creating); setTemp(r.temporary_password); setCreating(null); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title={t('admin.nav.users')} subtitle={t('admin.users.subtitle')} actions={<button className="btn-primary" onClick={() => setCreating({ name: '', email: '', role: 'manager' })}>+ {t('admin.users.newStaff')}</button>} />
      <div className="flex gap-2 mb-4">{(['', 'admin', 'manager', 'client'] as const).map((r) => <button key={r || 'all'} className={`chip ${role === r ? 'chip-on' : 'chip-off'}`} onClick={() => { setOffset(0); setRole(r); }}>{r ? t(`roles.${r}`) : t('menu.all')}</button>)}</div>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>{t('admin.fields.name')}</th><th>Email</th><th>{t('admin.users.role')}</th><th>{t('admin.fields.status')}</th><th></th></tr></thead>
          <tbody>{data.users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.email}</td>
              <td>
                <select className="input !py-1 !w-auto" value={u.role} disabled={u.id === me?.id} onChange={(e) => update(u, { role: e.target.value as Role })}>
                  {(['client', 'manager', 'admin'] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                </select>
              </td>
              <td>{u.active ? t('admin.active') : t('admin.inactive')}</td>
              <td className="whitespace-nowrap">{u.id !== me?.id && <>
                <button className="btn-ghost btn-sm" onClick={() => update(u, { active: !u.active })}>{u.active ? t('admin.users.deactivate') : t('admin.users.activate')}</button>
                <button className="btn-ghost btn-sm" onClick={() => reset(u)}>{t('admin.users.resetPassword')}</button>
              </>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Pagination total={data.total} limit={LIMIT} offset={offset} onChange={setOffset} />
      <p className="text-xs text-charcoal/50 mt-4">{t('admin.users.note')}</p>
      {creating && (
        <Modal open onClose={() => setCreating(null)} title={t('admin.users.newStaff')}>
          <div className="grid gap-3">
            <Field label={t('admin.fields.name')}><input className="input" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className="input" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} /></Field>
            <Field label={t('admin.users.role')}><select className="input" value={creating.role} onChange={(e) => setCreating({ ...creating, role: e.target.value as 'manager' | 'admin' })}><option value="manager">{t('roles.manager')}</option><option value="admin">{t('roles.admin')}</option></select></Field>
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setCreating(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={create}>{t('common.save')}</button></div>
        </Modal>
      )}
      <Modal open={!!temp} onClose={() => setTemp(null)} title={t('admin.users.tempTitle')}>
        <p className="text-sm mb-3">{t('admin.users.tempText')}</p>
        <code className="block bg-almond rounded-lg p-3 font-mono text-lg select-all">{temp}</code>
        <button className="btn-primary mt-4" onClick={() => setTemp(null)}>{t('common.done')}</button>
      </Modal>
    </div>
  );
}
