import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CoffeeBean } from '../components/Brand';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="section py-24 text-center">
      <CoffeeBean className="w-16 mx-auto mb-6 animate-float" />
      <h1 className="text-5xl mb-3">404</h1>
      <p className="text-charcoal/60 mb-8">{t('notFound.text')}</p>
      <div className="flex justify-center gap-3"><Link to="/" className="btn-primary">{t('nav.home')}</Link><Link to="/carta" className="btn-outline">{t('nav.menu')}</Link></div>
    </div>
  );
}
