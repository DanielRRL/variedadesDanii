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
  Trash2, Truck, Store, Smartphone, Banknote,
  Lock, MapPin, Minus, Plus, ShoppingBag, Gem,
  Tag, Check, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { createOrder, applyReferral, getMyGramAccount, getProducts } from '../services/api';
import type { CartItem, Order, Product } from '../types';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import '../css/CartPage.css';

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
  isOutOfStock?: boolean;
}

function CartItemRow({ item, onUpdateQty, onRemove, isOutOfStock }: CartItemRowProps) {
  return (
    <div className={clsx('cart-item', isOutOfStock && 'cart-item--out-of-stock')}>
      {/* Thumbnail */}
      {item.photoUrl ? (
        <img
          src={item.photoUrl}
          alt={item.name}
          className="cart-item__thumb"
          loading="lazy"
        />
      ) : (
        <div className="cart-item__thumb-placeholder">
          <span>{item.name.charAt(0)}</span>
        </div>
      )}

      {/* Center info */}
      <div className="cart-item__info">
        <p className="cart-item__name">{item.name}</p>
        <div className="cart-item__meta">
          <span className="cart-item__type-badge">
            {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
          </span>
          {item.generatesGram && (
            <span className="cart-item__gram-badge">Gana 1g</span>
          )}
          {isOutOfStock && (
            <span className="cart-item__out-of-stock-badge">Agotado</span>
          )}
        </div>

        {/* Quantity stepper + line total */}
        <div className="cart-item__row">
          <div className="cart-item__stepper">
            <button
              onClick={() => onUpdateQty(item.quantity - 1)}
              disabled={item.quantity <= 1 || !!isOutOfStock}
              className="cart-item__stepper-btn"
              aria-label="Reducir cantidad"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <span className="cart-item__stepper-qty">{item.quantity}</span>
            <button
              onClick={() => onUpdateQty(item.quantity + 1)}
              disabled={item.quantity >= 10 || !!isOutOfStock}
              className="cart-item__stepper-btn"
              aria-label="Aumentar cantidad"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </div>

          <p className="cart-item__price">{formatCOP(item.lineTotal)}</p>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="cart-item__delete"
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Gram balance (if authenticated) ────────────────────────────────────────
  const { data: gramRes } = useQuery({
    queryKey: ['gram-account'],
    queryFn: getMyGramAccount,
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
  });
  const gramBalance: number = gramRes?.data?.account?.currentGrams ?? gramRes?.data?.currentGrams ?? 0;

  // ── Live product stock (to detect out-of-stock items in cart) ──────────────
  const { data: productsRes } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    staleTime: 60_000,
  });
  const allProducts: Product[] = useMemo(() => {
    const body = productsRes?.data;
    return Array.isArray(body) ? body : (body?.products ?? []);
  }, [productsRes]);

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

  const outOfStockItemNames = useMemo(() => {
    if (!allProducts.length) return [];
    const stockMap = new Map<string, number>();
    for (const p of allProducts) stockMap.set(p.id, p.stockUnits);
    return items
      .filter(i => (stockMap.get(i.productId) ?? 0) <= 0)
      .map(i => i.name);
  }, [items, allProducts]);

  const outOfStockIds = useMemo(() => {
    if (!allProducts.length) return new Set<string>();
    const stockMap = new Map<string, number>();
    for (const p of allProducts) stockMap.set(p.id, p.stockUnits);
    return new Set(items.filter(i => (stockMap.get(i.productId) ?? 0) <= 0).map(i => i.productId));
  }, [items, allProducts]);

  // Determine why the button is disabled
  const disabledReason = useMemo(() => {
    if (items.length === 0) return '';
    if (outOfStockItemNames.length > 0) return `"${outOfStockItemNames[0]}" está agotado. Elimínalo para continuar.`;
    if (!paymentMethod) return 'Selecciona un método de pago';
    if (paymentMethod === 'NEQUI' && !nequiValid) return 'Agrega tu número Nequi';
    if (deliveryType === 'delivery' && deliveryAddress.trim().length < 10) return 'Ingresa tu dirección de entrega';
    return '';
  }, [items.length, paymentMethod, nequiValid, deliveryType, deliveryAddress, outOfStockItemNames]);

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
        products: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod: paymentMethod as Order['paymentMethod'],
        type: 'ONLINE',
        notes: deliveryType === 'delivery' && deliveryAddress.trim()
          ? `Entrega: ${deliveryAddress.trim()}`
          : undefined,
        referralCode: referralCodeApplied || undefined,
      });

      const order: { id: string; orderNumber: string } =
        orderRes.data?.order ?? orderRes.data;
      const orderId = order.id;
      const orderNumber = order.orderNumber ?? '';

      const gramsEarned = gramPreview;
      clearCart();

      navigate('/pago-pendiente', {
        state: {
          orderId,
          orderNumber,
          total: finalTotal,
          paymentMethod,
          gramsEarned,
          deliveryType,
          deliveryAddress: deliveryType === 'delivery' ? deliveryAddress.trim() : undefined,
        },
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
      <div className="cart-page">
        <AppBar title="Mi carrito" showBack />
        <div className="cart-empty">
          <ShoppingBag size={56} className="cart-empty__icon" strokeWidth={1.2} />
          <div>
            <h2 className="cart-empty__heading">Tu carrito está vacío</h2>
            <p className="cart-empty__text">
              Explora nuestro catálogo y encuentra tu próximo producto favorito.
            </p>
          </div>
          <Link to="/catalogo" className="cart-empty__cta">
            Explorar productos
          </Link>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  // ── FILLED CART ────────────────────────────────────────────────────────────

  return (
    <div className="cart-page">
      <AppBar
        title={`Mi carrito (${items.length} producto${items.length !== 1 ? 's' : ''})`}
        showBack
      />

      <main className="cart-main">

        {/* ── SECTION 2 — Items list ───────────────────────────────────────── */}
        <div className="cart-items">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              onUpdateQty={(qty) => updateQuantity(item.productId, qty)}
              onRemove={() => removeItem(item.productId)}
              isOutOfStock={outOfStockIds.has(item.productId)}
            />
          ))}
        </div>

        {/* ── SECTION 3 — Gram preview card ────────────────────────────────── */}
        {gramPreview > 0 && (
          <div className="cart-gram-card">
            <Gem size={20} className="cart-gram-card__icon" />
            <div className="cart-gram-card__content">
              <p className="cart-gram-card__title">
                Con este pedido ganarás {gramPreview} gramo{gramPreview !== 1 ? 's' : ''} acumulable{gramPreview !== 1 ? 's' : ''}
              </p>
              <p className="cart-gram-card__desc">
                Cada gramo te acerca a una esencia gratis (necesitas 13)
              </p>
              {isAuthenticated ? (
                <p className={clsx('cart-gram-card__progress', 'cart-gram-card__progress--auth')}>
                  Tienes {gramBalance}g · Te faltarán {Math.max(0, 13 - gramBalance - gramPreview)}g para 1 oz
                </p>
              ) : (
                <p className={clsx('cart-gram-card__progress', 'cart-gram-card__progress--guest')}>
                  Crea tu cuenta para acumular gramos
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 4 — Order summary ────────────────────────────────────── */}
        <div className="cart-summary">
          <div className="cart-summary__row">
            <span className="cart-summary__row-label">Subtotal</span>
            <span className="cart-summary__row-value">{formatCOP(subtotal)}</span>
          </div>

          <div className="cart-summary__row">
            <span className="cart-summary__row-label">Domicilio</span>
            <span className={clsx('cart-summary__row-value', deliveryFee === 0 && 'cart-summary__row-value--free')}>
              {deliveryFee > 0 ? `+${formatCOP(deliveryFee)}` : 'Gratis (recoger en tienda)'}
            </span>
          </div>

          {referralDiscount > 0 && (
            <div className={clsx('cart-summary__row', 'cart-summary__row--discount')}>
              <span className="cart-summary__row-label">
                Descuento referido (5% · {referralCodeApplied})
              </span>
              <span className="cart-summary__row-value">-{formatCOP(referralDiscount)}</span>
            </div>
          )}

          <hr className="cart-summary__divider" />

          <div className="cart-summary__total">
            <span className="cart-summary__total-label">TOTAL</span>
            <span className="cart-summary__total-value">{formatCOP(finalTotal)}</span>
          </div>
        </div>

        {/* ── SECTION 5 — Referral code ────────────────────────────────────── */}
        {isAuthenticated && (
          <div className="cart-referral">
            {referralCodeApplied ? (
              <div className="cart-referral__applied">
                <span className="cart-referral__applied-label">
                  <Tag size={16} />
                  Código {referralCodeApplied} aplicado — 5% en lociones
                </span>
                <button
                  onClick={handleRemoveReferral}
                  className="cart-referral__remove-btn"
                >
                  Quitar
                </button>
              </div>
            ) : !referralExpanded ? (
              <button
                onClick={() => setReferralExpanded(true)}
                className="cart-referral__toggle"
              >
                <Tag size={16} />
                ¿Tienes un código de referido? Aplicar
              </button>
            ) : (
              <div className="cart-referral__input-wrap">
                <div className="cart-referral__input-row">
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => { setReferralInput(e.target.value.toUpperCase()); setReferralError(''); }}
                    placeholder="Ej: MARIA15"
                    className="cart-referral__input"
                    maxLength={20}
                  />
                  <button
                    onClick={handleApplyReferral}
                    disabled={referralLoading || !referralInput.trim()}
                    className="cart-referral__apply-btn"
                  >
                    {referralLoading ? '...' : 'Aplicar'}
                  </button>
                </div>
                {referralError && (
                  <p className="cart-referral__error">{referralError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 6 — Delivery type ────────────────────────────────────── */}
        <div className="cart-delivery">
          <div className="cart-delivery__options">
            <button
              onClick={() => setDeliveryType('pickup')}
              className={clsx(
                'cart-delivery__option',
                deliveryType === 'pickup' && 'cart-delivery__option--active',
              )}
            >
              <Store size={22} className="cart-delivery__option-icon" strokeWidth={1.8} />
              <p className="cart-delivery__option-label">Recoger en tienda</p>
              <p className="cart-delivery__option-hint">Armenia · Gratis</p>
            </button>

            <button
              onClick={() => setDeliveryType('delivery')}
              className={clsx(
                'cart-delivery__option',
                deliveryType === 'delivery' && 'cart-delivery__option--active',
              )}
            >
              <Truck size={22} className="cart-delivery__option-icon" strokeWidth={1.8} />
              <p className="cart-delivery__option-label">Domicilio Armenia</p>
              <p className="cart-delivery__option-hint">+{formatCOP(DELIVERY_FEE)}</p>
            </button>
          </div>

          {/* Address input — slides down when delivery selected */}
          <div className={clsx(
            'cart-delivery__address',
            deliveryType === 'delivery' ? 'cart-delivery__address--visible' : 'cart-delivery__address--hidden',
          )}>
            <div className="cart-delivery__address-input">
              <MapPin size={16} />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Dirección de entrega (mín. 10 caracteres)"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 7 — Payment method ───────────────────────────────────── */}
        <div className="cart-payment">
          <h3 className="cart-payment__title">¿Cómo vas a pagar?</h3>

          {/* NEQUI */}
          <button
            onClick={() => setPaymentMethod('NEQUI')}
            className={clsx(
              'cart-payment__method',
              paymentMethod === 'NEQUI' && 'cart-payment__method--active',
            )}
          >
            <div className="cart-payment__method-inner">
              <Smartphone size={20} className="cart-payment__method-icon" />
              <div>
                <p className="cart-payment__method-label">Nequi</p>
                <p className="cart-payment__method-desc">Pago instantáneo</p>
              </div>
            </div>
          </button>

          {/* Nequi phone input */}
          <div className={clsx(
            'cart-payment__phone',
            paymentMethod === 'NEQUI' ? 'cart-payment__phone--visible' : 'cart-payment__phone--hidden',
          )}>
            <div className="cart-payment__phone-input">
              <input
                type="tel"
                value={nequiPhone}
                onChange={(e) => setNequiPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="3XX XXX XXXX"
                inputMode="numeric"
                maxLength={10}
              />
              {nequiPhone.length === 10 && (
                nequiValid
                  ? <Check size={16} className="cart-payment__phone-valid" />
                  : <X size={16} className="cart-payment__phone-invalid" />
              )}
            </div>
            {nequiPhone && !nequiValid && nequiPhone.length >= 3 && (
              <p className="cart-payment__phone-hint">
                Número colombiano: 10 dígitos, inicia con 3
              </p>
            )}
          </div>

          {/* BANCOLOMBIA */}
          <button
            onClick={() => setPaymentMethod('BANCOLOMBIA')}
            className={clsx(
              'cart-payment__method',
              paymentMethod === 'BANCOLOMBIA' && 'cart-payment__method--active',
            )}
          >
            <div className="cart-payment__method-inner">
              <Banknote size={20} className="cart-payment__method-icon" />
              <div>
                <p className="cart-payment__method-label">Bancolombia</p>
                <p className="cart-payment__method-desc">Transferencia inmediata</p>
              </div>
            </div>
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="cart-error">
            <p className="cart-error__text">{errorMsg}</p>
          </div>
        )}
      </main>

      {/* ── SECTION 8 — Sticky confirm bar ─────────────────────────────────── */}
      <div className="cart-confirm-bar">
        <div className="cart-confirm-bar__inner">
          <span className="cart-confirm-bar__secure">
            <Lock size={12} strokeWidth={2} />
            Pago seguro
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={clsx(
              'cart-confirm-bar__submit',
              canSubmit ? 'cart-confirm-bar__submit--active' : 'cart-confirm-bar__submit--disabled',
            )}
          >
            {isSubmitting ? (
              <>
                <span className="cart-confirm-bar__spinner" />
                Procesando...
              </>
            ) : (
              `Realizar pedido — ${formatCOP(finalTotal)}`
            )}
          </button>
        </div>
        {disabledReason && (
          <p className="cart-confirm-bar__reason">{disabledReason}</p>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
