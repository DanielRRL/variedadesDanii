/**
 * CartPage.tsx — Shopping cart, order configuration, and checkout.
 *
 * Route: /carrito (ProtectedRoute — requires authentication)
 * Backend:
 *   POST /api/orders               — creates the order
 *   POST /api/payments/initiate    — starts the Wompi payment flow
 *   POST /api/loyalty/apply-referral — validates referral code
 *
 * Sections:
 *  1. Empty cart state
 *  2. Cart items list with quantity steppers
 *  3. Gram preview card
 *  4. Order summary (subtotal, delivery, referral discount, total)
 *  5. Referral code input
 *  6. Delivery type (pickup / domicilio)
 *  7. Payment method (Nequi / Bancolombia / Bre-B)
 *  8. Confirm button + security note (sticky)
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Trash2, Truck, Store, CreditCard, Smartphone, Banknote,
  Lock, MapPin, Minus, Plus, ShoppingBag, Gem,
  Tag, Check, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { createOrder, initiatePayment, applyReferral, getMyGramAccount } from '../services/api';
import type { CartItem, Order } from '../types';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DELIVERY_FEE = 5_000;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'Loción',
  CREAM: 'Crema',
  SHAMPOO: 'Shampoo',
  MAKEUP: 'Maquillaje',
  SPLASH: 'Splash',
  ACCESSORY: 'Accesorio',
  ESSENCE_CATALOG: 'Esencia',
};

/** Product types that qualify for referral discount (5%). ESSENCE_CATALOG excluded. */
const REFERRAL_ELIGIBLE_TYPES = new Set(['LOTION', 'CREAM', 'SHAMPOO', 'MAKEUP', 'SPLASH']);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: CartItemRow
// ─────────────────────────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}

function CartItemRow({ item, onUpdateQty, onRemove }: CartItemRowProps) {
  return (
    <div className="flex gap-3 py-4">
      {/* Thumbnail */}
      {item.photoUrl ? (
        <img
          src={item.photoUrl}
          alt={item.name}
          className="w-15 h-15 rounded-lg object-cover flex-none"
        />
      ) : (
        <div className="w-15 h-15 rounded-lg bg-brand-pink/5 flex items-center justify-center flex-none">
          <span className="font-heading font-bold text-lg text-brand-pink/30">
            {item.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Center info */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-sm text-text-primary leading-tight line-clamp-2">
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-body font-medium text-muted bg-background px-1.5 py-0.5 rounded">
            {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
          </span>
          {item.generatesGram && (
            <span className="text-[10px] font-body font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Gana 1g
            </span>
          )}
        </div>

        {/* Quantity stepper + line total */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQty(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className={clsx(
                'w-7 h-7 rounded-full border flex items-center justify-center',
                item.quantity <= 1
                  ? 'border-border text-border'
                  : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
              )}
              aria-label="Reducir cantidad"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <span className="font-heading font-bold text-sm text-text-primary w-5 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.quantity + 1)}
              disabled={item.quantity >= 10}
              className={clsx(
                'w-7 h-7 rounded-full border flex items-center justify-center',
                item.quantity >= 10
                  ? 'border-border text-border'
                  : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
              )}
              aria-label="Aumentar cantidad"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </div>

          <p className="font-heading font-bold text-sm text-text-primary">
            {formatCOP(item.lineTotal)}
          </p>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="self-start p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-none"
        aria-label={`Eliminar ${item.name}`}
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
  const addToast = useToastStore((s) => s.addToast);

  // ── Cart store ─────────────────────────────────────────────────────────────
  const items            = useCartStore((s) => s.items);
  const removeItem       = useCartStore((s) => s.removeItem);
  const updateQuantity   = useCartStore((s) => s.updateQuantity);
  const clearCart        = useCartStore((s) => s.clearCart);
  const deliveryType     = useCartStore((s) => s.deliveryType);
  const setDeliveryType  = useCartStore((s) => s.setDeliveryType);
  const paymentMethod    = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const nequiPhone       = useCartStore((s) => s.nequiPhone);
  const setNequiPhone    = useCartStore((s) => s.setNequiPhone);
  const referralCodeApplied   = useCartStore((s) => s.referralCodeApplied);
  const applyReferralCode     = useCartStore((s) => s.applyReferralCode);
  const clearReferralCode     = useCartStore((s) => s.clearReferralCode);
  const subtotal         = useCartStore((s) => s.subtotal());
  const gramPreview      = useCartStore((s) => s.gramPreview());

  // ── Auth store ─────────────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Gram balance (if authenticated) ────────────────────────────────────────
  const { data: gramRes } = useQuery({
    queryKey: ['gram-account'],
    queryFn: getMyGramAccount,
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
  });
  const gramBalance: number = gramRes?.data?.account?.currentGrams ?? gramRes?.data?.currentGrams ?? 0;

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [referralInput, setReferralInput]     = useState('');
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError]     = useState('');
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');

  // ── Computed ───────────────────────────────────────────────────────────────

  /** Referral discount only applies to eligible product types */
  const referralEligibleSubtotal = useMemo(
    () =>
      items
        .filter((i) => REFERRAL_ELIGIBLE_TYPES.has(i.productType))
        .reduce((sum, i) => sum + i.lineTotal, 0),
    [items]
  );

  const referralDiscount = referralCodeApplied
    ? Math.round(referralEligibleSubtotal * 0.05)
    : 0;

  const deliveryFee = deliveryType === 'delivery' ? DELIVERY_FEE : 0;

  const finalTotal = Math.max(0, subtotal - referralDiscount + deliveryFee);

  const nequiValid = /^3\d{9}$/.test(nequiPhone);

  // Determine why the button is disabled
  const disabledReason = useMemo(() => {
    if (items.length === 0) return '';
    if (!paymentMethod) return 'Selecciona un método de pago';
    if (paymentMethod === 'NEQUI' && !nequiValid) return 'Agrega tu número Nequi';
    if (deliveryType === 'delivery' && deliveryAddress.trim().length < 10) return 'Ingresa tu dirección de entrega';
    return '';
  }, [items.length, paymentMethod, nequiValid, deliveryType, deliveryAddress]);

  const canSubmit = items.length > 0 && !disabledReason && !isSubmitting;

  // ── Referral code handler ──────────────────────────────────────────────────
  const handleApplyReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) return;
    setReferralError('');
    setReferralLoading(true);
    try {
      await applyReferral(code);
      applyReferralCode(code, 5);
      addToast('Código válido — 5% de descuento aplicado en lociones', 'success');
    } catch {
      setReferralError('Código inválido o ya utilizado');
    } finally {
      setReferralLoading(false);
    }
  };

  const handleRemoveReferral = () => {
    clearReferralCode();
    setReferralInput('');
    setReferralError('');
  };

  // ── Order submission ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const orderRes = await createOrder({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod: paymentMethod as Order['paymentMethod'],
        type: 'ONLINE',
        deliveryAddress:
          deliveryType === 'delivery' && deliveryAddress.trim()
            ? deliveryAddress.trim()
            : undefined,
        referralCode: referralCodeApplied || undefined,
      });

      const order: { id: string; orderNumber: string } =
        orderRes.data?.order ?? orderRes.data;
      const orderId = order.id;
      const orderNumber = order.orderNumber ?? '';

      const paymentRes = await initiatePayment({
        orderId,
        amountInCents: Math.round(finalTotal * 100),
        customerEmail: user!.email,
        redirectUrl: `${window.location.origin}/pedido-exitoso`,
      });

      const paymentUrl: string = paymentRes.data?.paymentUrl ?? '';

      const gramsEarned = gramPreview;
      clearCart();

      if (paymentMethod === 'BREB' && paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      navigate('/pago-pendiente', {
        state: { orderId, orderNumber, total: finalTotal, paymentMethod, gramsEarned },
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

  // ── SECTION 1 — Empty cart ─────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-body">
        <AppBar title="Mi carrito" showBack />
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 pb-20">
          <ShoppingBag size={56} className="text-brand-pink/40" strokeWidth={1.2} />
          <div className="text-center">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Tu carrito está vacío
            </h2>
            <p className="text-muted text-sm mt-1.5">
              Explora nuestro catálogo y encuentra tu próximo producto favorito.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="bg-brand-pink text-white font-body font-semibold px-8 py-3 rounded-full"
          >
            Explorar productos
          </Link>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // ── FILLED CART ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background font-body">
      <AppBar
        title={`Mi carrito (${items.length} producto${items.length !== 1 ? 's' : ''})`}
        showBack
      />

      <main className="px-4 py-4 pb-36 space-y-4">

        {/* ── SECTION 2 — Items list ───────────────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border px-4 divide-y divide-border">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              onUpdateQty={(qty) => updateQuantity(item.productId, qty)}
              onRemove={() => removeItem(item.productId)}
            />
          ))}
        </div>

        {/* ── SECTION 3 — Gram preview card ────────────────────────────────── */}
        {gramPreview > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Gem size={20} className="text-amber-600 flex-none mt-0.5" />
              <div className="flex-1">
                <p className="font-heading font-semibold text-sm text-text-primary">
                  Con este pedido ganarás {gramPreview} gramo{gramPreview !== 1 ? 's' : ''} acumulable{gramPreview !== 1 ? 's' : ''}
                </p>
                <p className="font-body text-[12px] text-muted mt-1">
                  Cada gramo te acerca a una esencia gratis (necesitas 13)
                </p>
                {isAuthenticated ? (
                  <p className="font-body text-[12px] text-amber-700 font-medium mt-1.5">
                    Tienes {gramBalance}g · Te faltarán {Math.max(0, 13 - gramBalance - gramPreview)}g para 1 oz
                  </p>
                ) : (
                  <p className="font-body text-[12px] text-amber-600 mt-1.5">
                    Crea tu cuenta para acumular gramos
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 4 — Order summary ────────────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-text-primary font-medium">{formatCOP(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted">Domicilio</span>
            <span className={clsx('font-medium', deliveryFee > 0 ? 'text-text-primary' : 'text-emerald-600')}>
              {deliveryFee > 0 ? `+${formatCOP(deliveryFee)}` : 'Gratis (recoger en tienda)'}
            </span>
          </div>

          {referralDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">
                Descuento referido (5% · {referralCodeApplied})
              </span>
              <span className="text-emerald-600 font-medium">-{formatCOP(referralDiscount)}</span>
            </div>
          )}

          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-heading font-bold text-text-primary">TOTAL</span>
            <span className="font-heading font-bold text-xl text-brand-gold">
              {formatCOP(finalTotal)}
            </span>
          </div>
        </div>

        {/* ── SECTION 5 — Referral code ────────────────────────────────────── */}
        {isAuthenticated && (
          <div className="bg-surface rounded-xl border border-border p-4">
            {referralCodeApplied ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-emerald-500" />
                  <span className="font-body text-sm text-emerald-600 font-medium">
                    Código {referralCodeApplied} aplicado — 5% en lociones
                  </span>
                </div>
                <button
                  onClick={handleRemoveReferral}
                  className="text-xs text-red-500 font-body font-medium"
                >
                  Quitar
                </button>
              </div>
            ) : !referralExpanded ? (
              <button
                onClick={() => setReferralExpanded(true)}
                className="flex items-center gap-2 w-full"
              >
                <Tag size={16} className="text-muted" />
                <span className="font-body text-sm text-brand-pink font-medium">
                  ¿Tienes un código de referido? Aplicar
                </span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => { setReferralInput(e.target.value.toUpperCase()); setReferralError(''); }}
                    placeholder="Ej: MARIA15"
                    className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-body outline-none focus:border-brand-pink uppercase"
                    maxLength={20}
                  />
                  <button
                    onClick={handleApplyReferral}
                    disabled={referralLoading || !referralInput.trim()}
                    className={clsx(
                      'px-4 py-2 rounded-lg font-body font-semibold text-sm text-white',
                      referralLoading || !referralInput.trim()
                        ? 'bg-gray-300'
                        : 'bg-brand-pink active:bg-brand-pink/80'
                    )}
                  >
                    {referralLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {referralError && (
                  <p className="text-xs text-red-500 font-body">{referralError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 6 — Delivery type ────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDeliveryType('pickup')}
              className={clsx(
                'rounded-xl border-2 p-4 text-center transition-all',
                deliveryType === 'pickup'
                  ? 'border-brand-pink bg-brand-pink/5'
                  : 'border-border bg-surface'
              )}
            >
              <Store size={22} className={clsx('mx-auto mb-1.5', deliveryType === 'pickup' ? 'text-brand-pink' : 'text-muted')} strokeWidth={1.8} />
              <p className="font-heading font-semibold text-sm text-text-primary">
                Recoger en tienda
              </p>
              <p className="font-body text-[11px] text-muted mt-0.5">Armenia · Gratis</p>
            </button>

            <button
              onClick={() => setDeliveryType('delivery')}
              className={clsx(
                'rounded-xl border-2 p-4 text-center transition-all',
                deliveryType === 'delivery'
                  ? 'border-brand-pink bg-brand-pink/5'
                  : 'border-border bg-surface'
              )}
            >
              <Truck size={22} className={clsx('mx-auto mb-1.5', deliveryType === 'delivery' ? 'text-brand-pink' : 'text-muted')} strokeWidth={1.8} />
              <p className="font-heading font-semibold text-sm text-text-primary">
                Domicilio Armenia
              </p>
              <p className="font-body text-[11px] text-muted mt-0.5">+{formatCOP(DELIVERY_FEE)}</p>
            </button>
          </div>

          {/* Address input — slides down when delivery selected */}
          <div className={clsx(
            'overflow-hidden transition-all duration-300',
            deliveryType === 'delivery' ? 'max-h-24' : 'max-h-0'
          )}>
            <div className="flex items-center gap-2 bg-surface rounded-xl border border-border px-3 py-2.5">
              <MapPin size={16} className="text-muted flex-none" />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Dirección de entrega (mín. 10 caracteres)"
                className="flex-1 text-sm font-body text-text-primary outline-none bg-transparent placeholder:text-muted"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 7 — Payment method ───────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-sm text-text-primary">
            ¿Cómo vas a pagar?
          </h3>

          {/* NEQUI */}
          <button
            onClick={() => setPaymentMethod('NEQUI')}
            className={clsx(
              'w-full rounded-xl border-2 p-4 text-left transition-all',
              paymentMethod === 'NEQUI'
                ? 'border-l-4 border-brand-pink bg-brand-pink/5'
                : 'border-border bg-surface'
            )}
          >
            <div className="flex items-center gap-3">
              <Smartphone size={20} className={paymentMethod === 'NEQUI' ? 'text-brand-pink' : 'text-muted'} />
              <div>
                <p className="font-heading font-bold text-sm text-text-primary">Nequi</p>
                <p className="font-body text-[12px] text-muted">Pago instantáneo</p>
              </div>
            </div>
          </button>

          {/* Nequi phone input */}
          <div className={clsx(
            'overflow-hidden transition-all duration-300',
            paymentMethod === 'NEQUI' ? 'max-h-24' : 'max-h-0'
          )}>
            <div className="flex items-center gap-2 bg-surface rounded-xl border border-border px-3 py-2.5">
              <input
                type="tel"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="3XX XXX XXXX"
                inputMode="numeric"
                maxLength={10}
                className={clsx(
                  'flex-1 text-sm font-body text-text-primary outline-none bg-transparent placeholder:text-muted',
                )}
              />
              {nequiPhone.length === 10 && (
                nequiValid
                  ? <Check size={16} className="text-emerald-500" />
                  : <X size={16} className="text-red-400" />
              )}
            </div>
            {nequiPhone && !nequiValid && nequiPhone.length >= 3 && (
              <p className="text-[11px] text-red-500 font-body mt-1 px-1">
                Número colombiano: 10 dígitos, inicia con 3
              </p>
            )}
          </div>

          {/* BANCOLOMBIA */}
          <button
            onClick={() => setPaymentMethod('BANCOLOMBIA')}
            className={clsx(
              'w-full rounded-xl border-2 p-4 text-left transition-all',
              paymentMethod === 'BANCOLOMBIA'
                ? 'border-l-4 border-brand-pink bg-brand-pink/5'
                : 'border-border bg-surface'
            )}
          >
            <div className="flex items-center gap-3">
              <Banknote size={20} className={paymentMethod === 'BANCOLOMBIA' ? 'text-brand-pink' : 'text-muted'} />
              <div>
                <p className="font-heading font-bold text-sm text-text-primary">Bancolombia</p>
                <p className="font-body text-[12px] text-muted">Transferencia inmediata</p>
              </div>
            </div>
          </button>

          {/* BRE-B */}
          <button
            onClick={() => setPaymentMethod('BREB')}
            className={clsx(
              'w-full rounded-xl border-2 p-4 text-left transition-all',
              paymentMethod === 'BREB'
                ? 'border-l-4 border-brand-pink bg-brand-pink/5'
                : 'border-border bg-surface'
            )}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={20} className={paymentMethod === 'BREB' ? 'text-brand-pink' : 'text-muted'} />
              <div>
                <p className="font-heading font-bold text-sm text-text-primary">Bre-B</p>
                <p className="font-body text-[12px] text-muted">Pagos inmediatos Bre-B</p>
              </div>
            </div>
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm font-body">{errorMsg}</p>
          </div>
        )}
      </main>

      {/* ── SECTION 8 — Sticky confirm bar ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 pt-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-muted">
            <Lock size={12} strokeWidth={2} />
            <span className="font-body text-[11px]">Pago seguro</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={clsx(
              'flex-1 py-3.5 rounded-full font-heading font-bold text-[15px] transition-all flex items-center justify-center gap-2',
              canSubmit
                ? 'bg-brand-pink text-white active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </>
            ) : (
              `Confirmar pedido — ${formatCOP(finalTotal)}`
            )}
          </button>
        </div>
        {disabledReason && (
          <p className="text-[11px] text-orange-500 font-body text-center pb-1">
            {disabledReason}
          </p>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
