export type Role = 'client' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  active: boolean;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  display_order: number;
  active: boolean;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  stock: number | null;
  available: boolean;
  active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type DeliveryType = 'pickup' | 'delivery';

export interface DeliveryZone {
  id: number;
  name: string;
  cost: number;
  estimated_time_minutes: number;
  active: boolean;
}

export type PaymentType = 'qr' | 'card' | 'cash';

export interface PaymentMethod {
  id: number;
  type: PaymentType;
  name: string;
  active: boolean;
  config: Record<string, string>;
}

export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method_id: number;
  amount: number;
  status: 'pendiente' | 'verificado' | 'rechazado';
  proof_image_url?: string | null;
  payment_method_name?: string;
  order_number?: string;
  customer_name?: string;
  order_total?: number;
  created_at?: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  delivery_type: DeliveryType;
  delivery_address?: string | null;
  delivery_reference?: string | null;
  delivery_recipient?: string | null;
  payment_method_id: number;
  payment_method_name?: string;
  payment_method_type?: PaymentType;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  observations?: string | null;
  created_at: string;
  ticket_number?: string;
  items: OrderItem[];
  payments: Payment[];
}

export interface Settings {
  cafe_name?: string;
  cafe_slogan?: string;
  logo_url?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  whatsapp?: string;
  gmaps_link?: string;
  opening_hours?: string;
  social_facebook?: string;
  social_instagram?: string;
  delivery_min_order?: string;
  delivery_enabled?: string;
  pickup_enabled?: string;
  [key: string]: string | undefined;
}

export interface DashboardStats {
  today: { revenue: number; count: number };
  week: { revenue: number; count: number };
  month: { revenue: number; count: number };
  pending: { count: number };
  completed: { count: number };
  byPaymentMethod: { name: string; count: number }[];
  salesLast7Days: { date: string; revenue: number }[];
  topProducts: { id: number; name: string; image_url: string | null; total_sold: number }[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado',
];
