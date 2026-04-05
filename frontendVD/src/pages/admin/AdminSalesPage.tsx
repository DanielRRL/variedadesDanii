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

import { adminGetProducts, createPOSSale, searchRegisteredClients } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { Product, POSSaleInput, POSSaleResult } from '../../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 text-center">
        {/* Animated check */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-[popIn_0.4s_ease-out]">
          <CheckCircle size={36} className="text-green-600" />
        </div>

        <h2 className="font-heading text-xl font-bold text-text-primary mb-2">
          ¡Venta registrada!
        </h2>

        <p className="text-sm text-muted mb-1">
          Factura: <span className="font-semibold text-text-primary">{result.invoice?.invoiceNumber ?? 'N/A'}</span>
        </p>
        <p className="text-2xl font-bold text-brand-gold mb-4">
          {formatCOP(result.order.total)}
        </p>

        {result.gramsEarned > 0 && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-2">
            Se acreditaron <span className="font-bold">{result.gramsEarned}g</span> al cliente {clientName}
          </p>
        )}
        {result.tokenIssued && (
          <p className="text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2 mb-4">
            Se emitió 1 ficha de juego 🎮
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              // Open invoice in new tab (print-ready)
              const invoiceUrl = `/api/pos/sales/${result.order.id}/invoice`;
              window.open(invoiceUrl, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-brand-pink text-white rounded-xl text-sm font-semibold hover:bg-brand-pink/90 transition-colors"
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
      className={`border border-border rounded-xl p-3 flex gap-3 transition-all ${
        outOfStock ? 'opacity-50 grayscale' : 'hover:shadow-md hover:border-brand-pink/30 cursor-pointer'
      }`}
      onClick={outOfStock ? undefined : onAdd}
    >
      {/* Photo or placeholder */}
      {product.photoUrl ? (
        <img
          src={product.photoUrl}
          alt={product.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand-pink">
            {product.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary line-clamp-2 leading-tight">
          {product.name}
        </p>
        <p className="text-xs text-muted mt-0.5">
          Stock: {product.stockUnits}
        </p>
      </div>

      {/* Price + Button */}
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className="text-sm font-bold text-brand-gold">{formatCOP(product.price)}</span>
        <button
          disabled={outOfStock}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold transition-colors ${
            outOfStock ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-pink hover:bg-brand-pink/80'
          }`}
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
      // After axios interceptor unwrap, d = { users: [...], total, ... } OR the array directly
      if (Array.isArray(d)) return d;
      if (d && Array.isArray(d.users)) return d.users;
      if (d && Array.isArray(d.data)) return d.data;
      return [];
    },
    enabled: debouncedSearch.length >= 1,
  });

  return (
    <div className="relative">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email..."
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
      />
      {isFetching && (
        <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-muted" />
      )}
      {users.length > 0 && debouncedSearch.length >= 1 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
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
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-none transition-colors"
            >
              <p className="text-sm font-medium text-text-primary">{u.name}</p>
              <p className="text-xs text-muted">{u.email}</p>
              {u.gramAccount && (
                <p className="text-xs text-brand-gold">{u.gramAccount.currentGrams}g acumulados</p>
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

  // ── Product search/filter state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // ── Ticket state ──
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

  // ── Success modal ──
  const [saleResult, setSaleResult] = useState<POSSaleResult | null>(null);

  // ── Mobile tab ──
  const [mobileTab, setMobileTab] = useState<'products' | 'ticket'>('products');

  // ── Clock ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch products ──
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

  // ── Ticket helpers ──
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
    // Switch to ticket tab on mobile when first item added
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

  // ── Sale mutation ──
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

  // Enter key shortcut on the ticket side
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Product search panel
  // ─────────────────────────────────────────────────────────────────────────

  const productPanel = (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-white"
        />
      </div>

      {/* Type filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === key
                ? 'bg-brand-pink text-white'
                : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-brand-pink" size={28} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-muted text-sm py-12">No se encontraron productos</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => addItem(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Ticket panel
  // ─────────────────────────────────────────────────────────────────────────

  const ticketPanel = (
    <div ref={ticketRef} className="flex flex-col h-full bg-white rounded-2xl border border-border shadow-sm">
      {/* Ticket header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-text-primary text-sm">
            Venta presencial
          </h2>
          <span className="text-xs text-muted font-mono">
            {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Items list */}
        {items.length === 0 ? (
          <p className="text-center text-muted text-sm py-8">
            Agrega productos desde el catálogo
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatCOP(item.product.price)} c/u
                  </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    disabled={item.quantity >= item.product.stockUnits}
                    className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Line total */}
                <span className="text-sm font-semibold text-brand-gold w-20 text-right shrink-0">
                  {formatCOP(item.product.price * item.quantity)}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="p-1 text-muted hover:text-red-500 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Client section (collapsible) ── */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowClient(!showClient)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-sm font-semibold text-text-primary"
          >
            <span className="flex items-center gap-2">
              <User size={14} /> Cliente
            </span>
            {showClient ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showClient && (
            <div className="px-3 py-3 space-y-3">
              {/* Toggle registered/walk-in */}
              <div className="flex gap-2">
                <button
                  onClick={() => setClient((c) => ({ ...c, isRegistered: false, userId: undefined }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !client.isRegistered ? 'bg-brand-pink text-white' : 'bg-gray-100 text-muted'
                  }`}
                >
                  Pasajero
                </button>
                <button
                  onClick={() => setClient((c) => ({ ...c, isRegistered: true }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    client.isRegistered ? 'bg-brand-pink text-white' : 'bg-gray-100 text-muted'
                  }`}
                >
                  Registrado
                </button>
              </div>

              {client.isRegistered ? (
                <>
                  {client.userId ? (
                    <div className="bg-green-50 rounded-lg px-3 py-2">
                      <p className="text-sm font-medium text-green-800">{client.name}</p>
                      <p className="text-xs text-green-600">{client.email}</p>
                      {client.gramBalance !== undefined && (
                        <p className="text-xs text-brand-gold mt-0.5">{client.gramBalance}g acumulados</p>
                      )}
                      <button
                        onClick={() =>
                          setClient({ isRegistered: true, name: '', email: '', phone: '' })
                        }
                        className="text-xs text-red-500 mt-1 underline"
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
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                  />
                  <input
                    value={client.email}
                    onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email (opcional)"
                    type="email"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                  />
                  <input
                    value={client.phone}
                    onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Teléfono (opcional)"
                    type="tel"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Discount section (collapsible) ── */}
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-sm font-semibold text-text-primary"
          >
            <span className="flex items-center gap-2">
              <Tag size={14} /> Descuento especial
            </span>
            {showDiscount ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDiscount && (
            <div className="px-3 py-3">
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="Descuento en pesos COP"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              />
              {discount > 0 && (
                <p className="text-xs text-brand-pink mt-1 font-medium">
                  Descuento: -{formatCOP(discount)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          rows={2}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 resize-none"
        />
      </div>

      {/* ── Totals + Payment + Submit (sticky bottom) ── */}
      <div className="border-t border-border px-4 py-3 space-y-3 bg-gray-50/50">
        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-brand-pink">
              <span>Descuento</span>
              <span>-{formatCOP(discount)}</span>
            </div>
          )}
          <div className="border-t border-dashed border-border pt-1 flex justify-between items-baseline">
            <span className="text-sm font-semibold text-text-primary">TOTAL</span>
            <span className="text-xl font-bold text-brand-gold">{formatCOP(total)}</span>
          </div>
        </div>

        {/* Payment method chips */}
        <div>
          <p className="text-xs font-semibold text-text-primary mb-1.5">Método de pago</p>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  paymentMethod === m.value
                    ? 'bg-brand-pink text-white'
                    : 'bg-white border border-border text-muted hover:border-brand-pink/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          disabled={!canSubmit || saleMutation.isPending}
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            canSubmit && !saleMutation.isPending
              ? 'bg-brand-pink text-white hover:bg-brand-pink/90 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saleMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Procesando...
            </>
          ) : (
            'Registrar Venta'
          )}
        </button>

        {saleMutation.isError && (
          <p className="text-xs text-red-500 text-center">
            Error: {(saleMutation.error as Error)?.message ?? 'No se pudo registrar la venta'}
          </p>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* ── Mobile tab switcher (< md) ── */}
      <div className="md:hidden flex border-b border-border mb-3">
        <button
          onClick={() => setMobileTab('products')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === 'products'
              ? 'text-brand-pink border-b-2 border-brand-pink'
              : 'text-muted'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => setMobileTab('ticket')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
            mobileTab === 'ticket'
              ? 'text-brand-pink border-b-2 border-brand-pink'
              : 'text-muted'
          }`}
        >
          Ticket
          {items.length > 0 && (
            <span className="absolute -top-0.5 right-1/4 bg-brand-pink text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Desktop two-column layout ── */}
      <div className="hidden md:flex gap-4 h-full">
        {/* Left column: products (60%) */}
        <div className="w-3/5 h-full overflow-hidden">{productPanel}</div>
        {/* Right column: ticket (40%) */}
        <div className="w-2/5 h-full overflow-hidden">{ticketPanel}</div>
      </div>

      {/* ── Mobile single-column ── */}
      <div className="md:hidden h-[calc(100%-3rem)]">
        {mobileTab === 'products' ? productPanel : ticketPanel}
      </div>

      {/* ── Success modal ── */}
      {saleResult && (
        <SuccessModal result={saleResult} clientName={clientName} onClose={resetTicket} />
      )}
    </div>
  );
}
