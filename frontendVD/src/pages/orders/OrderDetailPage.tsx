import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle, Clock, Receipt, Star, XCircle, CreditCard,
} from 'lucide-react';
import { AppBar } from '../../components/layout/AppBar';
import { BottomTabBar } from '../../components/layout/BottomTabBar';
import { getOrderById, getOrderHistory } from '../../services/api';
import { STATUS_LABELS } from '../admin/adminShared';
import type { Order, OrderStatusHistory } from '../../types';
import styles from './OrderDetailPage.module.css';

const ORDER_STEPS: Order['status'][] = ['PENDING', 'PAID', 'READY', 'DELIVERED'];

const STEP_LABELS: Record<string, string> = {
  PENDING:   'Pedido recibido',
  PAID:      'Pago confirmado',
  READY:     'Listo para entrega',
  DELIVERED: 'Entregado',
};

const STATUS_CSS: Record<string, string> = {
  PENDING:    styles.statusPending,
  PAID:       styles.statusPaid,
  PREPARING:  styles.statusPreparing,
  READY:      styles.statusReady,
  DELIVERED:  styles.statusDelivered,
  CANCELLED:  styles.statusCancelled,
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
      <div className={styles.cancelCard}>
        <XCircle size={20} className={styles.cancelIcon} />
        <div>
          <p className={styles.cancelTitle}>Pedido cancelado</p>
          {cancelEntry && (
            <p className={styles.cancelDate}>{formatDate(cancelEntry.createdAt)}</p>
          )}
          {cancelEntry?.notes && (
            <p className={styles.cancelNotes}>{cancelEntry.notes}</p>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.indexOf(order.status);

  return (
    <div className={styles.timelineCard}>
      <p className={styles.timelineTitle}>Estado del pedido</p>
      <ol className={styles.stepList}>
        {ORDER_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === ORDER_STEPS.length - 1;
          const historyEntry = history.find((h) => h.status === step);

          return (
            <li key={step} className={styles.stepRow}>
              <div className={styles.stepIndicator}>
                <div
                  className={`${styles.stepDotBase} ${
                    isCompleted
                      ? styles.stepDotCompleted
                      : isCurrent
                      ? styles.stepDotCurrent
                      : styles.stepDotPending
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={14} />
                  ) : isCurrent ? (
                    <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: '#fff' }} />
                  ) : (
                    <Clock size={14} />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`${styles.stepConnector} ${
                      isCompleted ? styles.stepConnectorCompleted : styles.stepConnectorDefault
                    }`}
                  />
                )}
              </div>

              <div className={styles.stepContent}>
                <p
                  className={
                    isCurrent
                      ? styles.stepLabelCurrent
                      : isCompleted
                      ? styles.stepLabelCompleted
                      : styles.stepLabelPending
                  }
                >
                  {STEP_LABELS[step]}
                </p>
                {historyEntry && (
                  <p className={styles.stepTimestamp}>
                    {formatDate(historyEntry.createdAt)}
                  </p>
                )}
                {historyEntry?.notes && (
                  <p className={styles.stepNotes}>{historyEntry.notes}</p>
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

  const {
    data: order,
    isLoading: loadingOrder,
    isError: errOrder,
    refetch: refetchOrder,
  } = useQuery({
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
    <div className={styles.page}>
      <AppBar title="Detalle del pedido" showBack />

      <main className={styles.main}>
        {loadingOrder && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
          </div>
        )}

        {errOrder && (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>No se pudo cargar el pedido.</p>
            <button onClick={() => refetchOrder()} className={styles.retryBtn}>
              Reintentar
            </button>
            <Link to="/pedidos" className={styles.backLink}>
              &larr; Mis pedidos
            </Link>
          </div>
        )}

        {order && (
          <div className={styles.content}>
            {/* Header */}
            <div className={styles.headerCard}>
              <div className={styles.headerTop}>
                <div>
                  <p className={styles.headerLabel}>Pedido</p>
                  <p className={styles.headerNumber}>#{order.orderNumber}</p>
                </div>
                <span
                  className={`${styles.statusBadge} ${STATUS_CSS[order.status] ?? styles.statusPending}`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <p className={styles.headerDate}>{formatDate(order.createdAt)}</p>
            </div>

            {/* Timeline */}
            <StatusTimeline order={order} history={history} />

            {/* Pending payment */}
            {order.status === 'PENDING' && (
              <div className={`${styles.bannerBase} ${styles.bannerPending}`}>
                <Clock size={18} className={`${styles.bannerIcon} ${styles.bannerIconPending}`} />
                <div>
                  <p className={`${styles.bannerTitle} ${styles.bannerTitlePending}`}>Esperando pago</p>
                  <p className={`${styles.bannerText} ${styles.bannerTextPending}`}>
                    Realiza la transferencia y envía el comprobante por WhatsApp para confirmar tu pedido.
                  </p>
                </div>
              </div>
            )}

            {/* Paid / Ready */}
            {(order.status === 'PAID' || order.status === 'READY') && (
              <div className={`${styles.bannerBase} ${styles.bannerPaid}`}>
                <CheckCircle size={18} className={`${styles.bannerIcon} ${styles.bannerIconPaid}`} />
                <div>
                  <p className={`${styles.bannerTitle} ${styles.bannerTitlePaid}`}>Pago confirmado</p>
                  <p className={`${styles.bannerText} ${styles.bannerTextPaid}`}>
                    Solo falta la entrega o pasar a reclamar al local.
                  </p>
                </div>
              </div>
            )}

            {/* Delivered */}
            {order.status === 'DELIVERED' && (
              <div className={`${styles.bannerBase} ${styles.bannerDelivered}`}>
                <Star size={18} className={`${styles.bannerIcon} ${styles.bannerIconDelivered}`} />
                <div>
                  <p className={`${styles.bannerTitle} ${styles.bannerTitleDelivered}`}>¡Pedido entregado!</p>
                  <p className={`${styles.bannerText} ${styles.bannerTextDelivered}`}>
                    Gracias por tu compra en Variedades DANII.
                  </p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className={styles.itemsCard}>
              <p className={styles.sectionTitle}>
                <Receipt size={15} className={styles.sectionIcon} />
                Articulos
              </p>
              <div>
                {order.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`${styles.itemRow} ${idx < order.items.length - 1 ? styles.itemDivider : ''}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className={styles.itemName}>{item.product.name}</p>
                      <p className={styles.itemMeta}>
                        x{item.quantity} \u00b7 {formatCOP(item.unitPrice)} c/u
                      </p>
                    </div>
                    <p className={styles.itemSubtotal}>{formatCOP(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className={styles.totalsCard}>
              <p className={styles.sectionTitle}>
                <CreditCard size={15} className={styles.sectionIcon} />
                Resumen de pago
              </p>
              <div className={styles.totalsList}>
                <div className={styles.totalsRow}>
                  <span>Subtotal</span>
                  <span>{formatCOP(order.subtotal)}</span>
                </div>
                <div className={styles.totalsDivider}>
                  <span>Total</span>
                  <span className={styles.totalsValue}>{formatCOP(order.total)}</span>
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
