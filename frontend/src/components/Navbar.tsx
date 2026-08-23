import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const navLinks = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/menu', label: 'Menú' },
  { to: '/#nosotros', label: 'Nosotros' },
  { to: '/#ubicacion', label: 'Ubicación' },
  { to: '/#contacto', label: 'Contacto' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-espresso/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-wide text-espresso">
          ORIGEN
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `text-sm font-medium tracking-wide transition-colors ${
                  isActive ? 'text-gold-dark' : 'text-espresso/70 hover:text-espresso'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/carrito" className="relative btn-ghost !px-3" aria-label="Ver carrito">
            <CartIcon />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-espresso text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              {user.role === 'admin' ? (
                <Link to="/admin" className="btn-outline !py-2 text-xs">
                  Panel admin
                </Link>
              ) : (
                <Link to="/mis-pedidos" className="btn-outline !py-2 text-xs">
                  Mis pedidos
                </Link>
              )}
              <button
                className="btn-ghost !py-2 text-xs"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Salir
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden sm:inline-flex btn-outline !py-2 text-xs">
              Iniciar sesión
            </Link>
          )}

          <button
            className="md:hidden btn-ghost !px-3"
            onClick={() => setOpen((o) => !o)}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-espresso/10 bg-cream px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm font-medium text-espresso/80" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <hr className="border-espresso/10" />
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin' : '/mis-pedidos'} className="text-sm font-medium text-espresso" onClick={() => setOpen(false)}>
                {user.role === 'admin' ? 'Panel admin' : 'Mis pedidos'}
              </Link>
              <button
                className="text-sm font-medium text-rose text-left"
                onClick={() => {
                  logout();
                  setOpen(false);
                  navigate('/');
                }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-medium text-espresso" onClick={() => setOpen(false)}>
              Iniciar sesión
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}
