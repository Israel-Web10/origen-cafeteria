import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Brand';
import { LanguageSwitcher } from '../components/Switchers';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Orders, OrderDetail } from './pages/Orders';
import { Payments } from './pages/Payments';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { PromotionsAdmin } from './pages/Promotions';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Customers } from './pages/Customers';
import { Users } from './pages/Users';
import { Images } from './pages/Images';
import { Content } from './pages/Content';
import { SettingsPage } from './pages/Settings';
import { Currencies } from './pages/Currencies';
import { Audit } from './pages/Audit';

const LINKS: { to: string; key: string; icon: string; admin?: boolean; end?: boolean }[] = [
  { to: '/admin', key: 'admin.nav.dashboard', icon: '📊', end: true },
  { to: '/admin/pedidos', key: 'admin.nav.orders', icon: '🧾' },
  { to: '/admin/pagos', key: 'admin.nav.payments', icon: '💳' },
  { to: '/admin/productos', key: 'admin.nav.products', icon: '☕' },
  { to: '/admin/categorias', key: 'admin.nav.categories', icon: '🏷️' },
  { to: '/admin/promociones', key: 'admin.nav.promotions', icon: '🎁' },
  { to: '/admin/inventario', key: 'admin.nav.inventory', icon: '📦' },
  { to: '/admin/reportes', key: 'admin.nav.reports', icon: '📑' },
  { to: '/admin/clientes', key: 'admin.nav.customers', icon: '👥' },
  { to: '/admin/imagenes', key: 'admin.nav.images', icon: '🖼️' },
  { to: '/admin/contenido', key: 'admin.nav.content', icon: '📝' },
  { to: '/admin/monedas', key: 'admin.nav.currencies', icon: '💱' },
  { to: '/admin/configuracion', key: 'admin.nav.settings', icon: '⚙️' },
  { to: '/admin/usuarios', key: 'admin.nav.users', icon: '🔐', admin: true },
  { to: '/admin/auditoria', key: 'admin.nav.audit', icon: '🕵️', admin: true },
];

export default function AdminApp() {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = LINKS.filter((l) => !l.admin || isAdmin);

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label={t('admin.title')}>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-gold text-espresso' : 'text-cream/80 hover:bg-cream/10'}`}>
          <span aria-hidden>{l.icon}</span>{t(l.key)}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="hidden lg:flex flex-col w-64 bg-espresso shrink-0 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-cream/10">
          <LogoMark className="w-8 h-8" /><span className="font-display text-xl text-cream tracking-widest">ORIGEN</span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="p-4 border-t border-cream/10 text-xs text-cream/60 space-y-2">
          <p className="truncate">{user?.name} · {t(`roles.${user?.role}`)}</p>
          <div className="flex items-center gap-2"><LanguageSwitcher light /><button className="text-rose-200 hover:underline text-cream/80" onClick={() => { logout(); navigate('/'); }}>{t('nav.logout')}</button></div>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-espresso text-cream flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-2"><LogoMark className="w-7 h-7" /><span className="font-display tracking-widest">ORIGEN</span></Link>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t('nav.openMenu')} className="p-2 text-xl">{open ? '×' : '☰'}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-30 bg-espresso/95 pt-14 overflow-y-auto">
            {nav}
            <div className="p-4 flex gap-3"><LanguageSwitcher light /><button className="text-cream" onClick={() => { logout(); navigate('/'); }}>{t('nav.logout')}</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="pedidos/:id" element={<OrderDetail />} />
          <Route path="pagos" element={<Payments />} />
          <Route path="productos" element={<Products />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="promociones" element={<PromotionsAdmin />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="imagenes" element={<Images />} />
          <Route path="contenido" element={<Content />} />
          <Route path="monedas" element={<Currencies />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="usuarios" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="auditoria" element={<ProtectedRoute roles={['admin']}><Audit /></ProtectedRoute>} />
          <Route path="*" element={<p>{t('notFound.text')}</p>} />
        </Routes>
      </main>
    </div>
  );
}
