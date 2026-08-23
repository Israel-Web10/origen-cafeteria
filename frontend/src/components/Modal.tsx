import { ReactNode } from 'react';

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm px-4">
      <div className="card bg-cream max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && <p className="text-sm text-charcoal/70 mb-6">{description}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={danger ? 'btn bg-rose text-white hover:bg-rose/90' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-espresso/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className={`card bg-cream w-full ${maxWidth} p-6 my-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            aria-label="Cerrar"
            onClick={onClose}
            className="text-espresso/50 hover:text-espresso text-xl leading-none"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
