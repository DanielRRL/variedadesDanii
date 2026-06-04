import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { AppBar } from '../../components/layout/AppBar';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { getMyOrders } from '../../services/api';
import { STATUS_LABELS } from '../admin/adminShared';
import { formatCOP } from '../../utils/format';
import type { Order } from '../../types';
import '../../css/OrdersListPage.css';

// ─── Constants ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'active',    label: 'Activos' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ACTIVE_STATUSES = new Set(['PENDING', 'PAID', 'READY']);

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

// ─── OrderCard ────────────────────────────────────────────────────────────

function statusModifier(status: string): string {
  return `orders-card__status--${status.toLowerCase()}`;
}

function OrderCard({ order }: { order: Order }) {
  return (
    <Link to={`/pedido/${order.id}`} className="orders-card">
      <div className="orders-card__body">
        <div className="orders-card__header">
          <span className="orders-card__number">
            Pedido #{order.orderNumber}
          </span>
          <span className={`orders-card__status ${statusModifier(order.status)}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <p className="orders-card__meta">{formatDate(order.createdAt)}</p>
        <p className="orders-card__total">
          {formatCOP(order.total)}
        </p>
      </div>
      <ChevronRight size={16} className="orders-card__chevron" />
    </Link>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="orders-skeleton">
      <div className="orders-skeleton__line orders-skeleton__line--wide" />
      <div className="orders-skeleton__line orders-skeleton__line--narrow" />
      <div className="orders-skeleton__line orders-skeleton__line--medium" />
    </div>
  );
}

// ─── OrdersListPage ───────────────────────────────────────────────────────

export default function OrdersListPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await getMyOrders();
      const body = res.data;
      return (Array.isArray(body) ? body : (body?.data ?? body?.orders ?? [])) as Order[];
    },
  });

  const orders = data ?? [];
  const filtered = filterOrders(orders, activeTab);

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <div className="orders-page">
      <AppBar title="MIS PEDIDOS" showBack variant="catalog" />

      <main className="orders-main">
        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="orders-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`orders-tabs__btn ${activeTab === t.key ? 'orders-tabs__btn--active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Loading — 3 skeleton cards ────────────────────────────── */}
        {isLoading && (
          <div className="orders-list">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────── */}
        {isError && (
          <div className="orders-error">
            <p className="orders-error__text">
              No se pudieron cargar tus pedidos.
            </p>
            <button onClick={() => refetch()} className="orders-error__retry">
              Reintentar
            </button>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="orders-empty">
            <ShoppingBag size={64} className="orders-empty__icon" strokeWidth={1.3} />
            <p className="orders-empty__text">
              {activeTab === 'all'
                ? 'Aún no tienes pedidos.'
                : 'No hay pedidos en esta categoría.'}
            </p>
            {activeTab === 'all' && (
              <Link to="/catalogo" className="orders-empty__cta">
                Explorar catálogo
              </Link>
            )}
          </div>
        )}

        {/* ── Order cards ───────────────────────────────────────────── */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="orders-list">
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
