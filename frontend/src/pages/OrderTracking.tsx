import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import * as orderService from '../services/orderService';

export function OrderTracking() {
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { notify } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    try {
      await orderService.trackOrder(orderNumber.trim());
      navigate(`/pedido/${orderNumber.trim()}`);
    } catch (err: any) {
      notify(err.message || 'No se encontró ese pedido.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl mb-2 text-center">Seguir mi pedido</h1>
      <p className="text-charcoal/60 text-center mb-8">
        Ingresa el número de pedido que recibiste al finalizar tu compra (ej: ORD-2026-0001).
      </p>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Número de pedido</label>
          <input
            className="input font-mono"
            placeholder="ORD-2026-0001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar pedido'}
        </button>
      </form>
    </div>
  );
}
