/**
 * CartPage.tsx — Shopping cart, order configuration, and checkout.
 *
 * Route: /carrito (ProtectedRoute — requires authentication)
 * Backend:
 *   POST /api/orders               — creates the order
 *   POST /api/payments/initiate    — starts the Wompi payment flow
 *
 * Flow after submit:
 *   BREB    → redirect to paymentUrl returned by Wompi
 *   NEQUI   → navigate to /pago-pendiente (poll for PAID status)
 *   BANCOLOMBIA → navigate to /pago-pendiente (poll for PAID status)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Truck,
  CreditCard,
  Trophy,
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { createOrder, initiatePayment } from '../services/api';
import type { CartItem, Order } from '../types';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DELIVERY_FEE = 5_000; // COP added for Armenia home delivery

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: CartItemRow
// ─────────────────────────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
  onRemove: () => void;
}

function CartItemRow({ item, onRemove }: CartItemRowProps) {
  return (
    <div className="flex gap-3 p-4 bg-surface rounded-xl shadow-card items-start">
      {/* Thumbnail */}
      {item.photoUrl ? (
        <img
          src={item.photoUrl}
          alt={item.essenceName}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-2xl">
          🧴
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-text-primary text-sm leading-tight">
          {item.essenceName}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {item.oz} oz · {item.bottleType} · {item.ml} ml
        </p>
        {item.returnsBottle && (
          <p className="text-xs text-green-600 mt-0.5">
            ↩ Devuelves frasco → -{formatCOP(item.returnDiscount)}
          </p>
        )}
        <p className="font-body font-bold text-brand-pink text-sm mt-1">
          {formatCOP(item.lineTotal)}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={onRemove}
        aria-label="Eliminar del carrito"
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const navigate = useNavigate();

  // ── Cart store ─────────────────────────────────────────────────────────────
  const items            = useCartStore((s) => s.items);
  const removeItem       = useCartStore((s) => s.removeItem);
  const clearCart        = useCartStore((s) => s.clearCart);
  const deliveryType     = useCartStore((s) => s.deliveryType);
  const setDeliveryType  = useCartStore((s) => s.setDeliveryType);
  const paymentMethod    = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const nequiPhone       = useCartStore((s) => s.nequiPhone);
  const setNequiPhone    = useCartStore((s) => s.setNequiPhone);
  // Calling computed getters in the selector returns primitives — safe with Zustand
  const subtotal             = useCartStore((s) => s.subtotal());
  const bottleReturnDiscount = useCartStore((s) => s.totalDiscount());

  // ── Auth store ─────────────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes]                     = useState('');
  const [redeemExpanded, setRedeemExpanded]   = useState(false);
  const [pointsInput, setPointsInput]         = useState('');
  const [pointsToRedeem, setPointsToRedeem]   = useState(0);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');

  // ── Computed values ────────────────────────────────────────────────────────
  const availablePoints    = user?.loyaltyAccount?.points ?? 0;
  const loyaltyDiscountPct = user?.loyaltyAccount?.discountPct ?? 0;

  /**
   * Loyalty percentage discount shown as a client-side preview.
   * Backend recalculates the actual discount on POST /api/orders.
   */
  const loyaltyDiscount = loyaltyDiscountPct > 0
    ? Math.floor(subtotal * loyaltyDiscountPct / 100)
    : 0;

  const deliveryFee = deliveryType === 'delivery' ? DELIVERY_FEE : 0;

  const finalTotal = Math.max(
    0,
    subtotal - bottleReturnDiscount - loyaltyDiscount - pointsToRedeem + deliveryFee,
  );

  // Max redeemable: can't exceed available points or the order total
  const maxRedeemable = Math.min(availablePoints, finalTotal + pointsToRedeem);

  // Nequi: exactly 10 digits starting with 3
  const nequiValid = /^3\d{9}$/.test(nequiPhone);

  const canSubmit =
    items.length > 0 &&
    paymentMethod !== '' &&
    (paymentMethod !== 'NEQUI' || nequiValid) &&
    (deliveryType !== 'delivery' || deliveryAddress.trim().length > 0) &&
    !isSubmitting;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleApplyPoints = () => {
    const val     = Math.floor(Number(pointsInput)) || 0;
    const clamped = Math.min(Math.max(0, val), maxRedeemable);
    setPointsToRedeem(clamped);
    setPointsInput(String(clamped));
  };

  const handleCancelRedeem = () => {
    setPointsToRedeem(0);
    setPointsInput('');
    setRedeemExpanded(false);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      // Step 1 — Create the order
      // POST /api/loyalty/redeem is called AFTER order creation, not before.
      // The pointsToRedeem value is passed in CreateOrderInput for the backend to handle.
      const orderRes = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: 1 })),
        paymentMethod: paymentMethod as Order['paymentMethod'],
        type: 'ONLINE',
        deliveryAddress:
          deliveryType === 'delivery' && deliveryAddress.trim()
            ? deliveryAddress.trim()
            : undefined,
        pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
        notes: notes.trim() || undefined,
      });

      const order: { id: string; orderNumber: string } =
        orderRes.data?.order ?? orderRes.data;
      const orderId     = order.id;
      const orderNumber = order.orderNumber ?? '';

      // Step 2 — Initiate Wompi payment
      // amountInCents: COP × 100 (Wompi requires centavos)
      const paymentRes = await initiatePayment({
        orderId,
        amountInCents: Math.round(finalTotal * 100),
        customerEmail: user!.email,
        redirectUrl: `${window.location.origin}/pedido-exitoso`,
      });

      const paymentUrl: string = paymentRes.data?.paymentUrl ?? '';

      // Clear cart after successful order − do this before navigating away
      clearCart();

      // Step 3 — Navigate based on payment method
      // Bre-B: Wompi redirects the user to an external payment page
      if (paymentMethod === 'BREB' && paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      // NEQUI / BANCOLOMBIA: show pending screen that polls for PAID status
      navigate('/pago-pendiente', {
        state: { orderId, orderNumber, total: finalTotal, paymentMethod },
        replace: true,
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        axiosErr?.response?.data?.message ??
          'Error al procesar el pedido. Intenta nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Empty cart state ───────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppBar title="Mi Carrito" showBack />
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 pb-20">
          <div className="text-7xl">🛒</div>
          <h2 className="font-heading text-xl font-bold text-text-primary text-center">
            Tu carrito está vacío
          </h2>
          <p className="text-muted text-sm text-center leading-relaxed">
            Agrega esencias desde el catálogo para comenzar tu pedido.
          </p>
          <Link
            to="/catalogo"
            className="bg-brand-pink text-white font-semibold px-8 py-3 rounded-full shadow-md"
          >
            Ver Catálogo
          </Link>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // ── Filled cart ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <AppBar
        title={`Mi Carrito (${items.length} ${items.length === 1 ? 'item' : 'items'})`}
        showBack
        rightElement={
          <button
            onClick={clearCart}
            aria-label="Vaciar carrito"
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        }
      />

      <main className="px-4 py-4 pb-40 space-y-4">

        {/* ── SECTION 1: Cart items ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {items.map((item, i) => (
            <CartItemRow
              key={i}
              item={item}
              onRemove={() => removeItem(i)}
            />
          ))}
        </div>

        {/* ── SECTION 2: Order summary ──────────────────────────────────────── */}
        <div className="bg-surface rounded-xl shadow-card p-4 space-y-2">
          <h3 className="font-heading font-semibold text-text-primary text-sm mb-3">
            Resumen del Pedido
          </h3>

          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal:</span>
            <span className="text-text-primary font-medium">{formatCOP(subtotal)}</span>
          </div>

          {bottleReturnDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Descuento frasco:</span>
              <span className="text-green-600 font-medium">
                -{formatCOP(bottleReturnDiscount)}
              </span>
            </div>
          )}

          {/* Loyalty discount applied client-side as preview. Backend recalculates on POST /api/orders. */}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">
                Descuento fidelización {loyaltyDiscountPct}%:
              </span>
              <span className="text-green-600 font-medium">-{formatCOP(loyaltyDiscount)}</span>
            </div>
          )}

          {pointsToRedeem > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Descuento puntos:</span>
              <span className="text-green-600 font-medium">-{formatCOP(pointsToRedeem)}</span>
            </div>
          )}

          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Domicilio Armenia:</span>
              <span className="text-text-primary">+{formatCOP(deliveryFee)}</span>
            </div>
          )}

          <div className="border-t border-border pt-3 mt-1 flex justify-between items-center">
            <span className="font-heading font-bold text-text-primary text-base">TOTAL:</span>
            <span className="font-heading font-bold text-brand-gold text-xl">
              {formatCOP(finalTotal)}
            </span>
          </div>
        </div>

        {/* ── SECTION 3: Redeem loyalty points ──────────────────────────────── */}
        {/*
          POST /api/loyalty/redeem is called AFTER order creation, not before.
          The pointsToRedeem value is passed in CreateOrderInput for the backend to handle.
          1 point = $1 COP discount.
        */}
        {availablePoints > 0 && (
          <div className="bg-surface rounded-xl shadow-card p-4">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setRedeemExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-brand-gold" />
                <span className="text-sm text-text-primary font-medium">
                  Tienes{' '}
                  <span className="text-brand-gold font-bold">{availablePoints} puntos</span>{' '}
                  disponibles.{' '}
                  {!redeemExpanded && (
                    <span className="text-brand-pink underline">Canjear?</span>
                  )}
                </span>
              </div>
              {redeemExpanded
                ? <ChevronUp size={18} className="text-muted" />
                : <ChevronDown size={18} className="text-muted" />}
            </button>

            {redeemExpanded && (
              <div className="mt-3 space-y-3 pt-3 border-t border-border">
                <p className="text-xs text-muted">
                  1 punto = $1 COP de descuento · Máximo canjeable:{' '}
                  <span className="font-semibold">{maxRedeemable}</span> puntos
                </p>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxRedeemable}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    placeholder="¿Cuántos puntos quieres canjear?"
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
                  />
                  <button
                    onClick={handleApplyPoints}
                    className="bg-brand-gold text-white font-semibold px-4 py-2 rounded-lg text-sm"
                  >
                    Aplicar
                  </button>
                </div>

                {pointsToRedeem > 0 && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-green-700 text-sm font-medium">
                      Ahorrarías -{formatCOP(pointsToRedeem)} COP
                    </span>
                    <button
                      onClick={handleCancelRedeem}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 4: Delivery type ───────────────────────────────────────── */}
        {/*
          Order.type = 'ONLINE'.
          deliveryType maps to Order.delivery_type: 'pickup' | 'delivery'.
          $5,000 fee for Armenia home delivery is added to finalTotal.
        */}
        <div className="bg-surface rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={18} className="text-brand-pink" />
            <h3 className="font-heading font-semibold text-text-primary text-sm">
              Método de Entrega
            </h3>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deliveryType"
              value="pickup"
              checked={deliveryType === 'pickup'}
              onChange={() => setDeliveryType('pickup')}
              className="mt-0.5 accent-brand-pink"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">
                Recoger en tienda (Gratis)
              </span>
              <p className="text-xs text-muted mt-0.5">Cra. 15 #12-34, Armenia</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deliveryType"
              value="delivery"
              checked={deliveryType === 'delivery'}
              onChange={() => setDeliveryType('delivery')}
              className="mt-0.5 accent-brand-pink"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Truck size={13} className="text-muted" />
                <span className="text-sm font-medium text-text-primary">
                  Domicilio Armenia (+{formatCOP(DELIVERY_FEE)})
                </span>
              </div>
            </div>
          </label>

          {deliveryType === 'delivery' && (
            <div className="flex items-center gap-2 mt-1">
              <MapPin size={16} className="text-muted shrink-0" />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Dirección de entrega (requerida)"
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
              />
            </div>
          )}
        </div>

        {/* ── SECTION 5: Payment method ──────────────────────────────────────── */}
        {/*
          Payment method maps to Order.paymentMethod enum: NEQUI | BANCOLOMBIA | BREB.
          Bre-B processes via Wompi gateway. Backend BrebGateway.initiatePayment()
          returns a paymentUrl which redirects the user to complete payment externally.
        */}
        <div className="bg-surface rounded-xl shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={18} className="text-brand-pink" />
            <h3 className="font-heading font-semibold text-text-primary text-sm">
              Método de Pago
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* NEQUI */}
            <button
              onClick={() => setPaymentMethod('NEQUI')}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                paymentMethod === 'NEQUI'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-border bg-surface hover:border-pink-300'
              }`}
            >
              <p className="font-heading font-bold text-sm text-pink-600">NEQUI</p>
              <p className="text-xs text-muted mt-0.5">Pago digital</p>
            </button>

            {/* BANCOLOMBIA */}
            <button
              onClick={() => setPaymentMethod('BANCOLOMBIA')}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                paymentMethod === 'BANCOLOMBIA'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-border bg-surface hover:border-blue-300'
              }`}
            >
              <p className="font-heading font-bold text-sm text-blue-700">BANCOLOMBIA</p>
              <p className="text-xs text-muted mt-0.5">Transferencia</p>
            </button>
          </div>

          {/* Bre-B — full width row */}
          <button
            onClick={() => setPaymentMethod('BREB')}
            className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
              paymentMethod === 'BREB'
                ? 'border-green-600 bg-green-50'
                : 'border-border bg-surface hover:border-green-300'
            }`}
          >
            <p className="font-heading font-bold text-sm text-green-700">Bre-B</p>
            <p className="text-xs text-muted mt-0.5">Pagos Inmediatos · Procesado por Wompi</p>
          </button>

          {/* Nequi phone input — only visible when NEQUI selected */}
          {paymentMethod === 'NEQUI' && (
            <div className="pt-1">
              <label className="text-xs text-muted block mb-1">
                Número Nequi registrado:
              </label>
              <input
                type="tel"
                value={nequiPhone}
                onChange={(e) =>
                  setNequiPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="3XX XXX XXXX"
                inputMode="numeric"
                maxLength={10}
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors ${
                  nequiPhone && !nequiValid
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-border focus:border-brand-pink'
                }`}
              />
              {nequiPhone && !nequiValid && (
                <p className="text-xs text-red-500 mt-1">
                  Ingresa un número colombiano válido (10 dígitos, empieza con 3).
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 6: Order notes ─────────────────────────────────────────── */}
        <div className="bg-surface rounded-xl shadow-card p-4">
          <h3 className="font-heading font-semibold text-text-primary text-sm mb-2">
            Notas del Pedido
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 300))}
            placeholder="Notas para el pedido (opcional)"
            rows={3}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink resize-none"
          />
          <p className="text-xs text-muted text-right mt-1">{notes.length}/300</p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* ── SECTION 7: Confirm button + security footer ────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-full font-heading font-bold text-base transition-all shadow-md ${
            canSubmit
              ? 'bg-brand-pink text-white active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando tu pedido...
            </span>
          ) : (
            `Confirmar Pedido · ${formatCOP(finalTotal)}`
          )}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted pb-2">
          <Lock size={12} />
          <span>Pago seguro · DANII Perfumería</span>
        </div>

      </main>

      <BottomTabBar activeOrderCount={0} />
    </div>
  );
}
