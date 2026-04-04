/**
 * OrderSuccessPage.tsx — Order confirmation screen after successful payment.
 *
 * Route: /pedido-exitoso (ProtectedRoute)
 * Receives via navigation state: { orderId, orderNumber, total, paymentMethod }
 *
 * Shows gram earned (+1g) and game token notification as gamification hooks.
 * The gram account is re-fetched to show the current balance.
 */

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Scale } from 'lucide-react';
import { formatCOP } from '../utils/format';
import { getMyGramAccount } from '../services/api';
import { AppBar } from '../components/layout/AppBar';
import { GRAMS_PER_OZ, gramProgress } from '../utils/priceCalculator';
import type { GramAccount } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessState {
  orderId:       string;
  orderNumber:   string;
  total:         number;
  paymentMethod: string;
  gramsEarned?:  number;
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
    gramsEarned  = 0,
  } = state;

  // Re-fetch gram account to show updated balance
  const { data: gramRes } = useQuery({
    queryKey: ['gramAccount', 'order-success'],
    queryFn: getMyGramAccount,
    staleTime: 0,
  });
  const gram = (gramRes?.data?.account ?? gramRes?.data) as GramAccount | undefined;
  const currentGrams = gram?.currentGrams ?? 0;
  const pct = gramProgress(currentGrams);

  // Prevent back-navigation to payment pending screen
  useEffect(() => {
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

        {/* Gram earned badge */}
        {gramsEarned > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4 flex items-center gap-3 w-full max-w-xs">
            <Scale size={22} className="text-brand-gold flex-none" />
            <div className="text-left flex-1">
              <p className="font-heading font-bold text-yellow-800 text-sm">
                +{gramsEarned}g acumulado{gramsEarned !== 1 ? 's' : ''}
              </p>
              {currentGrams >= GRAMS_PER_OZ ? (
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                  🎉 ¡Tienes {currentGrams}g! Ya puedes canjear 1 oz de esencia gratis.
                </p>
              ) : (
                <p className="text-xs text-yellow-700 mt-0.5">
                  {currentGrams}/{GRAMS_PER_OZ}g hacia tu próxima oz gratis
                </p>
              )}
              {/* Mini progress bar */}
              <div className="w-full h-1.5 bg-yellow-200 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-brand-gold rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Game token notification */}
        <div className="bg-pink-50 border border-pink-200 rounded-2xl px-6 py-4 flex items-center gap-3 w-full max-w-xs">
          <Gamepad2 size={22} className="text-brand-pink flex-none" />
          <div className="text-left">
            <p className="font-heading font-bold text-pink-800 text-sm">
              🎮 ¡Ficha de juego recibida!
            </p>
            <p className="text-xs text-pink-700 mt-0.5">
              Juega la ruleta o puzzle y gana gramos extra.
            </p>
          </div>
        </div>

        <p className="text-muted text-sm leading-relaxed max-w-xs">
          Recibirás una notificación cuando tu pedido esté listo para
          recogida o en camino.
        </p>

        {/* Navigation CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/juegos', { replace: true })}
            className="w-full bg-brand-pink text-white font-heading font-semibold py-3 rounded-full shadow-md flex items-center justify-center gap-2"
          >
            <Gamepad2 size={18} /> Jugar Ahora
          </button>
          <button
            onClick={() => navigate('/mis-gramos', { replace: true })}
            className="w-full border border-brand-gold text-brand-gold font-heading font-semibold py-3 rounded-full flex items-center justify-center gap-2"
          >
            <Scale size={18} /> Ver mis Gramos
          </button>
          <button
            onClick={() => navigate('/pedidos', { replace: true })}
            className="w-full border border-border text-text-primary font-heading font-semibold py-3 rounded-full"
          >
            Ver mis Pedidos
          </button>
        </div>

      </div>
    </div>
  );
}
