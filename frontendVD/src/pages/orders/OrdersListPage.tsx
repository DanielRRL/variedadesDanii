import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/layout/AppBar';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { getMyOrders } from '../../services/api';
import { STATUS_LABELS, STATUS_COLORS } from '../admin/adminShared';
import type { Order } from '../../types';

const TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'active',    label: 'Activos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ACTIVE_STATUSES = new Set(['PENDING', 'PAID', 'PREPARING', 'READY']);

function filterOrders(orders: Order[], tab: TabKey): Order[] {
  if (tab === 'all') return orders;
  if (tab === 'active') return orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  if (tab === 'delivered') return orders.filter((o) => o.status === 'DELIVERED');
  return orders.filter((o) => o.status === 'CANCELLED');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link
      to={`/pedido/${order.id}`}
      className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            Pedido #{order.orderNumber}
          </span>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <p className="text-xs text-muted mt-1">{formatDate(order.createdAt)}</p>
        <p className="text-sm font-medium text-gray-800 mt-1.5">
          {formatCOP(order.total)}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

export default function OrdersListPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await getMyOrders();
      return (res.data.orders ?? []) as Order[];
    },
  });

  const orders = data ?? [];
  const filtered = filterOrders(orders, activeTab);

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppBar title="Mis Pedidos" showBack />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                activeTab === t.key
                  ? 'bg-surface shadow-sm text-gray-900'
                  : 'text-muted hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
          </div>
        )}

        {isError && (
          <p className="text-center text-muted py-12 text-sm">
            No se pudieron cargar tus pedidos. Intenta más tarde.
          </p>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <ShoppingBag size={48} className="text-gray-300" />
            <p className="text-muted text-sm">
              {activeTab === 'all'
                ? 'Aún no tienes pedidos.'
                : 'No hay pedidos en esta categoría.'}
            </p>
            {activeTab === 'all' && (
              <Link
                to="/catalogo"
                className="bg-brand-pink hover:bg-pink-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                Explorar catálogo
              </Link>
            )}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>

      <BottomTabBar activeOrderCount={activeCount} />
    </div>
  );
}
