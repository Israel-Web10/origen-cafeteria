import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '📊' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '🧾' },
  { to: '/admin/pagos', label: 'Pagos', icon: '💳' },
  { to: '/admin/productos', label: 'Productos', icon: '☕' },
  { to: '/admin/categorias', label: 'Categorías', icon: '🏷️' },
  { to: '/admin/clientes', label: 'Clientes', icon: '👥' },
  { to: '/admin/imagenes', label: 'Imágenes', icon: '🖼️' },
  { to: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const sidebar = (
    <nav className="flex flex-col gap-1 p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-gold text-espresso' : 'text-cream/80 hover:bg-cream/10'
            }`
          }
        >
          <span aria-hidden>{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-espresso shrink-0">
        <div className="px-6 py-6 border-b border-cream/10">
          <Link to="/" className="font-display text-2xl text-cream">ORIGEN</Link>
          <p className="text-xs text-cream/50 mt-0.5">Panel administrativo</p>
        </div>
        {sidebar}
        <div className="mt-auto p-4 border-t border-cream/10">
          <p className="text-xs text-cream/50 mb-2 truncate">{user?.email}</p>
          <button
            className="text-sm text-rose hover:text-rose/80 font-medium"
            onClick={() => { logout(); navigate('/'); }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-espresso text-cream flex items-center justify-between px-4 h-14">
        <Link to="/" className="font-display text-xl">ORIGEN</Link>
        <button onClick={() => setOpen((o) => !o)} aria-label="Abrir menú admin" className="p-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-espresso/95 pt-14">
          {sidebar}
          <div className="p-4 border-t border-cream/10">
            <button
              className="text-sm text-rose font-medium"
              onClick={() => { logout(); setOpen(false); navigate('/'); }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
