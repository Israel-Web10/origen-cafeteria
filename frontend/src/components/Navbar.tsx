import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { Logo } from './Brand';
import { LanguageSwitcher, CurrencySwitcher } from './Switchers';

const LINKS = [
  { to: '/carta', key: 'nav.menu' },
  { to: '/promociones', key: 'nav.promotions' },
  { to: '/historia', key: 'nav.story' },
  { to: '/la-cafeteria', key: 'nav.cafe' },
  { to: '/visitanos', key: 'nav.visit' },
];

export function Navbar({ overlay = false }: { overlay?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, isStaff, logout } = useAuth();
  const { itemCount, openDrawer } = useCart();
  const { settings } = useConfig();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setOpen(false), [location.pathname]);

  const transparent = overlay && !scrolled && !open;
  const announcement = settings[`announcement_${i18n.language}`] || settings.announcement_es;

  return (
    <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-500 ${transparent ? 'bg-transparent' : 'bg-cream/90 backdrop-blur-md border-b border-espresso/10 shadow-soft'}`}>
      {announcement && !transparent && (
        <div className="bg-espresso text-cream text-xs text-center py-1.5 px-4">{announcement}</div>
      )}
      <div className="section h-16 flex items-center justify-between gap-4">
        <Link to="/" aria-label={t('nav.home')} className="shrink-0">
          <Logo light={transparent} />
        </Link>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-7" aria-label={t('nav.main')}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative whitespace-nowrap text-sm font-medium tracking-wide transition-colors py-1 ${transparent ? 'text-cream/85 hover:text-cream' : 'text-espresso/70 hover:text-espresso'} ${isActive ? (transparent ? '!text-cream' : '!text-espresso') : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {t(l.key)}
                  {isActive && <motion.span layoutId="nav-underline" className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:flex items-center gap-1">
            <LanguageSwitcher light={transparent} />
            <CurrencySwitcher light={transparent} />
          </div>
          <Link to="/seguimiento" className={`hidden xl:inline-flex text-xs font-semibold px-3 py-2 rounded-full ${transparent ? 'text-cream/85 hover:bg-cream/10' : 'text-espresso/70 hover:bg-espresso/5'}`}>
            {t('nav.track')}
          </Link>
          {user ? (
            <div className="hidden sm:flex items-center gap-1">
              <Link to={isStaff ? '/admin' : '/mis-pedidos'} className={transparent ? 'btn-glass btn-sm' : 'btn-outline btn-sm'}>
                {isStaff ? t('nav.panel') : t('nav.myOrders')}
              </Link>
              <button className={`btn-sm btn ${transparent ? 'text-cream/80 hover:bg-cream/10' : 'btn-ghost'}`} onClick={() => { logout(); navigate('/'); }}>
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link to="/login" className={`hidden sm:inline-flex ${transparent ? 'btn-glass' : 'btn-outline'} btn-sm`}>{t('nav.login')}</Link>
          )}
          <button
            onClick={openDrawer}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center transition ${transparent ? 'text-cream hover:bg-cream/10' : 'text-espresso hover:bg-espresso/5'}`}
            aria-label={t('cart.open', { count: itemCount })}
          >
            <CartIcon />
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 bg-gold text-espresso text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            className={`lg:hidden w-11 h-11 rounded-full flex items-center justify-center ${transparent ? 'text-cream' : 'text-espresso'}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {open ? <span className="text-2xl">&times;</span> : <MenuIcon />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden bg-cream border-t border-espresso/10"
            aria-label={t('nav.main')}
          >
            <div className="section py-4 flex flex-col gap-1">
              {[{ to: '/', key: 'nav.home' }, ...LINKS, { to: '/seguimiento', key: 'nav.track' }, { to: '/preguntas-frecuentes', key: 'nav.faq' }].map((l) => (
                <NavLink key={l.to} to={l.to} end className={({ isActive }) => `py-2.5 px-3 rounded-lg font-medium ${isActive ? 'bg-espresso text-cream' : 'text-espresso hover:bg-espresso/5'}`}>
                  {t(l.key)}
                </NavLink>
              ))}
              <hr className="my-2 border-espresso/10" />
              {user ? (
                <>
                  <Link to={isStaff ? '/admin' : '/mis-pedidos'} className="py-2.5 px-3 font-medium text-espresso">{isStaff ? t('nav.panel') : t('nav.myOrders')}</Link>
                  <Link to="/perfil" className="py-2.5 px-3 font-medium text-espresso">{t('nav.profile')}</Link>
                  <button className="py-2.5 px-3 text-left font-medium text-rose" onClick={() => { logout(); navigate('/'); }}>{t('nav.logout')}</button>
                </>
              ) : (
                <Link to="/login" className="py-2.5 px-3 font-medium text-espresso">{t('nav.login')}</Link>
              )}
              <div className="flex gap-2 pt-3"><LanguageSwitcher /><CurrencySwitcher /></div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}
