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
  CheckCircle2, MessageCircle, Smartphone, Banknote, CreditCard,
  Package, Truck, Store, Copy, Check,
} from 'lucide-react';
import { useState } from 'react';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** WhatsApp business phone for Variedades DANII. */
const WA_NUMBER = '573003837442';

/** Payment details per method. */
const PAYMENT_INFO: Record<string, { name: string; detail: string; icon: typeof Smartphone }> = {
  NEQUI: {
    name: 'Nequi',
    detail: '300 383 7442 · Variedades DANII',
    icon: Smartphone,
  },
  BANCOLOMBIA: {
    name: 'Bancolombia',
    detail: 'Cuenta de ahorros · Variedades DANII',
    icon: Banknote,
  },
  BREB: {
    name: 'Bre-B / Transferencia',
    detail: 'Transferencia desde cualquier banco',
    icon: CreditCard,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PendingState {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  gramsEarned?: number;
  deliveryType?: 'pickup' | 'delivery';
  deliveryAddress?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentPendingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as Partial<PendingState>;

  const {
    orderNumber = '',
    total = 0,
    paymentMethod = 'NEQUI',
    gramsEarned = 0,
    deliveryType = 'pickup',
    deliveryAddress = '',
  } = state;

  const [copied, setCopied] = useState(false);

  const payment = PAYMENT_INFO[paymentMethod] ?? PAYMENT_INFO.NEQUI;
  const PaymentIcon = payment.icon;

  // Build WhatsApp message
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

  // Redirect to home if no state
  if (!state.orderId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppBar title="Pedido" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5">
          <Package size={48} className="text-brand-pink/40" strokeWidth={1.2} />
          <p className="text-muted text-sm text-center">No hay información del pedido.</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-brand-pink text-white font-semibold px-8 py-3 rounded-full"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <AppBar title="Pedido Creado" />

      <main className="flex-1 px-4 py-6 space-y-5 pb-8">

        {/* ── Success header ─────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-text-primary">
              ¡Pedido creado!
            </h1>
            <p className="text-muted text-sm mt-1">
              {deliveryType === 'delivery'
                ? 'Ahora envía tu comprobante de pago para que despachemos tu pedido.'
                : 'Ahora envía tu comprobante de pago para confirmar tu pedido.'}
            </p>
          </div>
        </div>

        {/* ── Order summary card ──────────────────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">N° Pedido</span>
            <button
              onClick={handleCopyOrder}
              className="flex items-center gap-1.5 font-mono text-sm font-bold text-text-primary bg-gray-100 px-3 py-1 rounded-full"
            >
              {orderNumber}
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-muted" />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Total a pagar</span>
            <span className="font-heading font-bold text-lg text-brand-gold">{formatCOP(total)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Método</span>
            <div className="flex items-center gap-1.5">
              <PaymentIcon size={14} className="text-brand-pink" />
              <span className="text-sm font-medium text-text-primary">{payment.name}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Entrega</span>
            <div className="flex items-center gap-1.5">
              {deliveryType === 'delivery' ? (
                <Truck size={14} className="text-brand-pink" />
              ) : (
                <Store size={14} className="text-brand-pink" />
              )}
              <span className="text-sm font-medium text-text-primary">
                {deliveryType === 'delivery' ? 'Domicilio' : 'Recoger en tienda'}
              </span>
            </div>
          </div>

          {deliveryType === 'delivery' && deliveryAddress && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-muted">Dirección: </span>
              <span className="text-xs text-text-primary font-medium">{deliveryAddress}</span>
            </div>
          )}

          {gramsEarned > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-amber-600 text-sm">🏆</span>
              <span className="text-xs font-medium text-amber-700">
                Ganarás {gramsEarned} gramo{gramsEarned !== 1 ? 's' : ''} con este pedido
              </span>
            </div>
          )}
        </div>

        {/* ── Payment instructions ────────────────────────────────────────── */}
        <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-xl p-4 space-y-3">
          <h2 className="font-heading font-semibold text-sm text-text-primary">
            Instrucciones de pago
          </h2>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex-none w-6 h-6 bg-brand-pink text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-sm text-text-primary leading-relaxed">
                Realiza la transferencia de <strong>{formatCOP(total)}</strong> a:
              </p>
            </div>

            <div className="ml-9 bg-surface rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <PaymentIcon size={16} className="text-brand-pink flex-none" />
                <div>
                  <p className="font-heading font-semibold text-sm text-text-primary">{payment.name}</p>
                  <p className="text-xs text-muted">{payment.detail}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-none w-6 h-6 bg-brand-pink text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-sm text-text-primary leading-relaxed">
                Toma un <strong>pantallazo del comprobante</strong> de pago.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-none w-6 h-6 bg-brand-pink text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-sm text-text-primary leading-relaxed">
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
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-full bg-[#25D366] text-white font-heading font-bold text-[15px] active:scale-[0.98] transition-transform shadow-lg"
        >
          <MessageCircle size={20} strokeWidth={2} />
          Enviar comprobante por WhatsApp
        </a>

        <p className="text-center text-[11px] text-muted leading-relaxed">
          Una vez validemos tu pago, organizamos tu pedido y te avisamos.
          {deliveryType === 'delivery' && ' Coordinaremos la entrega a tu dirección.'}
        </p>

        {/* ── Secondary actions ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <Link
            to="/pedidos"
            className="flex-1 py-3 rounded-xl border border-border bg-surface text-center font-body font-medium text-sm text-text-primary active:bg-gray-50 transition-colors"
          >
            Ver mis pedidos
          </Link>
          <Link
            to="/catalogo"
            className="flex-1 py-3 rounded-xl border border-brand-pink bg-brand-pink/5 text-center font-body font-medium text-sm text-brand-pink active:bg-brand-pink/10 transition-colors"
          >
            Seguir comprando
          </Link>
        </div>

      </main>
    </div>
  );
}
