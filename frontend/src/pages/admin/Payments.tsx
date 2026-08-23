import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Payment } from '../../types';
import * as paymentService from '../../services/paymentService';
import { resolveImageUrl } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { PageLoading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';

const FILTERS = ['todos', 'pendiente', 'verificado', 'rechazado'] as const;

export function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('todos');
  const { notify } = useToast();

  function load() {
    setLoading(true);
    paymentService
      .listPayments(filter === 'todos' ? undefined : filter)
      .then(setPayments)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function handleAction(id: number, status: 'verificado' | 'rechazado') {
    try {
      await paymentService.updatePaymentStatus(id, status);
      notify(status === 'verificado' ? 'Pago verificado.' : 'Pago rechazado.', 'success');
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar el pago.', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-3xl mb-6">Pagos</h1>

      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
              filter === f ? 'bg-espresso text-cream' : 'bg-almond/60 text-espresso hover:bg-almond'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoading />
      ) : payments.length === 0 ? (
        <EmptyState title="No hay pagos" description="Los pagos de los pedidos aparecerán aquí." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-charcoal/50 border-b border-espresso/10">
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Comprobante</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-espresso/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/admin/pedidos/${p.order_id}`} className="font-mono text-gold-dark hover:underline">
                      {p.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.customer_name}</td>
                  <td className="px-4 py-3 text-charcoal/60">{p.payment_method_name}</td>
                  <td className="px-4 py-3 font-mono">Bs {Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {p.proof_image_url ? (
                      <a href={resolveImageUrl(p.proof_image_url)} target="_blank" rel="noreferrer">
                        <img src={resolveImageUrl(p.proof_image_url)} alt="Comprobante" className="w-10 h-10 rounded object-cover border border-espresso/10" />
                      </a>
                    ) : (
                      <span className="text-charcoal/30 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      p.status === 'verificado' ? 'bg-olive/10 text-olive'
                      : p.status === 'rechazado' ? 'bg-rose/10 text-rose'
                      : 'bg-gold/10 text-gold-dark'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === 'pendiente' && (
                      <div className="flex gap-2 justify-end">
                        <button className="text-olive text-xs font-medium hover:underline" onClick={() => handleAction(p.id, 'verificado')}>Verificar</button>
                        <button className="text-rose text-xs font-medium hover:underline" onClick={() => handleAction(p.id, 'rechazado')}>Rechazar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
