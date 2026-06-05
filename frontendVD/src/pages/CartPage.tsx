/**
 * CartPage.tsx — Shopping cart, order configuration, and checkout.
 *
 * Route: /carrito (ProtectedRoute — requires authentication)
 * Backend:
 *   POST /api/orders               — creates the order
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
  Trash2, Truck, Store, Smartphone, Banknote, Landmark, ArrowLeftRight,
  Lock, MapPin, Minus, Plus, ShoppingBag,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '../stores/cartStore';
import { createOrder, getProducts } from '../services/api';
import { queryKeys } from '../services/queryKeys';
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

  // ── Cart store ─────────────────────────────────────────────────────────────
  const items            = useCartStore((s) => s.items);
  const removeItem       = useCartStore((s) => s.removeItem);
  const updateQuantity   = useCartStore((s) => s.updateQuantity);
  const clearCart        = useCartStore((s) => s.clearCart);
  const deliveryType     = useCartStore((s) => s.deliveryType);
  const setDeliveryType  = useCartStore((s) => s.setDeliveryType);
  const paymentMethod    = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const subtotal         = useCartStore((s) => s.subtotal());

  // ── Live product stock (to detect out-of-stock items in cart) ──────────────
  const { data: productsRes } = useQuery({
    queryKey: queryKeys.products,
    queryFn: getProducts,
    staleTime: 60_000,
  });
  const allProducts: Product[] = useMemo(() => {
    const body = productsRes?.data;
    return Array.isArray(body) ? body : (body?.products ?? []);
  }, [productsRes]);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]               = useState('');

  // ── Computed ───────────────────────────────────────────────────────────────

  const deliveryFee = deliveryType === 'delivery' ? DELIVERY_FEE : 0;

  const finalTotal = subtotal + deliveryFee;

  const outOfStockIds = useMemo(() => {
    if (!allProducts.length) return new Set<string>();
    const stockMap = new Map<string, number>();
    for (const p of allProducts) stockMap.set(p.id, p.stockUnits);
    return new Set(items.filter(i => (stockMap.get(i.productId) ?? 0) <= 0).map(i => i.productId));
  }, [items, allProducts]);

  // Determine why the button is disabled
  const disabledReason = useMemo(() => {
    if (items.length === 0) return '';
    if (!paymentMethod) return 'Selecciona un método de pago';
    if (deliveryType === 'delivery' && deliveryAddress.trim().length < 10) return 'Ingresa tu dirección de entrega';
    return '';
  }, [items.length, paymentMethod, deliveryType, deliveryAddress]);

  const canSubmit = items.length > 0 && !disabledReason && !isSubmitting;

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
      });

      const order: { id: string; orderNumber: string } =
        orderRes.data?.order ?? orderRes.data;
      const orderId = order.id;
      const orderNumber = order.orderNumber ?? '';

      clearCart();

      navigate('/pago-pendiente', {
        state: {
          orderId,
          orderNumber,
          total: finalTotal,
          paymentMethod,
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

          <hr className="cart-summary__divider" />

          <div className="cart-summary__total">
            <span className="cart-summary__total-label">TOTAL</span>
            <span className="cart-summary__total-value">{formatCOP(finalTotal)}</span>
          </div>
        </div>

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

          {/* DAVIPLATA */}
          <button
            onClick={() => setPaymentMethod('DAVIPLATA')}
            className={clsx(
              'cart-payment__method',
              paymentMethod === 'DAVIPLATA' && 'cart-payment__method--active',
            )}
          >
            <div className="cart-payment__method-inner">
              <Landmark size={20} className="cart-payment__method-icon" />
              <div>
                <p className="cart-payment__method-label">Daviplata</p>
                <p className="cart-payment__method-desc">Desde Daviplata</p>
              </div>
            </div>
          </button>

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

          {/* BRE-B (Llave) */}
          <button
            onClick={() => setPaymentMethod('BREB')}
            className={clsx(
              'cart-payment__method',
              paymentMethod === 'BREB' && 'cart-payment__method--active',
            )}
          >
            <div className="cart-payment__method-inner">
              <ArrowLeftRight size={20} className="cart-payment__method-icon" />
              <div>
                <p className="cart-payment__method-label">Bre-B / Llave</p>
                <p className="cart-payment__method-desc">Desde otro banco</p>
              </div>
            </div>
          </button>

          {paymentMethod && (
            <p className="text-[11px] text-muted text-center mt-2">
              Todas las transferencias al número:{' '}
              <span className="font-semibold text-text-primary">323 294 3624</span>
              {' · '}Variedades DANII
            </p>
          )}
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
