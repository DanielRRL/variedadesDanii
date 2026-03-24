/**
 * OrderSuccessPage.tsx — Order confirmation screen after successful payment.
 *
 * Route: /pedido-exitoso (ProtectedRoute)
 * Receives via navigation state: { orderId, orderNumber, total, paymentMethod, pointsEarned }
 *
 * Points are displayed as positive reinforcement gamification.
 * The loyalty account is re-fetched server-side on next app load;
 * pointsEarned shown here is the client-side estimate (Math.floor(total * 1)).
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessState {
  orderId:       string;
  orderNumber:   string;
  total:         number;
  paymentMethod: string;
  pointsEarned:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = (location.state ?? {}) as Partial<SuccessState>;

  const {
    orderNumber  = 'VD-0000',
    total        = 0,
    pointsEarned = 0,
  } = state;

  // Prevent back-navigation to payment pending screen
  useEffect(() => {
    // Replace history entry so back button goes to /catalogo not /pago-pendiente
    window.history.replaceState(null, '', '/pedido-exitoso');
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppBar title="Pedido Confirmado" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center pb-8">

        {/* Animated checkmark */}
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <span
            className="text-5xl"
            style={{ animation: 'none' }}
            aria-label="Pedido confirmado"
          >
            ✅
          </span>
        </div>

        {/* Order details */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
            ¡Pedido Confirmado!
          </h1>
          <p className="font-mono text-lg font-bold text-brand-pink mb-1">
            {orderNumber}
          </p>
          <p className="font-heading text-2xl font-bold text-brand-gold">
            {formatCOP(total)}
          </p>
        </div>

        {/* Points earned badge — positive reinforcement gamification */}
        {pointsEarned > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl" aria-label="Trofeo">🏆</span>
            <div className="text-left">
              <p className="font-heading font-bold text-yellow-800 text-sm">
                +{pointsEarned} puntos ganados
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Añadidos a tu cuenta de fidelización
              </p>
            </div>
          </div>
        )}

        <p className="text-muted text-sm leading-relaxed max-w-xs">
          Recibirás una notificación cuando tu pedido esté listo para
          recogida o en camino.
        </p>

        {/* Navigation CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/pedidos', { replace: true })}
            className="w-full bg-brand-pink text-white font-heading font-semibold py-3 rounded-full shadow-md"
          >
            Ver mis Pedidos
          </button>
          <button
            onClick={() => navigate('/catalogo', { replace: true })}
            className="w-full border border-border text-text-primary font-heading font-semibold py-3 rounded-full"
          >
            Seguir Comprando
          </button>
        </div>

      </div>
    </div>
  );
}
