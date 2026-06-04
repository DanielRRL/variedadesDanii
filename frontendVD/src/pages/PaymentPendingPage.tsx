/**
 * PaymentPendingPage.tsx — Order created, pending manual payment verification.
 *
 * Route: /pago-pendiente (ProtectedRoute)
 * Receives via navigation state:
 *   { orderId, orderNumber, total, paymentMethod, gramsEarned, deliveryType, deliveryAddress }
 *
 * Flow:
 *  1. Order was created with status PENDING.
 *  2. Customer sees payment instructions (Nequi number, Bancolombia account, etc.)
 *  3. Customer makes the transfer and sends the comprobante (screenshot) via WhatsApp.
 *  4. Admin validates the payment and updates order status from the admin panel.
 *  5. Customer can track order from "Mis Pedidos".
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2, MessageCircle, Smartphone, Banknote,
  Package, Truck, Store, Copy, Check, Landmark, ArrowLeftRight,
} from 'lucide-react';
import { useState } from 'react';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import styles from './PaymentPendingPage.module.css';

const WA_NUMBER = '573232943624';
const PAYMENT_DESTINATION = '323 294 3624 · Variedades DANII';

const PAYMENT_INFO: Record<string, { name: string; detail: string; icon: typeof Smartphone }> = {
  NEQUI:        { name: 'Nequi',              detail: PAYMENT_DESTINATION, icon: Smartphone },
  DAVIPLATA:    { name: 'Daviplata',          detail: PAYMENT_DESTINATION, icon: Landmark },
  BANCOLOMBIA:  { name: 'Bancolombia',        detail: PAYMENT_DESTINATION, icon: Banknote },
  BREB:         { name: 'Bre-B / Llave',      detail: `Transferencia desde cualquier banco a ${PAYMENT_DESTINATION}`, icon: ArrowLeftRight },
};

interface PendingState {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  deliveryType?: 'pickup' | 'delivery';
  deliveryAddress?: string;
}

export default function PaymentPendingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<PendingState>;

  const {
    orderNumber = '',
    total = 0,
    paymentMethod = 'NEQUI',
    deliveryType = 'pickup',
    deliveryAddress = '',
  } = state;

  const [copied, setCopied] = useState(false);

  const payment = PAYMENT_INFO[paymentMethod] ?? PAYMENT_INFO.NEQUI;
  const PaymentIcon = payment.icon;

  const waMessage = encodeURIComponent(
    `Hola Variedades DANII! Acabo de realizar mi pedido.\n\n` +
    `Pedido: ${orderNumber}\n` +
    `Total: ${formatCOP(total)}\n` +
    `Método: ${payment.name}\n` +
    `Entrega: ${deliveryType === 'delivery' ? `Domicilio — ${deliveryAddress}` : 'Recojo en tienda'}\n\n` +
    `Adjunto mi comprobante de pago.`
  );
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${waMessage}`;

  const handleCopyOrder = () => {
    navigator.clipboard.writeText(orderNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!state.orderId) {
    return (
      <div className={styles.page}>
        <AppBar title="Pedido" />
        <div className={styles.emptyContainer}>
          <Package size={48} className={styles.emptyIcon} strokeWidth={1.2} />
          <p className={styles.emptyText}>No hay información del pedido.</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className={styles.emptyBtn}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AppBar title="Pedido Creado" />

      <main className={styles.main}>

        {/* ── Success header ─────────────────────────────────────────────── */}
        <div className={styles.successHeader}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={40} className={styles.iconGreen} />
          </div>
          <div>
            <h1 className={styles.successTitle}>¡Pedido creado!</h1>
            <p className={styles.successSubtitle}>
              {deliveryType === 'delivery'
                ? 'Ahora envía tu comprobante de pago para que despachemos tu pedido.'
                : 'Ahora envía tu comprobante de pago para confirmar tu pedido.'}
            </p>
          </div>
        </div>

        {/* ── Order summary card ──────────────────────────────────────────── */}
        <div className={styles.orderCard}>
          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>N° Pedido</span>
            <button onClick={handleCopyOrder} className={styles.orderNumberBtn}>
              {orderNumber}
              {copied ? <Check size={12} className={styles.iconGreen} /> : <Copy size={12} className={styles.iconMuted} />}
            </button>
          </div>

          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>Total a pagar</span>
            <span className={styles.orderTotal}>{formatCOP(total)}</span>
          </div>

          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>Método</span>
            <div className={styles.orderValue}>
              <PaymentIcon size={14} className={styles.iconPink} />
              <span className={styles.orderValueText}>{payment.name}</span>
            </div>
          </div>

          <div className={styles.orderRow}>
            <span className={styles.orderLabel}>Entrega</span>
            <div className={styles.orderValue}>
              {deliveryType === 'delivery' ? (
                <Truck size={14} className={styles.iconPink} />
              ) : (
                <Store size={14} className={styles.iconPink} />
              )}
              <span className={styles.orderValueText}>
                {deliveryType === 'delivery' ? 'Domicilio' : 'Recoger en tienda'}
              </span>
            </div>
          </div>

          {deliveryType === 'delivery' && deliveryAddress && (
            <div className={styles.deliveryAddress}>
              <span className={styles.addressLabel}>Dirección: </span>
              <span className={styles.addressText}>{deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* ── Payment instructions ────────────────────────────────────────── */}
        <div className={styles.instructionsCard}>
          <h2 className={styles.sectionTitle}>Instrucciones de pago</h2>

          <div className={styles.stepsList}>
            <div className={styles.stepRow}>
              <span className={styles.stepNumber}>1</span>
              <p className={styles.stepText}>
                Realiza la transferencia de <strong>{formatCOP(total)}</strong> a:
              </p>
            </div>

            <div className={styles.paymentDetail}>
              <div className={styles.paymentDetailRow}>
                <PaymentIcon size={16} className={styles.iconPink} />
                <div>
                  <p className={styles.paymentName}>{payment.name}</p>
                  <p className={styles.paymentInfo}>{payment.detail}</p>
                </div>
              </div>
            </div>

            <div className={styles.stepRow}>
              <span className={styles.stepNumber}>2</span>
              <p className={styles.stepText}>
                Toma un <strong>pantallazo del comprobante</strong> de pago.
              </p>
            </div>

            <div className={styles.stepRow}>
              <span className={styles.stepNumber}>3</span>
              <p className={styles.stepText}>
                Envía el comprobante por <strong>WhatsApp</strong> con el botón de abajo.
              </p>
            </div>
          </div>
        </div>

        {/* ── WhatsApp CTA ────────────────────────────────────────────────── */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.whatsappBtn}
        >
          <MessageCircle size={20} strokeWidth={2} />
          Enviar comprobante por WhatsApp
        </a>

        <p className={styles.footerNote}>
          Una vez validemos tu pago, organizamos tu pedido y te avisamos.
          {deliveryType === 'delivery' && ' Coordinaremos la entrega a tu dirección.'}
        </p>

        {/* ── Secondary actions ───────────────────────────────────────────── */}
        <div className={styles.actionsRow}>
          <Link to="/pedidos" className={styles.secondaryBtn}>
            Ver mis pedidos
          </Link>
          <Link to="/catalogo" className={styles.primaryLink}>
            Seguir comprando
          </Link>
        </div>

      </main>
    </div>
  );
}
