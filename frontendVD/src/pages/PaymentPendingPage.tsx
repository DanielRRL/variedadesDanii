/**
 * PaymentPendingPage.tsx — Polls for payment confirmation after order creation.
 *
 * Route: /pago-pendiente (ProtectedRoute)
 * Receives via navigation state: { orderId, orderNumber, total, paymentMethod }
 *
 * Polling replaces WebSocket for simplicity. Backend updates Order.status
 * via Wompi webhook (POST /api/payments/webhook).
 *
 * Behaviour:
 *  - Polls GET /api/orders/:id every 5 seconds.
 *  - When order.status === 'PAID' → navigate to /pedido-exitoso.
 *  - Timeout after 5 minutes → show expiry message with "Ver mis Pedidos" CTA.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getOrderById } from '../services/api';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5_000;       // 5 seconds between polls
const TIMEOUT_MS       = 5 * 60_000; // 5-minute session window

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PendingState {
  orderId:       string;
  orderNumber:   string;
  total:         number;
  paymentMethod: 'NEQUI' | 'BANCOLOMBIA' | 'BREB';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentPendingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = (location.state ?? {}) as Partial<PendingState>;

  const {
    orderId       = '',
    orderNumber   = '',
    total         = 0,
    paymentMethod = 'NEQUI',
  } = state;

  const [timedOut, setTimedOut]     = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5-minute countdown

  useEffect(() => {
    if (!orderId) return;

    // poll must be defined before the setInterval that references it
    const poll = async () => {
      try {
        const res   = await getOrderById(orderId);
        const order = res.data?.order ?? res.data;

        if (order.status === 'PAID') {
          clearInterval(pollId);
          clearTimeout(timeoutId);
          clearInterval(countdownId);
          navigate('/pedido-exitoso', {
            state: {
              orderId,
              orderNumber,
              total,
              paymentMethod,
              // 1 point earned per COP spent (Math.floor ensures whole number)
              pointsEarned: Math.floor(total),
            },
            replace: true,
          });
        }
      } catch {
        // Transient network error — keep polling silently
      }
    };

    // Poll immediately on mount, then every POLL_INTERVAL_MS
    poll();
    const pollId:      ReturnType<typeof setInterval> = setInterval(poll, POLL_INTERVAL_MS);
    const countdownId: ReturnType<typeof setInterval> = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1_000);
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      clearInterval(pollId);
      clearInterval(countdownId);
      setTimedOut(true);
    }, TIMEOUT_MS);

    return () => {
      clearInterval(pollId);
      clearTimeout(timeoutId);
      clearInterval(countdownId);
    };
  }, [orderId, orderNumber, total, paymentMethod, navigate]);

  // ─────────────────────────────────────────────────────────────────────────
  // Instruction text per payment method
  // ─────────────────────────────────────────────────────────────────────────

  const instructionText: Record<PendingState['paymentMethod'], string> = {
    NEQUI:
      `Revisa tu app de Nequi y confirma el pago de ${formatCOP(total)}. Tienes 5 minutos.`,
    BANCOLOMBIA:
      'Completa la transferencia en tu app de Bancolombia.',
    BREB:
      'Completa el pago en tu app bancaria vía Bre-B.',
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppBar title="Estado del Pago" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">

        {timedOut ? (
          /* ── Timeout state ──────────────────────────────────────────────── */
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <Clock size={40} className="text-red-500" />
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
                El pago expiró
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">
                Tu pedido{' '}
                <span className="font-bold text-text-primary">{orderNumber}</span>{' '}
                queda pendiente. Puedes reintentar el pago desde "Mis Pedidos".
              </p>
            </div>

            <button
              onClick={() => navigate('/pedidos', { replace: true })}
              className="bg-brand-pink text-white font-semibold px-8 py-3 rounded-full shadow-md"
            >
              Ver mis Pedidos
            </button>
          </>
        ) : (
          /* ── Pending state ──────────────────────────────────────────────── */
          <>
            {/* Animated clock spinner */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-brand-pink/20 border-t-brand-pink animate-spin" />
              <Clock size={36} className="text-brand-pink" />
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
                Esperando tu pago...
              </h2>
              <p className="font-heading font-bold text-brand-gold text-2xl mb-2">
                {formatCOP(total)}
              </p>
              <span className="font-mono text-xs text-muted bg-gray-100 px-3 py-1 rounded-full inline-block mb-4">
                {orderNumber}
              </span>
              <p className="text-muted text-sm leading-relaxed max-w-xs mx-auto">
                {instructionText[paymentMethod]}
              </p>
            </div>

            {/* Auto-check countdown */}
            <div className="flex items-center gap-2 text-xs text-muted">
              <span
                className="w-3 h-3 rounded-full border-2 border-muted border-t-transparent animate-spin inline-block"
              />
              <span>
                Verificando automáticamente · {minutes}:{seconds}
              </span>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
