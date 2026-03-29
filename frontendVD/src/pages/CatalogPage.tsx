/**
 * CatalogPage — Product catalog for lotions, creams, splashes, and accessories.
 * Route: /catalogo (public)
 *
 * Sections:
 *  1. AppBar — "Catálogo" + cart icon
 *  2. Sticky search bar — 500 ms debounce, role="search"
 *  3. Product type filter chips — horizontal scroll
 *  4. Sort selector + results count
 *  5. Product grid — 2 cols mobile, 3 cols ≥640 px, with ProductCard
 *  6. "Ver más" progressive loading (10 per batch)
 *  7. Weekly challenge teaser — trophy + progress bar → /juegos
 *  BottomTabBar
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, ChevronDown, AlertCircle,
  RefreshCw, SearchX, Trophy, ShoppingCart, Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProducts, getCurrentChallenge } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import type { Product } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'Lociones',
  CREAM: 'Cremas',
  SHAMPOO: 'Shampoo',
  MAKEUP: 'Maquillaje',
  SPLASH: 'Splash',
  ACCESSORY: 'Accesorios',
};

const TYPE_CHIPS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'LOTION', label: 'Lociones' },
  { value: 'CREAM', label: 'Cremas' },
  { value: 'SHAMPOO', label: 'Shampoo' },
  { value: 'MAKEUP', label: 'Maquillaje' },
  { value: 'SPLASH', label: 'Splash' },
  { value: 'ACCESSORY', label: 'Accesorios' },
];

type SortOption = 'name' | 'price_asc' | 'price_desc';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function sortProducts(list: Product[], orderBy: SortOption): Product[] {
  const inStock = list.filter((p) => p.stockUnits > 0);
  const outStock = list.filter((p) => p.stockUnits <= 0);

  const sorter = (a: Product, b: Product) => {
    switch (orderBy) {
      case 'price_asc':  return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      default:           return a.name.localeCompare(b.name, 'es');
    }
  };

  return [...inStock.sort(sorter), ...outStock.sort(sorter)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="bg-surface rounded-[12px] border border-border overflow-hidden animate-pulse">
      <div className="aspect-4/3 bg-border" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-border rounded-md w-3/4" />
        <div className="h-3 bg-border rounded-md w-1/2" />
        <div className="h-5 bg-border rounded-md w-1/3" />
        <div className="h-9 bg-border rounded-full w-full mt-2" />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const outOfStock = product.stockUnits <= 0;
  const lowStock = product.stockUnits > 0 && product.stockUnits <= 5;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
    setJustAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      onClick={() => navigate(`/productos/${product.id}`)}
      className={clsx(
        'bg-surface rounded-[12px] border border-border overflow-hidden cursor-pointer transition-shadow hover:shadow-md',
        outOfStock && 'opacity-50'
      )}
      role="article"
      aria-label={product.name}
    >
      {/* Photo */}
      <div className="relative aspect-4/3 bg-brand-pink/5">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart size={32} className="text-brand-pink/30" strokeWidth={1.5} />
          </div>
        )}

        {/* Type badge — top left */}
        <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm text-[10px] font-body font-medium text-muted px-2 py-0.5 rounded-full border border-border">
          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {/* "Gana 1g" pill — top right */}
        {product.generatesGram && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-body font-semibold px-2 py-0.5 rounded-full">
            Gana 1g
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-heading font-semibold text-[14px] text-text-primary leading-tight line-clamp-2">
          {product.name}
        </h3>

        <p className="font-heading font-bold text-[15px] text-brand-gold">
          {formatCOP(product.price)}
        </p>

        {/* Stock indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'w-2 h-2 rounded-full flex-none',
              outOfStock ? 'bg-red-400' : lowStock ? 'bg-orange-400' : 'bg-emerald-400'
            )}
          />
          <span className="font-body text-[11px] text-muted">
            {outOfStock ? 'Agotado' : lowStock ? `Quedan ${product.stockUnits}` : 'Disponible'}
          </span>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={clsx(
            'w-full mt-1.5 py-2 rounded-full text-[13px] font-body font-medium transition-colors flex items-center justify-center gap-1.5',
            outOfStock
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : justAdded
                ? 'bg-emerald-500 text-white'
                : 'bg-brand-pink text-white active:bg-brand-pink/80'
          )}
        >
          {outOfStock ? (
            'Sin stock'
          ) : justAdded ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              Agregado
            </>
          ) : (
            'Agregar'
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Local state ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ── Search debounce (500 ms) ────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 500);
  }, []);
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, selectedType, sortBy]);

  // ── Data — GET /api/products ────────────────────────────────────────────
  const { data: productsRes, isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    staleTime: 2 * 60 * 1000,
  });

  const allProducts: Product[] = useMemo(() => {
    const body = productsRes?.data;
    return Array.isArray(body) ? body : (body?.products ?? []);
  }, [productsRes]);

  // ── Data — Weekly challenge (only if logged in) ─────────────────────────
  const { data: challengeRes } = useQuery({
    queryKey: ['weekly-challenge'],
    queryFn: getCurrentChallenge,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const challenge = useMemo(() => {
    const body = challengeRes?.data;
    if (body && typeof body === 'object' && 'id' in body) return body;
    return null;
  }, [challengeRes]);

  // ── Filtering, sorting, pagination ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allProducts.filter((p) => p.active);

    if (selectedType !== 'ALL') {
      list = list.filter((p) => p.productType === selectedType);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q))
      );
    }

    return sortProducts(list, sortBy);
  }, [allProducts, selectedType, debouncedSearch, sortBy]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const remaining = filtered.length - visibleCount;

  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedType('ALL');
    setSortBy('name');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20 font-body">
      {/* ── Section 1 — AppBar ─────────────────────────────────────────── */}
      <AppBar title="Catálogo" showCart />

      {/* ── Section 2 — Sticky search bar ──────────────────────────────── */}
      <div className="sticky top-14 z-20 bg-background border-b border-border px-4 py-2.5 shadow-sm">
        <div
          className="relative flex items-center bg-surface border border-border rounded-xl overflow-hidden"
          role="search"
        >
          <span className="pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-muted" strokeWidth={2} />
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar loción, crema, shampoo..."
            className="flex-1 px-3 py-2.5 text-sm font-body text-text-primary placeholder:text-muted bg-transparent outline-none"
            aria-label="Buscar productos"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
              className="pr-3 flex items-center"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} className="text-muted" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ── Section 3 — Product type filter chips ────────────────────── */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none' }}
          role="listbox"
          aria-label="Filtrar por tipo de producto"
        >
          {TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setSelectedType(chip.value)}
              className={clsx(
                'flex-none px-4 py-1.5 rounded-full text-[13px] font-body font-medium border transition-colors whitespace-nowrap',
                selectedType === chip.value
                  ? 'bg-brand-pink text-surface border-brand-pink'
                  : 'bg-surface text-text-primary border-border'
              )}
              role="option"
              aria-selected={selectedType === chip.value}
            >
              {chip.label}
              {chip.value === 'ALL' && !isLoading && !isError && (
                <span className="ml-1.5 text-[11px] opacity-70">
                  {allProducts.filter((p) => p.active).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Section 4 — Sort + results count ─────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          {!isLoading && !isError && (
            <span className="font-body text-[13px] text-muted">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}

          <div className="relative ml-auto">
            <label htmlFor="sort-select" className="sr-only">Ordenar por</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-surface border border-border rounded-xl pl-3 pr-8 py-2 text-[13px] font-body text-text-primary cursor-pointer outline-none focus:border-brand-pink"
            >
              <option value="name">Nombre</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              strokeWidth={2}
            />
          </div>
        </div>

        {/* ── Section 5 — Product grid ─────────────────────────────────── */}

        {/* Loading — 6 skeleton cards */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle size={36} className="text-orange-400" strokeWidth={1.5} />
            <p className="font-body text-sm text-muted">
              No pudimos cargar los productos. Revisa tu conexión.
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2.5 rounded-full"
            >
              <RefreshCw size={14} strokeWidth={2} />
              Reintentar
            </button>
          </div>
        )}

        {/* Product cards */}
        {!isLoading && !isError && visibleProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <SearchX size={44} className="text-brand-pink/40" strokeWidth={1.2} />
            <div>
              <p className="font-heading font-semibold text-base text-text-primary">
                No encontramos productos
              </p>
              <p className="font-body text-sm text-muted mt-1.5">
                Prueba ajustando la búsqueda o los filtros.
              </p>
            </div>
            <button
              onClick={clearAllFilters}
              className="bg-brand-pink text-surface font-body font-medium text-sm px-7 py-2.5 rounded-full"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* ── Section 6 — "Ver más" button ─────────────────────────────── */}
        {!isLoading && !isError && hasMore && (
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full py-3 border border-border rounded-xl font-body text-sm text-text-primary bg-surface active:bg-background transition-colors"
          >
            Ver {Math.min(PAGE_SIZE, remaining)} más ({remaining} restante
            {remaining !== 1 ? 's' : ''})
          </button>
        )}

        {/* ── Section 7 — Weekly challenge teaser ──────────────────────── */}
        {challenge && challenge.active && (
          <div
            onClick={() => navigate('/juegos')}
            className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-4 cursor-pointer active:bg-brand-gold/15 transition-colors"
            role="link"
            aria-label="Ir a juegos — desafío semanal"
          >
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-brand-gold flex-none" strokeWidth={1.8} />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-text-primary truncate">
                  Desafío semanal
                </p>
                <p className="font-body text-[12px] text-muted line-clamp-1">
                  {challenge.description}
                </p>
              </div>
              <span className="font-heading font-bold text-sm text-brand-gold flex-none">
                +{challenge.gramReward}g
              </span>
            </div>

            {/* Progress bar */}
            {challenge.myProgress && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-[11px] text-muted">
                    {challenge.myProgress.purchasesCount} / {challenge.requiredPurchases} compras
                  </span>
                  {challenge.myProgress.completed && (
                    <span className="font-body text-[11px] font-semibold text-emerald-500">
                      ¡Completado!
                    </span>
                  )}
                </div>
                <div className="h-2 rounded-full bg-brand-gold/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-gold transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (challenge.myProgress.purchasesCount / challenge.requiredPurchases) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
