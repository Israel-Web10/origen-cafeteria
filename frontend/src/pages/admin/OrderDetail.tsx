import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Order, OrderStatus } from '../../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../../types';
import * as orderService from '../../services/orderService';
import * as paymentService from '../../services/paymentService';
import { resolveImageUrl } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { PageLoading } from '../../components/Loading';

export function AdminOrderDetail() {
  const { id } = useParams();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await orderService.getOrder(Number(id));
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await orderService.updateOrderStatus(order.id, status);
      setOrder(updated);
      notify('Estado del pedido actualizado.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar el estado.', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function handlePaymentStatus(paymentId: number, status: 'verificado' | 'rechazado') {
    setUpdating(true);
    try {
      await paymentService.updatePaymentStatus(paymentId, status);
      notify(status === 'verificado' ? 'Pago verificado.' : 'Pago rechazado.', 'success');
      await load();
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar el pago.', 'error');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <PageLoading />;
  if (!order) return <p className="text-charcoal/60">Pedido no encontrado.</p>;

  const latestPayment = order.payments?.[0];

  return (
    <div className="max-w-4xl">
      <Link to="/admin/pedidos" className="text-sm text-espresso/60 hover:text-espresso mb-4 inline-block">← Volver a pedidos</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-mono">{order.order_number}</h1>
          <p className="text-sm text-charcoal/50">{new Date(order.created_at).toLocaleString('es-BO')}</p>
        </div>
        <select
          className="input !w-auto"
          value={order.status}
          disabled={updating || order.status === 'cancelado'}
          onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
        >
          {ORDER_STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
          <option value="cancelado">{ORDER_STATUS_LABELS.cancelado}</option>
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="font-display text-lg mb-4">Productos</h3>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-espresso/5 last:border-0">
                    <td className="py-2">{item.product_name}</td>
                    <td className="py-2 text-center text-charcoal/50 w-16">×{item.quantity}</td>
                    <td className="py-2 text-right font-mono">Bs {Number(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm mt-4 space-y-1 border-t border-espresso/10 pt-3">
              <div className="flex justify-between text-charcoal/60"><span>Subtotal</span><span className="font-mono">Bs {Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-charcoal/60"><span>Entrega</span><span className="font-mono">Bs {Number(order.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold text-espresso"><span>Total</span><span className="font-mono">Bs {Number(order.total).toFixed(2)}</span></div>
            </div>
          </div>

          {order.observations && (
            <div className="card p-5">
              <h3 className="font-display text-lg mb-2">Observaciones</h3>
              <p className="text-sm text-charcoal/70">{order.observations}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-display text-lg mb-3">Cliente</h3>
            <p className="text-sm text-charcoal/70">{order.customer_name}</p>
            <p className="text-sm text-charcoal/70">{order.customer_phone}</p>
            {order.customer_email && <p className="text-sm text-charcoal/70">{order.customer_email}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg mb-3">Entrega</h3>
            <p className="text-sm text-charcoal/70 mb-1">{order.delivery_type === 'delivery' ? 'Delivery' : 'Recoger en cafetería'}</p>
            {order.delivery_address && <p className="text-sm text-charcoal/70">{order.delivery_address}</p>}
            {order.delivery_reference && <p className="text-xs text-charcoal/50">Ref: {order.delivery_reference}</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg mb-3">Pago</h3>
            <p className="text-sm text-charcoal/70 mb-3">{order.payment_method_name}</p>
            {latestPayment && (
              <>
                <span className={`badge mb-3 ${
                  latestPayment.status === 'verificado' ? 'bg-olive/10 text-olive'
                  : latestPayment.status === 'rechazado' ? 'bg-rose/10 text-rose'
                  : 'bg-gold/10 text-gold-dark'
                }`}>
                  {latestPayment.status === 'verificado' ? 'Verificado' : latestPayment.status === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                </span>
                {latestPayment.proof_image_url ? (
                  <a href={resolveImageUrl(latestPayment.proof_image_url)} target="_blank" rel="noreferrer">
                    <img
                      src={resolveImageUrl(latestPayment.proof_image_url)}
                      alt="Comprobante"
                      className="w-full rounded-lg border border-espresso/10 mb-3"
                    />
                  </a>
                ) : (
                  <p className="text-xs text-charcoal/40 mb-3">El cliente aún no subió comprobante.</p>
                )}
                {latestPayment.status === 'pendiente' && latestPayment.proof_image_url && (
                  <div className="flex gap-2">
                    <button
                      className="btn bg-olive text-white hover:bg-olive-dark flex-1 !py-2 text-xs"
                      disabled={updating}
                      onClick={() => handlePaymentStatus(latestPayment.id, 'verificado')}
                    >
                      Verificar
                    </button>
                    <button
                      className="btn bg-rose text-white hover:bg-rose/90 flex-1 !py-2 text-xs"
                      disabled={updating}
                      onClick={() => handlePaymentStatus(latestPayment.id, 'rechazado')}
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
