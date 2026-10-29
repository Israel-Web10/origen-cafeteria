import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; action?: { label: string; onClick: () => void } }

interface ToastContextValue {
  notify: (message: string, type?: ToastType, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const notify = useCallback((message: string, type: ToastType = 'info', action?: Toast['action']) => {
    const id = ++counter;
    setToasts((t) => [...t.slice(-3), { id, message, type, action }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[90] flex flex-col gap-2 sm:w-96" role="region" aria-live="polite" aria-label="Notificaciones">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.22 }}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lift text-sm border backdrop-blur ${
                t.type === 'success' ? 'bg-olive text-cream border-olive' : t.type === 'error' ? 'bg-rose text-cream border-rose' : 'bg-espresso text-cream border-espresso'
              }`}
            >
              <span aria-hidden className="mt-0.5">{t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}</span>
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button className="underline font-semibold" onClick={() => { t.action?.onClick(); dismiss(t.id); }}>{t.action.label}</button>
              )}
              <button onClick={() => dismiss(t.id)} aria-label="Cerrar" className="opacity-70 hover:opacity-100">✕</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
