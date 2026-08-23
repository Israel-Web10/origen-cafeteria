import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="font-display text-6xl text-gold mb-4">404</p>
      <h1 className="text-2xl mb-2">Página no encontrada</h1>
      <p className="text-charcoal/60 mb-8">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="btn-primary">Volver al inicio</Link>
    </div>
  );
}
