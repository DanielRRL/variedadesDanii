/**
 * AdminSalesPage.tsx — Point-of-Sale (POS) interface for in-store sales.
 *
 * Two-column layout:
 *  - Left (60%): Product search + grid
 *  - Right (40%): Current sale ticket + payment
 *
 * Responsive: single-column with tab toggle on mobile.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Minus,
  X,
  Loader2,
  CheckCircle,
  Printer,
  User,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import clsx from 'clsx';

import { adminGetProducts, createPOSSale, searchRegisteredClients } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { Product, POSSaleInput, POSSaleResult } from '../../types';
import '../../css/AdminSalesPage.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_TYPES: Record<string, string> = {
  ALL:       'Todos',
  LOTION:    'Lociones',
  CREAM:     'Cremas',
  SHAMPOO:   'Shampoo',
  SPLASH:    'Splash',
  ACCESSORY: 'Accesorios',
  ESSENCE_CATALOG: 'Esencias',
};

const PAYMENT_METHODS = [
  { value: 'CASH' as const, label: 'Efectivo' },
  { value: 'NEQUI' as const, label: 'Nequi' },
  { value: 'DAVIPLATA' as const, label: 'Daviplata' },
  { value: 'BANCOLOMBIA' as const, label: 'Bancolombia' },
  { value: 'TRANSFERENCIA' as const, label: 'Transferencia' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TicketItem {
  product: Product;
  quantity: number;
}

interface ClientInfo {
  isRegistered: boolean;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  gramBalance?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SuccessModal
// ─────────────────────────────────────────────────────────────────────────────

function SuccessModal({
  result,
  clientName,
  onClose,
}: {
  result: POSSaleResult;
  clientName: string;
  onClose: () => void;
}) {
  return (
    <div className="admin-sales__modal-overlay">
      <div className="admin-sales__modal-backdrop" onClick={onClose} />
      <div className="admin-sales__modal-body">
        <div className="admin-sales__modal-check">
          <CheckCircle size={36} />
        </div>

        <h2 className="admin-sales__modal-title">¡Venta registrada!</h2>

        <p className="admin-sales__modal-info">
          Factura: <strong>{result.invoice?.invoiceNumber ?? 'N/A'}</strong>
        </p>
        <p className="admin-sales__modal-total">
          {formatCOP(result.order.total)}
        </p>

        {result.gramsEarned > 0 && (
          <p className="admin-sales__modal-grams">
            Se acreditaron <strong>{result.gramsEarned}g</strong> al cliente {clientName}
          </p>
        )}
        {result.tokenIssued && (
          <p className="admin-sales__modal-token">
            Se emitió 1 ficha de juego 🎮
          </p>
        )}

        <div className="admin-sales__modal-actions">
          <button
            onClick={() => {
              const invoiceUrl = `/api/pos/sales/${result.order.id}/invoice`;
              window.open(invoiceUrl, '_blank');
            }}
            className="admin-sales__modal-btn admin-sales__modal-btn--secondary"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="admin-sales__modal-btn admin-sales__modal-btn--primary"
          >
            Nueva venta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const outOfStock = product.stockUnits <= 0;

  return (
    <div
      className={clsx(
        'admin-sales__product-card',
        outOfStock && 'admin-sales__product-card--disabled',
      )}
      onClick={outOfStock ? undefined : onAdd}
    >
      {product.photoUrl ? (
        <img
          src={product.photoUrl}
          alt={product.name}
          className="admin-sales__product-img"
        />
      ) : (
        <div className="admin-sales__product-placeholder">
          <span>{product.name.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <div className="admin-sales__product-info">
        <p className="admin-sales__product-name">{product.name}</p>
        <p className="admin-sales__product-stock">
          Stock: {product.stockUnits}
        </p>
      </div>

      <div className="admin-sales__product-right">
        <span className="admin-sales__product-price">{formatCOP(product.price)}</span>
        <button
          disabled={outOfStock}
          className={clsx(
            'admin-sales__product-add-btn',
            outOfStock ? 'admin-sales__product-add-btn--disabled' : 'admin-sales__product-add-btn--default',
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!outOfStock) onAdd();
          }}
        >
          {outOfStock ? '—' : <Plus size={14} />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ClientSearchDropdown
// ─────────────────────────────────────────────────────────────────────────────

function ClientSearchDropdown({
  onSelect,
}: {
  onSelect: (user: { id: string; name: string; email: string; gramBalance?: number }) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users = [], isFetching } = useQuery({
    queryKey: ['search-clients', debouncedSearch],
    queryFn: async () => {
      const res = await searchRegisteredClients(debouncedSearch);
      const d = res?.data;
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.users)) return d.users;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    },
    enabled: debouncedSearch.length >= 1,
  });

  return (
    <div className="admin-sales__client-search-wrap">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="admin-sales__client-search-input"
      />
      {isFetching && (
        <Loader2 size={14} className="admin-sales__client-search-spinner" />
      )}
      {users.length > 0 && debouncedSearch.length >= 1 && (
        <div className="admin-sales__client-dropdown">
          {users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => {
                onSelect({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  gramBalance: u.gramAccount?.currentGrams,
                });
                setSearch('');
                setDebouncedSearch('');
              }}
              className="admin-sales__client-dropdown-item"
            >
              <p className="admin-sales__client-dropdown-name">{u.name}</p>
              <p className="admin-sales__client-dropdown-email">{u.email}</p>
              {u.gramAccount && (
                <p className="admin-sales__client-dropdown-grams">{u.gramAccount.currentGrams}g acumulados</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminSalesPage
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminSalesPage() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [items, setItems] = useState<TicketItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<POSSaleInput['paymentMethod'] | null>(null);
  const [client, setClient] = useState<ClientInfo>({
    isRegistered: false,
    name: '',
    email: '',
    phone: '',
  });
  const [discount, setDiscount] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showClient, setShowClient] = useState(true);
  const [notes, setNotes] = useState('');

  const [saleResult, setSaleResult] = useState<POSSaleResult | null>(null);
  const [mobileTab, setMobileTab] = useState<'products' | 'ticket'>('products');

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products-pos'],
    queryFn: () => adminGetProducts({ active: true }),
    staleTime: 60_000,
  });

  const allProducts: Product[] = useMemo(() => {
    const raw = productsRes?.data;
    return Array.isArray(raw) ? raw : (raw as { products?: Product[] })?.products ?? [];
  }, [productsRes]);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (typeFilter !== 'ALL') {
      list = list.filter((p) => p.productType === typeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, typeFilter, searchTerm]);

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockUnits) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    if (items.length === 0) setMobileTab('ticket');
  }, [items.length]);

  const updateQty = useCallback((productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty > i.product.stockUnits) return i;
          return { ...i, quantity: newQty };
        })
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items],
  );
  const total = Math.max(0, subtotal - discount);

  const clientName = client.isRegistered ? client.name : client.name;
  const canSubmit = items.length > 0 && paymentMethod && clientName.trim().length > 0;

  const saleMutation = useMutation({
    mutationFn: (data: POSSaleInput) => createPOSSale(data),
    onSuccess: (res) => {
      const result = res.data as POSSaleResult;
      setSaleResult(result);
      queryClient.invalidateQueries({ queryKey: ['admin-products-pos'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!canSubmit || saleMutation.isPending) return;

    const payload: POSSaleInput = {
      products: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: paymentMethod!,
      ...(client.isRegistered && client.userId ? { userId: client.userId } : {}),
      walkInClientName: client.name || undefined,
      walkInClientEmail: client.email || undefined,
      walkInClientPhone: client.phone || undefined,
      notes: notes || undefined,
      discount: discount > 0 ? discount : undefined,
    };

    saleMutation.mutate(payload);
  }, [canSubmit, saleMutation, items, paymentMethod, client, notes, discount]);

  const ticketRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && ticketRef.current?.contains(document.activeElement)) {
        handleSubmit();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleSubmit]);

  const resetTicket = useCallback(() => {
    setItems([]);
    setPaymentMethod(null);
    setClient({ isRegistered: false, name: '', email: '', phone: '' });
    setDiscount(0);
    setShowDiscount(false);
    setNotes('');
    setSaleResult(null);
    setMobileTab('products');
  }, []);

  // ── Product panel ──────────────────────────────────────────────────────

  const productPanel = (
    <div className="admin-sales__product-panel">
      <div className="admin-sales__search">
        <Search size={18} className="admin-sales__search-icon" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto..."
          className="admin-sales__search-input"
        />
      </div>

      <div className="admin-sales__chips">
        {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={clsx(
              'admin-sales__chip',
              typeFilter === key ? 'admin-sales__chip--active' : 'admin-sales__chip--default',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-sales__grid">
        {loadingProducts ? (
          <div className="admin-sales__loading">
            <Loader2 className="admin-sales__loading-spinner" size={28} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="admin-sales__empty">No se encontraron productos</p>
        ) : (
          <div className="admin-sales__grid-inner">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addItem(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Ticket panel ────────────────────────────────────────────────────────

  const ticketPanel = (
    <div ref={ticketRef} className="admin-sales__ticket">
      <div className="admin-sales__ticket-header">
        <h2 className="admin-sales__ticket-title">Venta presencial</h2>
        <span className="admin-sales__ticket-clock">
          {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div className="admin-sales__ticket-body">
        {items.length === 0 ? (
          <p className="admin-sales__ticket-empty">
            Agrega productos desde el catálogo
          </p>
        ) : (
          <div className="admin-sales__ticket-body">
            {items.map((item) => (
              <div key={item.product.id} className="admin-sales__item">
                <div className="admin-sales__item-info">
                  <p className="admin-sales__item-name">{item.product.name}</p>
                  <p className="admin-sales__item-unit">
                    {formatCOP(item.product.price)} c/u
                  </p>
                </div>

                <div className="admin-sales__item-stepper">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="admin-sales__item-btn"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="admin-sales__item-qty">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stockUnits}
                    className="admin-sales__item-btn"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <span className="admin-sales__item-total">
                  {formatCOP(item.product.price * item.quantity)}
                </span>

                <button
                  onClick={() => removeItem(item.product.id)}
                  className="admin-sales__item-remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Client section */}
        <div className="admin-sales__section">
          <button
            onClick={() => setShowClient(!showClient)}
            className="admin-sales__section-toggle"
          >
            <span className="admin-sales__section-toggle-label">
              <User size={14} /> Cliente
            </span>
            {showClient ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showClient && (
            <div className="admin-sales__section-body">
              <div className="admin-sales__client-toggle-group">
                <button
                  onClick={() => setClient((c) => ({ ...c, isRegistered: false, userId: undefined }))}
                  className={clsx(
                    'admin-sales__client-mode-btn',
                    !client.isRegistered ? 'admin-sales__client-mode-btn--active' : 'admin-sales__client-mode-btn--default',
                  )}
                >
                  Pasajero
                </button>
                <button
                  onClick={() => setClient((c) => ({ ...c, isRegistered: true }))}
                  className={clsx(
                    'admin-sales__client-mode-btn',
                    client.isRegistered ? 'admin-sales__client-mode-btn--active' : 'admin-sales__client-mode-btn--default',
                  )}
                >
                  Registrado
                </button>
              </div>

              {client.isRegistered ? (
                <>
                  {client.userId ? (
                    <div className="admin-sales__client-info">
                      <p className="admin-sales__client-info-name">{client.name}</p>
                      <p className="admin-sales__client-info-email">{client.email}</p>
                      {client.gramBalance !== undefined && (
                        <p className="admin-sales__client-info-grams">{client.gramBalance}g acumulados</p>
                      )}
                      <button
                        onClick={() =>
                          setClient({ isRegistered: true, name: '', email: '', phone: '' })
                        }
                        className="admin-sales__client-change-btn"
                      >
                        Cambiar cliente
                      </button>
                    </div>
                  ) : (
                    <ClientSearchDropdown
                      onSelect={(u) =>
                        setClient({
                          isRegistered: true,
                          userId: u.id,
                          name: u.name,
                          email: u.email,
                          phone: '',
                          gramBalance: u.gramBalance,
                        })
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <input
                    value={client.name}
                    onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Nombre del cliente *"
                    className="admin-sales__client-input"
                  />
                  <input
                    value={client.email}
                    onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email (opcional)"
                    type="email"
                    className="admin-sales__client-input"
                  />
                  <input
                    value={client.phone}
                    onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Teléfono (opcional)"
                    type="tel"
                    className="admin-sales__client-input"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Discount section */}
        <div className="admin-sales__section">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="admin-sales__section-toggle"
          >
            <span className="admin-sales__section-toggle-label">
              <Tag size={14} /> Descuento especial
            </span>
            {showDiscount ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDiscount && (
            <div className="admin-sales__section-body">
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="Descuento en pesos COP"
                className="admin-sales__discount-input"
              />
              {discount > 0 && (
                <p className="admin-sales__discount-label">
                  Descuento: -{formatCOP(discount)}
                </p>
              )}
            </div>
          )}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className="admin-sales__notes"
        />
      </div>

      <div className="admin-sales__ticket-footer">
        <div className="admin-sales__totals">
          <div className="admin-sales__totals-row">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="admin-sales__totals-row admin-sales__totals-row--discount">
              <span>Descuento</span>
              <span>-{formatCOP(discount)}</span>
            </div>
          )}
          <hr className="admin-sales__totals-divider" />
          <div className="admin-sales__totals-final">
            <span className="admin-sales__totals-final-label">TOTAL</span>
            <span className="admin-sales__totals-final-value">{formatCOP(total)}</span>
          </div>
        </div>

        <div>
          <p className="admin-sales__payment-label">Método de pago</p>
          <div className="admin-sales__payment-chips">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={clsx(
                  'admin-sales__payment-chip',
                  paymentMethod === m.value ? 'admin-sales__payment-chip--active' : 'admin-sales__payment-chip--default',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!canSubmit || saleMutation.isPending}
          onClick={handleSubmit}
          className={clsx(
            'admin-sales__submit-btn',
            canSubmit && !saleMutation.isPending ? 'admin-sales__submit-btn--active' : 'admin-sales__submit-btn--disabled',
          )}
        >
          {saleMutation.isPending ? (
            <>
              <Loader2 size={16} className="admin-sales__submit-spinner" /> Procesando...
            </>
          ) : (
            'Registrar Venta'
          )}
        </button>

        {saleMutation.isError && (
          <p className="admin-sales__error">
            Error: {
              (() => {
                const err = saleMutation.error as any;
                return err?.response?.data?.message
                  ?? err?.response?.data?.errors?.[0]?.message
                  ?? err?.message
                  ?? 'No se pudo registrar la venta';
              })()
            }
          </p>
        )}
      </div>
    </div>
  );

  // ── Main layout ─────────────────────────────────────────────────────────

  return (
    <div className="admin-sales">
      {/* Mobile tab switcher */}
      <div className="admin-sales__tabs">
        <button
          onClick={() => setMobileTab('products')}
          className={clsx(
            'admin-sales__tab',
            mobileTab === 'products' && 'admin-sales__tab--active',
          )}
        >
          Productos
        </button>
        <button
          onClick={() => setMobileTab('ticket')}
          className={clsx(
            'admin-sales__tab',
            mobileTab === 'ticket' && 'admin-sales__tab--active',
          )}
        >
          Ticket
          {items.length > 0 && (
            <span className="admin-sales__tab-badge">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* Desktop two-column layout */}
      <div className="admin-sales__layout">
        <div className="admin-sales__products-panel">{productPanel}</div>
        <div className="admin-sales__ticket-panel-wrap">{ticketPanel}</div>
      </div>

      {/* Mobile single-column */}
      <div className="admin-sales__mobile-panel">
        {mobileTab === 'products' ? productPanel : ticketPanel}
      </div>

      {/* Success modal */}
      {saleResult && (
        <SuccessModal result={saleResult} clientName={clientName} onClose={resetTicket} />
      )}
    </div>
  );
}
