import { Component, ReactNode } from 'react';
import i18n from '../i18n';

/**
 * Si una pantalla falla de forma inesperada, se muestra un mensaje amable con
 * opción de recargar en lugar de dejar la página en blanco. El carrito se
 * conserva porque vive en el almacenamiento del navegador.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Sin datos personales: solo el mensaje técnico en la consola del navegador
    console.error('[origen] error de interfaz', error instanceof Error ? error.message : error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl mb-3">{i18n.t('errors.generic')}</h1>
          <p className="text-charcoal/60 mb-6">{i18n.t('errorBoundary.text')}</p>
          <div className="flex justify-center gap-3">
            <button className="btn-primary" onClick={() => window.location.reload()}>{i18n.t('errorBoundary.reload')}</button>
            <a className="btn-outline" href="/">{i18n.t('nav.home')}</a>
          </div>
        </div>
      </div>
    );
  }
}
