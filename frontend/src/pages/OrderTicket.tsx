import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import type { Order } from '../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW } from '../types';
import * as orderService from '../services/orderService';
import * as paymentService from '../services/paymentService';
import { resolveImageUrl } from '../services/uploadService';
import { useToast } from '../context/ToastContext';
import { PageLoading } from '../components/Loading';

export function OrderTicket() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const { notify } = useToast();
  const [order, setOrder] = useState<Order | null>((location.state as any)?.order || null);
  const [loading, setLoading] = useState(!order);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order || !orderNumber) return;
    setLoading(true);
    orderService
      .trackOrder(orderNumber)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderNumber, order]);

  async function handleUploadProof(file: File) {
    if (!order) return;
    setUploading(true);
    try {
      await paymentService.uploadProof(order.id, file);
      const refreshed = await orderService.trackOrder(order.order_number);
      setOrder(refreshed);
      notify('Comprobante subido. El equipo lo verificará pronto.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo subir el comprobante.', 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <PageLoading />;

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl mb-2">Pedido no encontrado</h1>
        <p className="text-charcoal/60 mb-6">Verifica el número de pedido e intenta nuevamente.</p>
        <Link to="/seguimiento" className="btn-outline">Buscar pedido</Link>
      </div>
    );
  }

  const latestPayment = order.payments?.[0];
  const isQr = order.payment_method_type === 'qr';
  const needsProof = isQr && latestPayment && latestPayment.status !== 'verificado' && !latestPayment.proof_image_url;
  const statusIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8 print:hidden">
        <div className="w-14 h-14 rounded-full bg-olive/10 text-olive flex items-center justify-center mx-auto mb-3 text-2xl">✓</div>
        <h1 className="text-3xl mb-1">¡Gracias por tu pedido!</h1>
        <p className="text-charcoal/60">Guarda tu número de pedido para hacerle seguimiento.</p>
      </div>

      {/* Status timeline */}
      {order.status !== 'cancelado' ? (
        <div className="flex items-center justify-between mb-8 print:hidden overflow-x-auto">
          {ORDER_STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center flex-1 min-w-[70px]">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-3 h-3 rounded-full ${i <= statusIndex ? 'bg-gold' : 'bg-almond'}`} />
                <span className={`text-[10px] mt-1.5 text-center ${i <= statusIndex ? 'text-espresso font-medium' : 'text-charcoal/40'}`}>
                  {ORDER_STATUS_LABELS[s]}
                </span>
              </div>
              {i < ORDER_STATUS_FLOW.length - 1 && (
                <div className={`h-px flex-1 -mt-4 ${i < statusIndex ? 'bg-gold' : 'bg-almond'}`} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="badge bg-rose/10 text-rose mb-8">Pedido cancelado</div>
      )}

      {/* Ticket */}
      <div className="card p-6 sm:p-8 print:shadow-none print:border-none">
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-dashed border-espresso/20">
          <div>
            <p className="font-display text-2xl text-espresso">ORIGEN</p>
            <p className="text-xs text-charcoal/50">Comprobante de pedido</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold text-espresso">{order.order_number}</p>
            {order.ticket_number && <p className="text-xs text-charcoal/50 font-mono">{order.ticket_number}</p>}
            <p className="text-xs text-charcoal/50">{new Date(order.created_at).toLocaleString('es-BO')}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="label">Cliente</p>
            <p className="text-charcoal/70">{order.customer_name}</p>
            <p className="text-charcoal/70">{order.customer_phone}</p>
          </div>
          <div>
            <p className="label">Entrega</p>
            <p className="text-charcoal/70">{order.delivery_type === 'delivery' ? 'Delivery' : 'Recoger en cafetería'}</p>
            {order.delivery_address && <p className="text-charcoal/70">{order.delivery_address}</p>}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-charcoal/50 border-b border-espresso/10">
              <th className="pb-2 font-medium">Producto</th>
              <th className="pb-2 font-medium text-center">Cant.</th>
              <th className="pb-2 font-medium text-right">Precio</th>
              <th className="pb-2 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-espresso/5">
                <td className="py-2 text-charcoal">{item.product_name}</td>
                <td className="py-2 text-center text-charcoal/60">{item.quantity}</td>
                <td className="py-2 text-right font-mono text-charcoal/60">Bs {Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2 text-right font-mono text-charcoal">Bs {Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm mb-6">
          <div className="flex justify-between text-charcoal/60"><span>Subtotal</span><span className="font-mono">Bs {Number(order.subtotal).toFixed(2)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-olive"><span>Descuento</span><span className="font-mono">− Bs {Number(order.discount).toFixed(2)}</span></div>}
          <div className="flex justify-between text-charcoal/60"><span>Entrega</span><span className="font-mono">Bs {Number(order.delivery_fee).toFixed(2)}</span></div>
          <div className="flex justify-between text-espresso font-semibold text-base pt-2 border-t border-espresso/10 mt-2">
            <span>Total</span><span className="font-mono">Bs {Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm border-t border-dashed border-espresso/20 pt-4">
          <div>
            <p className="label">Pago</p>
            <p className="text-charcoal/70">{order.payment_method_name}</p>
          </div>
          <div className="text-right">
            <p className="label">Estado del pedido</p>
            <span className="badge bg-gold/10 text-gold-dark">{ORDER_STATUS_LABELS[order.status]}</span>
          </div>
        </div>
      </div>

      {/* QR proof upload */}
      {needsProof && (
        <div className="card p-5 mt-6 print:hidden">
          <h3 className="font-display text-lg mb-2">Sube tu comprobante de pago</h3>
          <p className="text-sm text-charcoal/60 mb-4">
            Adjunta una captura o foto del comprobante de tu pago QR para que podamos verificarlo.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUploadProof(e.target.files[0])}
          />
          <button className="btn-outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
          </button>
        </div>
      )}
      {latestPayment?.proof_image_url && (
        <div className="card p-5 mt-6 print:hidden">
          <h3 className="font-display text-lg mb-3">Comprobante enviado</h3>
          <img src={resolveImageUrl(latestPayment.proof_image_url)} alt="Comprobante de pago" className="max-w-xs rounded-lg border border-espresso/10" />
          <p className="text-sm mt-3">
            Estado del pago:{' '}
            <span className={`badge ${latestPayment.status === 'verificado' ? 'bg-olive/10 text-olive' : latestPayment.status === 'rechazado' ? 'bg-rose/10 text-rose' : 'bg-gold/10 text-gold-dark'}`}>
              {latestPayment.status === 'verificado' ? 'Verificado' : latestPayment.status === 'rechazado' ? 'Rechazado' : 'Pendiente de verificación'}
            </span>
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-6 print:hidden">
        <button className="btn-outline flex-1" onClick={() => window.print()}>Imprimir ticket</button>
        <Link to="/menu" className="btn-primary flex-1 text-center">Seguir comprando</Link>
      </div>
    </div>
  );
}
