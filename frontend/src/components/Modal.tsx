import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/** Atrapa el foco dentro del contenedor, cierra con Escape y restaura el foco al cerrar. */
function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? []);
    setTimeout(() => (focusables()[0] ?? node)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center bg-espresso/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={`card bg-cream w-full ${maxWidth} p-6 my-auto outline-none`}
          >
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
              <button aria-label={t('common.close')} onClick={onClose} className="text-espresso/50 hover:text-espresso text-2xl leading-none w-9 h-9 rounded-full hover:bg-espresso/5">
                &times;
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmModal({ open, title, description, confirmLabel, danger = false, onConfirm, onCancel, children }: {
  open: boolean; title: string; description?: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      {description && <p className="text-sm text-charcoal/70 mb-4">{description}</p>}
      {children}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</button>
      </div>
    </Modal>
  );
}

/** Panel lateral (carrito, filtros) con las mismas garantías de accesibilidad. */
export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-espresso/50 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-cream shadow-lift flex flex-col outline-none"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-espresso/10">
              <h2 id={titleId} className="text-xl">{title}</h2>
              <button aria-label={t('common.close')} onClick={onClose} className="text-espresso/60 hover:text-espresso text-2xl w-9 h-9 rounded-full hover:bg-espresso/5">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t border-espresso/10 px-5 py-4 bg-cream-dark/40">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
