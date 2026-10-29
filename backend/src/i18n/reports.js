// Etiquetas de reportes en es / en / fr (fallback: es).
const dict = {
  es: {
    mtypes: { entrada: 'Entrada', venta: 'Venta', ajuste: 'Ajuste', merma: 'Merma', anulacion_venta: 'Anulación de venta', devolucion: 'Devolución' },
    statuses: { pendiente: 'Pendiente', confirmado: 'Confirmado', en_preparacion: 'En preparación', listo: 'Listo', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' },
    payStatuses: { pendiente: 'Pendiente', en_verificacion: 'En verificación', pagado: 'Pagado', rechazado: 'Rechazado', reembolsado: 'Reembolsado' },
    generated_at: 'Generado', period: 'Periodo', filters: 'Filtros', none: 'ninguno', user: 'Usuario',
    records: 'Registros', currency: 'Moneda', totals: 'Totales', truncated: 'Resultado truncado al límite de {n} filas. Reduce el rango.',
    page: 'Página', estimated: 'Estimación: no es un dato confirmado.',
    titles: {
      sales: 'Ventas por día', orders: 'Pedidos', products: 'Ventas por producto', categories: 'Ventas por categoría',
      inventory: 'Inventario actual', movements: 'Movimientos de stock', top_products: 'Productos más vendidos',
      bottom_products: 'Productos menos vendidos', payment_methods: 'Métodos de pago', cancellations: 'Pedidos cancelados',
      refunds: 'Reembolsos', margins: 'Costos y márgenes (estimados)', audit: 'Historial de cambios', comparison: 'Comparación entre periodos',
    },
    col: {
      date: 'Fecha', orders: 'Pedidos', revenue: 'Ventas', order_number: 'Pedido', customer: 'Cliente', status: 'Estado',
      payment_status: 'Pago', method: 'Método', total: 'Total', product: 'Producto', category: 'Categoría', units: 'Unidades',
      share: '% ventas', abc: 'ABC', item: 'Ítem', unit: 'Unidad', quantity: 'Existencia', min: 'Mínimo', low: 'Bajo mínimo',
      type: 'Tipo', delta: 'Cantidad', balance: 'Saldo', reason: 'Motivo', amount: 'Importe', cancel_reason: 'Motivo',
      cost: 'Costo', margin: 'Margen', margin_pct: '% margen', action: 'Acción', entity: 'Entidad', metric: 'Indicador',
      current: 'Periodo actual', previous: 'Periodo anterior', change: 'Variación', paid: 'Pagados', yes: 'Sí', no: 'No',
      avg_ticket: 'Ticket promedio', cancelled: 'Cancelados', coverage: 'Cobertura (días)',
    },
    periods: { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual', custom: 'Personalizado' },
  },
  en: {
    mtypes: { entrada: 'Entry', venta: 'Sale', ajuste: 'Adjustment', merma: 'Waste', anulacion_venta: 'Sale reversal', devolucion: 'Return' },
    statuses: { pendiente: 'Pending', confirmado: 'Confirmed', en_preparacion: 'Being prepared', listo: 'Ready', en_camino: 'On the way', entregado: 'Delivered', cancelado: 'Cancelled' },
    payStatuses: { pendiente: 'Pending', en_verificacion: 'Under review', pagado: 'Paid', rechazado: 'Rejected', reembolsado: 'Refunded' },
    generated_at: 'Generated', period: 'Period', filters: 'Filters', none: 'none', user: 'User',
    records: 'Records', currency: 'Currency', totals: 'Totals', truncated: 'Result truncated at {n} rows. Narrow the range.',
    page: 'Page', estimated: 'Estimate: not confirmed data.',
    titles: {
      sales: 'Daily sales', orders: 'Orders', products: 'Sales by product', categories: 'Sales by category',
      inventory: 'Current inventory', movements: 'Stock movements', top_products: 'Best-selling products',
      bottom_products: 'Least-selling products', payment_methods: 'Payment methods', cancellations: 'Cancelled orders',
      refunds: 'Refunds', margins: 'Costs and margins (estimated)', audit: 'Change history', comparison: 'Period comparison',
    },
    col: {
      date: 'Date', orders: 'Orders', revenue: 'Sales', order_number: 'Order', customer: 'Customer', status: 'Status',
      payment_status: 'Payment', method: 'Method', total: 'Total', product: 'Product', category: 'Category', units: 'Units',
      share: '% sales', abc: 'ABC', item: 'Item', unit: 'Unit', quantity: 'On hand', min: 'Minimum', low: 'Below minimum',
      type: 'Type', delta: 'Quantity', balance: 'Balance', reason: 'Reason', amount: 'Amount', cancel_reason: 'Reason',
      cost: 'Cost', margin: 'Margin', margin_pct: 'Margin %', action: 'Action', entity: 'Entity', metric: 'Metric',
      current: 'Current period', previous: 'Previous period', change: 'Change', paid: 'Paid', yes: 'Yes', no: 'No',
      avg_ticket: 'Average ticket', cancelled: 'Cancelled', coverage: 'Coverage (days)',
    },
    periods: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Half-yearly', annual: 'Annual', custom: 'Custom' },
  },
  fr: {
    mtypes: { entrada: 'Entrée', venta: 'Vente', ajuste: 'Ajustement', merma: 'Perte', anulacion_venta: 'Annulation de vente', devolucion: 'Retour' },
    statuses: { pendiente: 'En attente', confirmado: 'Confirmée', en_preparacion: 'En préparation', listo: 'Prête', en_camino: 'En route', entregado: 'Livrée', cancelado: 'Annulée' },
    payStatuses: { pendiente: 'En attente', en_verificacion: 'En vérification', pagado: 'Payée', rechazado: 'Refusé', reembolsado: 'Remboursé' },
    generated_at: 'Généré le', period: 'Période', filters: 'Filtres', none: 'aucun', user: 'Utilisateur',
    records: 'Enregistrements', currency: 'Devise', totals: 'Totaux', truncated: 'Résultat tronqué à {n} lignes. Réduisez la période.',
    page: 'Page', estimated: 'Estimation : donnée non confirmée.',
    titles: {
      sales: 'Ventes par jour', orders: 'Commandes', products: 'Ventes par produit', categories: 'Ventes par catégorie',
      inventory: 'Inventaire actuel', movements: 'Mouvements de stock', top_products: 'Produits les plus vendus',
      bottom_products: 'Produits les moins vendus', payment_methods: 'Moyens de paiement', cancellations: 'Commandes annulées',
      refunds: 'Remboursements', margins: 'Coûts et marges (estimés)', audit: 'Historique des modifications', comparison: 'Comparaison de périodes',
    },
    col: {
      date: 'Date', orders: 'Commandes', revenue: 'Ventes', order_number: 'Commande', customer: 'Client', status: 'Statut',
      payment_status: 'Paiement', method: 'Moyen', total: 'Total', product: 'Produit', category: 'Catégorie', units: 'Unités',
      share: '% ventes', abc: 'ABC', item: 'Article', unit: 'Unité', quantity: 'Stock', min: 'Minimum', low: 'Sous le minimum',
      type: 'Type', delta: 'Quantité', balance: 'Solde', reason: 'Motif', amount: 'Montant', cancel_reason: 'Motif',
      cost: 'Coût', margin: 'Marge', margin_pct: '% marge', action: 'Action', entity: 'Entité', metric: 'Indicateur',
      current: 'Période actuelle', previous: 'Période précédente', change: 'Variation', paid: 'Payées', yes: 'Oui', no: 'Non',
      avg_ticket: 'Panier moyen', cancelled: 'Annulées', coverage: 'Couverture (jours)',
    },
    periods: { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', semiannual: 'Semestriel', annual: 'Annuel', custom: 'Personnalisé' },
  },
};

function labels(locale) {
  return dict[locale] || dict.es;
}

module.exports = { labels };
