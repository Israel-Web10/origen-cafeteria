import { useTranslation } from 'react-i18next';
import type { OrderPaymentStatus, OrderStatus, PaymentStatus } from '../types';

const ORDER: Record<OrderStatus, string> = {
  pendiente: 'bg-gold/15 text-gold-dark',
  confirmado: 'bg-espresso/10 text-espresso',
  en_preparacion: 'bg-gold/25 text-espresso',
  listo: 'bg-olive/15 text-olive',
  en_camino: 'bg-olive/20 text-olive-dark',
  entregado: 'bg-olive text-cream',
  cancelado: 'bg-rose/10 text-rose',
};
const PAY: Record<string, string> = {
  pendiente: 'bg-almond text-espresso/70',
  en_verificacion: 'bg-gold/20 text-gold-dark',
  pagado: 'bg-olive/15 text-olive',
  verificado: 'bg-olive/15 text-olive',
  rechazado: 'bg-rose/10 text-rose',
  reembolsado: 'bg-espresso/10 text-espresso',
};

export function StatusBadge({ status, payment }: { status?: OrderStatus; payment?: OrderPaymentStatus | PaymentStatus }) {
  const { t } = useTranslation();
  if (status) return <span className={`badge ${ORDER[status]}`}>{t(`status.${status}`)}</span>;
  if (payment) return <span className={`badge ${PAY[payment]}`}>💳 {t(`paymentStatus.${payment}`)}</span>;
  return null;
}
