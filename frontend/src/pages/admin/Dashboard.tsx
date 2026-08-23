import { useEffect, useState } from 'react';
import type { DashboardStats } from '../../types';
import * as orderService from '../../services/orderService';
import { PageLoading } from '../../components/Loading';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50 mb-2">{label}</p>
      <p className="text-2xl font-display text-espresso">{value}</p>
      {sub && <p className="text-xs text-charcoal/40 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;
  if (!stats) return <p className="text-charcoal/60">No se pudieron cargar las estadísticas.</p>;

  const maxRevenue = Math.max(...stats.salesLast7Days.map((d) => Number(d.revenue)), 1);

  return (
    <div>
      <h1 className="text-3xl mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Ventas de hoy" value={`Bs ${Number(stats.today.revenue).toFixed(2)}`} sub={`${stats.today.count} pedidos`} />
        <StatCard label="Ventas de la semana" value={`Bs ${Number(stats.week.revenue).toFixed(2)}`} sub={`${stats.week.count} pedidos`} />
        <StatCard label="Ventas del mes" value={`Bs ${Number(stats.month.revenue).toFixed(2)}`} sub={`${stats.month.count} pedidos`} />
        <StatCard label="Pedidos pendientes" value={String(stats.pending.count)} sub={`${stats.completed.count} entregados en total`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Simple bar chart, últimos 7 días */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display text-lg mb-4">Ventas — últimos 7 días</h3>
          <div className="flex items-end gap-3 h-40">
            {stats.salesLast7Days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-32">
                  <div
                    className="w-full max-w-[32px] bg-gold rounded-t"
                    style={{ height: `${(Number(d.revenue) / maxRevenue) * 100}%`, minHeight: Number(d.revenue) > 0 ? 4 : 0 }}
                    title={`Bs ${Number(d.revenue).toFixed(2)}`}
                  />
                </div>
                <span className="text-[10px] text-charcoal/50">
                  {new Date(d.date).toLocaleDateString('es-BO', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="card p-5">
          <h3 className="font-display text-lg mb-4">Métodos de pago</h3>
          <ul className="space-y-3">
            {stats.byPaymentMethod.map((m) => (
              <li key={m.name} className="flex justify-between text-sm">
                <span className="text-charcoal/70">{m.name}</span>
                <span className="font-semibold text-espresso">{m.count}</span>
              </li>
            ))}
            {stats.byPaymentMethod.length === 0 && <p className="text-sm text-charcoal/40">Sin datos aún.</p>}
          </ul>
        </div>
      </div>

      {/* Productos más vendidos */}
      <div className="card p-5 mt-6">
        <h3 className="font-display text-lg mb-4">Productos más vendidos</h3>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-charcoal/40">Todavía no hay ventas registradas.</p>
        ) : (
          <ol className="space-y-2">
            {stats.topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-charcoal/70">
                  <span className="text-charcoal/30 font-mono mr-2">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="font-semibold text-espresso">{p.total_sold} vendidos</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
