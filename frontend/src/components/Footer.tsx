import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import * as settingsService from '../services/settingsService';

export function Footer() {
  const [settings, setSettings] = useState<Settings>({});

  useEffect(() => {
    settingsService
      .getSettings()
      .then((data) => setSettings(data.settings))
      .catch(() => {});
  }, []);

  const cafeName = settings.cafe_name || 'ORIGEN';

  return (
    <footer id="contacto" className="bg-espresso text-cream/80 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="font-display text-2xl text-cream mb-2">{cafeName}</h4>
          {settings.cafe_slogan && <p className="text-sm text-cream/60">{settings.cafe_slogan}</p>}
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3">Navegación</h5>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-cream">Inicio</Link></li>
            <li><Link to="/menu" className="hover:text-cream">Menú</Link></li>
            <li><Link to="/seguimiento" className="hover:text-cream">Seguir pedido</Link></li>
            <li><Link to="/login" className="hover:text-cream">Iniciar sesión</Link></li>
          </ul>
        </div>

        <div id="ubicacion">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3">Ubicación</h5>
          <ul className="space-y-2 text-sm text-cream/70">
            {settings.address && <li>{settings.address}</li>}
            {settings.opening_hours && <li>Horarios de atención disponibles en la tienda</li>}
            {settings.gmaps_link && (
              <li>
                <a href={settings.gmaps_link} target="_blank" rel="noreferrer" className="text-gold hover:text-gold-light">
                  Cómo llegar →
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3">Contacto</h5>
          <ul className="space-y-2 text-sm text-cream/70">
            {settings.phone && <li>Tel: {settings.phone}</li>}
            {settings.whatsapp && (
              <li>
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-cream">
                  WhatsApp: {settings.whatsapp}
                </a>
              </li>
            )}
            <li className="flex gap-3 pt-1">
              {settings.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noreferrer" className="hover:text-gold">Instagram</a>
              )}
              {settings.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noreferrer" className="hover:text-gold">Facebook</a>
              )}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-4 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} {cafeName}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
