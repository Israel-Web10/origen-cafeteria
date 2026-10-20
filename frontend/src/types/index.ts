export type Role = 'client' | 'manager' | 'admin';
export type Locale = 'es' | 'en' | 'fr';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  active: boolean;
  preferred_locale?: Locale;
  created_at?: string;
  last_login_at?: string | null;
  orders_count?: number;
}

export type Translations = Partial<Record<'en' | 'fr', { name?: string; description?: string; ingredients?: string }>>;

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  display_order: number;
  active: boolean;
  translations: Translations;
  product_count?: number;
}

export interface Variant {
  id: number;
  product_id: number;
  name: string;
  price_delta_cents: number;
  active: boolean;
  display_order: number;
  translations: Translations;
}

export interface Promotion {
  id: number;
  name: string;
  description?: string | null;
  kind: 'percent' | 'fixed';
  value: number;
  product_id?: number | null;
  category_id?: number | null;
  product_name?: string | null;
  category_name?: string | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
  running?: boolean;
  translations: Translations;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  category_translations?: Translations;
  name: string;
  slug: string;
  description?: string | null;
  ingredients?: string | null;
  allergens?: string | null;
  price_cents: number;
  final_price_cents: number;
  cost_cents?: number | null;
  image_url?: string | null;
  images?: { id: number; url: string; alt_text?: string | null }[];
  stock: number | null;
  low_stock_threshold?: number;
  prep_time_minutes?: number | null;
  is_new: boolean;
  is_featured: boolean;
  available: boolean;
  active: boolean;
  purchasable: boolean;
  tags: string[];
  translations: Translations;
  variants: Variant[];
  promotion?: Pick<Promotion, 'id' | 'name' | 'kind' | 'value' | 'ends_at' | 'translations'> | null;
  popularity?: number;
  max_by_ingredients?: number | null;
  components?: { id: number; variant_id: number | null; inventory_item_id: number; quantity: string; item_name: string; unit: string }[];
}

export interface CartLine {
  key: string;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  // Copia solo para mostrar; el precio real lo recalcula el servidor
  name: string;
  variant_name?: string | null;
  image_url?: string | null;
  unit_price_cents: number;
  slug: string;
  translations?: Translations;
}

export type DeliveryType = 'pickup' | 'delivery';

export interface DeliveryZone {
  id: number;
  name: string;
  cost_cents: number;
  estimated_time_minutes: number;
  active: boolean;
}

export type PaymentType = 'qr' | 'card' | 'cash';

export interface PaymentMethod {
  id: number;
  type: PaymentType;
  name: string;
  active: boolean;
  display_order: number;
  config: {
    instructions?: string;
    instructions_en?: string;
    instructions_fr?: string;
    qr_image?: string;
    account_holder?: string;
    bank?: string;
    cash_on_pickup?: boolean;
    cash_on_delivery?: boolean;
  };
  translations: Translations;
  unavailable_reason?: 'no_provider' | null;
  test_mode?: boolean;
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'en_preparacion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
export type OrderPaymentStatus = 'pendiente' | 'en_verificacion' | 'pagado' | 'rechazado' | 'reembolsado';
export type PaymentStatus = 'pendiente' | 'en_verificacion' | 'verificado' | 'rechazado' | 'reembolsado';

export interface OrderItem {
  id: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  variant_name?: string | null;
  unit_price_cents: number;
  quantity: number;
  discount_cents: number;
  subtotal_cents: number;
}

export interface Payment {
  id: number;
  order_id: number;
  method_type: PaymentType;
  amount_cents: number;
  currency_code: string;
  status: PaymentStatus;
  reference?: string | null;
  has_proof: boolean;
  cash_received_cents?: number | null;
  change_cents?: number | null;
  gateway_mode?: 'test' | 'live' | null;
  rejection_reason?: string | null;
  verified_at?: string | null;
  verified_by_name?: string | null;
  created_at: string;
  order_number?: string;
  customer_name?: string;
  order_status?: OrderStatus;
  payment_method_name?: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id?: number | null;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string | null;
  delivery_type: DeliveryType;
  delivery_address?: string | null;
  delivery_reference?: string | null;
  delivery_zone_name?: string | null;
  payment_method_id?: number;
  payment_method_name?: string;
  payment_method_type: PaymentType;
  payment_method_config?: PaymentMethod['config'];
  currency_code: string;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  display_currency?: string | null;
  display_rate?: string | null;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  observations?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  ticket_number?: string;
  items: OrderItem[];
  payments?: Payment[];
  history?: { from_status?: OrderStatus | null; to_status: OrderStatus; note?: string | null; created_at: string; changed_by_name?: string | null }[];
  public_token?: string;
  limited?: boolean;
}

export interface Quote {
  currency_code: string;
  lines: { product_id: number; variant_id: number | null; name: string; variant_name: string | null; unit_price_cents: number; quantity: number; discount_cents: number; subtotal_cents: number; promotion: string | null }[];
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  delivery_zone: { id: number; name: string; estimated_time_minutes: number } | null;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  enabled: boolean;
  is_base: boolean;
}

export interface ExchangeRate {
  id: number;
  base_code: string;
  quote_code: string;
  rate: string;
  rate_type: 'oficial' | 'comercial' | 'manual';
  source: string;
  notes?: string | null;
  effective_at: string;
  symbol?: string;
  decimals?: number;
  created_by_name?: string;
}

export type Settings = Record<string, string>;

export interface PublicConfig {
  settings: Settings;
  deliveryZones: DeliveryZone[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
}

export interface ImageAsset {
  id: number;
  entity_type: string;
  entity_id: number | null;
  url: string;
  alt_text?: string | null;
  is_primary: boolean;
  is_illustrative: boolean;
  source?: string | null;
  license?: string | null;
  display_order: number;
  width?: number | null;
  height?: number | null;
}

export interface Page {
  slug: string;
  locale: Locale;
  title: string;
  body: string;
  version: number;
  updated_at: string;
  fallback?: boolean;
  draft_title?: string | null;
  draft_body?: string | null;
  published?: boolean;
}

export interface InventoryItem {
  id: number;
  name: string;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'unidad';
  quantity: string;
  min_quantity: string;
  cost_per_unit_cents: string | null;
  supplier_id: number | null;
  supplier_name?: string | null;
  tracks_expiry: boolean;
  active: boolean;
  low: boolean;
  used_in: number;
}

export interface StockMovement {
  id: number;
  product_id: number | null;
  inventory_item_id: number | null;
  product_name?: string | null;
  item_name?: string | null;
  unit?: string | null;
  type: 'entrada' | 'venta' | 'ajuste' | 'merma' | 'anulacion_venta' | 'devolucion';
  quantity_delta: string;
  balance_after: string;
  unit_cost_cents?: string | null;
  reason?: string | null;
  order_number?: string | null;
  user_name?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
}

export interface Kpis {
  revenue_cents: number;
  billed_cents: number;
  delivery_cents: number;
  discounts_cents: number;
  orders: number;
  paid_orders: number;
  units: number;
  avg_ticket_cents: number;
  cancelled: { orders: number; value_cents: number };
  refunds: { count: number; value_cents: number };
  margin: { cents: number | null; coverage: number; estimated: boolean; reason?: string };
}

export interface AnalyticsSummary {
  range: { period: string; timezone: string; from: string; to: string; lastDay: string; days: number; previous: { from: string; to: string }; previousYear: { from: string; to: string } };
  currency: string;
  kpis: Kpis;
  comparison: {
    basis: 'to_date' | 'full_period';
    previous_range: { from: string; to: string };
    previous: { kpis: Kpis; revenue_change: number | null; orders_change: number | null };
    previous_year: { kpis?: Kpis; revenue_change?: number | null; orders_change?: number | null; available?: boolean };
  };
  series: { date: string; revenue_cents: number; orders: number }[];
  moving_average_7d: { date: string; value: number | null }[];
  anomalies: { date: string; revenue_cents: number; expected_cents: number; z: number }[];
  time: { hours: { hour: number; orders: number; revenue_cents: number }[]; weekdays: { dow: number; orders: number; revenue_cents: number }[] };
  categories: { id: number; name: string; revenue_cents: number; units: number }[];
  products: {
    top: RankedProduct[];
    bottom: RankedProduct[];
    abc: RankedProduct[];
  };
  payment_methods: { id: number; name: string; type: PaymentType; orders: number; total_cents: number; paid: number }[];
  forecast:
    | { available: true; method: string; estimated: true; days: { date: string; expected_cents: number; low_cents: number; high_cents: number }[] }
    | { available: false; reason: string; required_days: number; active_days: number; message: string };
  inventory: { id: number; name: string; unit: string; quantity: string; min_quantity: string; daily_consumption: number; coverage_days: number | null; low: boolean }[];
  data_quality: { days_with_sales_total: number };
}

export interface RankedProduct {
  id: number | null;
  name: string;
  units: number;
  revenue_cents: number;
  share?: number;
  class?: 'A' | 'B' | 'C';
}

export interface AuditEntry {
  id: number;
  user_name?: string | null;
  user_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  created_at: string;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado'];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo', 'cancelado'],
  listo: ['en_camino', 'entregado', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};
