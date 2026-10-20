import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useQuote } from '../hooks/useQuote';
import { CartLines, QuoteSummary } from '../components/CartDrawer';
import { EmptyState } from '../components/EmptyState';

export function CartPage() {
  const { t } = useTranslation();
  const { items, clear } = useCart();
  const { quote, error, loading } = useQuote(items);

  if (items.length === 0) {
    return (
      <div className="section py-16">
        <EmptyState title={t('cart.emptyTitle')} description={t('cart.emptyText')} action={<Link to="/carta" className="btn-primary">{t('cart.browse')}</Link>} />
      </div>
    );
  }

  return (
    <div className="section py-10">
      <h1 className="text-4xl mb-8">{t('cart.title')}</h1>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 card p-5">
          <CartLines />
          <button className="text-sm text-rose hover:underline mt-4" onClick={clear}>{t('cart.clear')}</button>
        </div>
        <aside className="card p-5 h-fit md:sticky md:top-24 space-y-4">
          <h2 className="text-xl">{t('cart.summary')}</h2>
          {error ? <p role="alert" className="text-sm text-rose">{error.message}</p> : <QuoteSummary quote={quote} loading={loading} />}
          <Link to="/checkout" className={`btn-gold w-full ${error ? 'pointer-events-none opacity-50' : ''}`} aria-disabled={!!error}>{t('cart.checkout')}</Link>
          <Link to="/carta" className="btn-ghost w-full">{t('cart.keepShopping')}</Link>
        </aside>
      </div>
    </div>
  );
}
