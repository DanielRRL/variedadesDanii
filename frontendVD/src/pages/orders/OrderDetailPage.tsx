import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, Package, Truck, Star, XCircle } from 'lucide-react';
import { AppBar } from '../../components/layout/AppBar';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { getOrderById, getOrderHistory } from '../../services/api';
import { STATUS_LABELS, STATUS_COLORS } from '../admin/adminShared';
import type { Order, OrderStatusHistory } from '../../types';

const ORDER_STEPS: Order['status'][] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'DELIVERED'];

const STEP_LABELS: Record<string, string> = {
  PENDING:   'Pedido recibido',
  PAID:      'Pago confirmado',
  PREPARING: 'En preparación',
  READY:     'Listo para entrega',
  DELIVERED: 'Entregado',
};

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusTimeline({
  order,
  history,
}: {
  order: Order;
  history: OrderStatusHistory[];
}) {
  if (order.status === 'CANCELLED') {
    const cancelEntry = history.find((h) => h.status === 'CANCELLED');
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <XCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Pedido cancelado</p>
          {cancelEntry && (
            <p className="text-xs text-red-500 mt-0.5">{formatDate(cancelEntry.createdAt)}</p>
          )}
          {cancelEntry?.notes && (
            <p className="text-xs text-muted mt-1">{cancelEntry.notes}</p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.indexOf(order.status);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Estado del pedido</h3>
      <ol className="flex flex-col gap-0">
        {ORDER_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === ORDER_STEPS.length - 1;

          const historyEntry = history.find((h) => h.status === step);

          return (
            <li key={step} className="flex gap-3">
              {/* Indicator column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-brand-pink text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={14} />
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  ) : (
                    <Clock size={14} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-6 my-1 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-brand-pink' : isCompleted ? 'text-gray-900' : 'text-muted'
                  }`}
                >
                  {STEP_LABELS[step]}
                </p>
                {historyEntry && (
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(historyEntry.createdAt)}
                  </p>
                )}
                {historyEntry?.notes && (
                  <p className="text-xs text-gray-500 mt-0.5 italic">{historyEntry.notes}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading: loadingOrder, isError: errOrder, refetch: refetchOrder } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await getOrderById(id!);
      return (res.data?.order ?? res.data) as Order;
    },
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', id],
    queryFn: async () => {
      const res = await getOrderHistory(id!);
      const body = res.data;
      return (Array.isArray(body) ? body : (body?.history ?? [])) as OrderStatusHistory[];
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppBar title="Detalle del pedido" showBack />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-24">
        {loadingOrder && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
          </div>
        )}

        {errOrder && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-muted text-sm">No se pudo cargar el pedido.</p>
            <button
              onClick={() => refetchOrder()}
              className="bg-brand-pink text-white text-sm font-semibold px-5 py-2 rounded-xl"
            >
              Reintentar
            </button>
            <Link to="/pedidos" className="text-brand-pink text-sm hover:underline">
              ← Mis pedidos
            </Link>
          </div>
        )}

        {order && (
          <div className="flex flex-col gap-4">
            {/* Header summary */}
            <div className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">Pedido</p>
                  <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-2">{formatDate(order.createdAt)}</p>
            </div>

            {/* Timeline */}
            <StatusTimeline order={order} history={history} />

            {/* Pending payment notice */}
            {order.status === 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock size={18} className="text-yellow-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Esperando pago</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Tu pedido está reservado. Completa el pago para que lo preparemos.
                  </p>
                </div>
              </div>
            )}

            {/* Delivered banner */}
            {order.status === 'DELIVERED' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <Star size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    🎉 ¡Pedido entregado!
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Gracias por tu compra en Variedades DANII.
                  </p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-surface border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={15} className="text-brand-pink shrink-0" />
                Artículos
              </h3>
              <div className="flex flex-col divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product.name}
                      </p>
                      {item.product.essence && (
                        <p className="text-xs text-muted mt-0.5">
                          {item.product.essence.name}
                          {item.product.mlQuantity ? ` · ${item.product.mlQuantity} ml` : ''}
                        </p>
                      )}
                      <p className="text-xs text-muted mt-0.5">
                        x{item.quantity} · {formatCOP(item.unitPrice)} c/u
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCOP(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-surface border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck size={15} className="text-brand-pink shrink-0" />
                Resumen de pago
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatCOP(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento</span>
                    <span>-{formatCOP(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-border pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCOP(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomTabBar />
    </div>
  );
}
