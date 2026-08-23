import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CartSummary } from '../components/CartDrawer';
import * as settingsService from '../services/settingsService';
import * as paymentService from '../services/paymentService';
import * as orderService from '../services/orderService';
import { resolveImageUrl } from '../services/uploadService';
import type { DeliveryType, DeliveryZone, PaymentMethod, Settings } from '../types';

export function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings>({});
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [zoneId, setZoneId] = useState<number | ''>('');
  const [paymentMethodId, setPaymentMethodId] = useState<number | ''>('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (items.length === 0) navigate('/carrito');
  }, [items, navigate]);

  useEffect(() => {
    Promise.all([settingsService.getSettings(), paymentService.listPaymentMethods()])
      .then(([settingsData, methodsData]) => {
        setSettings(settingsData.settings);
        setZones(settingsData.deliveryZones);
        setMethods(methodsData);
        if (methodsData.length > 0) setPaymentMethodId(methodsData[0].id);
      })
      .finally(() => setLoadingConfig(false));
  }, []);

  const selectedZone = zones.find((z) => z.id === zoneId);
  const deliveryFee = deliveryType === 'delivery' ? Number(selectedZone?.cost || 0) : 0;
  const minOrder = Number(settings.delivery_min_order || 0);
  const belowMinimum = deliveryType === 'delivery' && minOrder > 0 && subtotal < minOrder;
  const selectedMethod = methods.find((m) => m.id === paymentMethodId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      notify('Completa tu nombre y teléfono.', 'error');
      return;
    }
    if (!paymentMethodId) {
      notify('Selecciona un método de pago.', 'error');
      return;
    }
    if (deliveryType === 'delivery' && !address) {
      notify('Ingresa tu dirección de entrega.', 'error');
      return;
    }
    if (belowMinimum) {
      notify(`El pedido mínimo para delivery es Bs ${minOrder.toFixed(2)}.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderService.createOrder({
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        deliveryType,
        deliveryAddress:
          deliveryType === 'delivery'
            ? {
                recipient_name: customerName,
                phone: customerPhone,
                address,
                reference: reference || undefined,
                zone_id: zoneId ? Number(zoneId) : undefined,
              }
            : undefined,
        paymentMethodId: Number(paymentMethodId),
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        observations: observations || undefined,
      });
      clear();
      notify('¡Pedido realizado con éxito!', 'success');
      navigate(`/pedido/${order.id}`);
    } catch (err: any) {
      notify(err.message || 'No se pudo crear el pedido.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl mb-8">Finalizar pedido</h1>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Datos del cliente */}
          <div className="card p-5">
            <h2 className="font-display text-xl mb-4">Tus datos</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre completo</label>
                <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Correo (opcional)</label>
                <input type="email" className="input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Entrega */}
          <div className="card p-5">
            <h2 className="font-display text-xl mb-4">Modalidad de entrega</h2>
            <div className="flex gap-3 mb-4">
              {settings.pickup_enabled !== 'false' && (
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
                    deliveryType === 'pickup' ? 'border-gold bg-gold/10 text-espresso' : 'border-espresso/15 text-charcoal/60'
                  }`}
                >
                  Recoger en cafetería
                </button>
              )}
              {settings.delivery_enabled !== 'false' && (
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
                    deliveryType === 'delivery' ? 'border-gold bg-gold/10 text-espresso' : 'border-espresso/15 text-charcoal/60'
                  }`}
                >
                  Delivery
                </button>
              )}
            </div>

            {deliveryType === 'pickup' && settings.address && (
              <p className="text-sm text-charcoal/60">
                Recoge tu pedido en: <strong className="text-espresso">{settings.address}</strong>
              </p>
            )}

            {deliveryType === 'delivery' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Dirección</label>
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Referencia (opcional)</label>
                  <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: frente a la plaza, casa azul..." />
                </div>
                {zones.length > 0 && (
                  <div>
                    <label className="label">Zona</label>
                    <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Selecciona una zona</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name} — Bs {Number(z.cost).toFixed(2)} ({z.estimated_time_minutes} min aprox.)</option>
                      ))}
                    </select>
                  </div>
                )}
                {belowMinimum && (
                  <p className="text-sm text-rose">El pedido mínimo para delivery es Bs {minOrder.toFixed(2)}.</p>
                )}
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="card p-5">
            <h2 className="font-display text-xl mb-4">Método de pago</h2>
            {loadingConfig ? (
              <p className="text-sm text-charcoal/50">Cargando métodos de pago...</p>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                      paymentMethodId === method.id ? 'border-gold bg-gold/10' : 'border-espresso/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethodId === method.id}
                      onChange={() => setPaymentMethodId(method.id)}
                    />
                    <span className="text-sm font-medium text-espresso">{method.name}</span>
                    {method.type === 'card' && (
                      <span className="badge bg-almond text-espresso/60 ml-auto text-[10px]">Próximamente</span>
                    )}
                  </label>
                ))}

                {selectedMethod?.type === 'qr' && (
                  <div className="mt-4 rounded-lg bg-almond/40 p-4 flex flex-col sm:flex-row gap-4 items-start">
                    {selectedMethod.config?.qr_image && (
                      <img
                        src={resolveImageUrl(selectedMethod.config.qr_image)}
                        alt="Código QR de pago"
                        className="w-32 h-32 object-contain bg-white rounded-lg border border-espresso/10"
                      />
                    )}
                    <div className="text-sm text-charcoal/70">
                      {selectedMethod.config?.bank && <p><strong className="text-espresso">Entidad:</strong> {selectedMethod.config.bank}</p>}
                      {selectedMethod.config?.account && <p><strong className="text-espresso">Cuenta:</strong> {selectedMethod.config.account}</p>}
                      {selectedMethod.config?.instructions && <p className="mt-1">{selectedMethod.config.instructions}</p>}
                      <p className="mt-2 text-xs text-charcoal/50">
                        Podrás subir tu comprobante de pago justo después de confirmar el pedido.
                      </p>
                    </div>
                  </div>
                )}

                {selectedMethod?.type === 'cash' && selectedMethod.config?.instructions && (
                  <p className="text-sm text-charcoal/60 mt-2">{selectedMethod.config.instructions}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label">Observaciones (opcional)</label>
            <textarea className="input min-h-[90px]" value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Ej: sin azúcar, sin cebolla, tocar timbre..." />
          </div>
        </div>

        {/* Resumen */}
        <div className="md:col-span-1">
          <div className="md:sticky md:top-24 space-y-4">
            <CartSummary deliveryFee={deliveryFee} />
            <button type="submit" className="btn-primary w-full" disabled={submitting || belowMinimum}>
              {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
