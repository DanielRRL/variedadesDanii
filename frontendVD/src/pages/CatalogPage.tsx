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
  RefreshCw, SearchX, Trophy,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProducts, getEssences, getCurrentChallenge } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import ProductCard from '../components/catalog/ProductCard';
import { EssenceCard } from '../components/catalog/EssenceCard';
import type { Product, Essence } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const TYPE_CHIPS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ESSENCE', label: 'Esencias' },
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
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-100" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-slate-100 rounded-md w-3/4" />
        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
        <div className="h-8 bg-slate-100 rounded-full w-full mt-2" />
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
  const [sortBy, _setSortBy] = useState<SortOption>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const setSortBy = (v: SortOption) => { _setSortBy(v); setVisibleCount(PAGE_SIZE); };

  // ── Search debounce (500 ms) ────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setVisibleCount(PAGE_SIZE);
    }, 500);
  }, []);
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

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

  // ── Data — GET /api/essences ────────────────────────────────────────────
  const { data: essencesRes, isLoading: essencesLoading, isError: essencesError, refetch: retryEssences } = useQuery({
    queryKey: ['essences'],
    queryFn: () => getEssences(),
    staleTime: 2 * 60 * 1000,
  });

  const allEssences: Essence[] = useMemo(() => {
    const body = essencesRes?.data;
    return Array.isArray(body) ? body : (body?.essences ?? []);
  }, [essencesRes]);

  const showingEssences = selectedType === 'ESSENCE';

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

  // ── Filtering, sorting, pagination (products) ──────────────────────────
  const filtered = useMemo(() => {
    let list = allProducts.filter((p) => p.active);

    if (selectedType !== 'ALL' && selectedType !== 'ESSENCE') {
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

  // ── Filtering essences ──────────────────────────────────────────────────
  const filteredEssences = useMemo(() => {
    let list = allEssences.filter((e) => e.active !== false && e.isActive !== false);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.inspirationBrand?.toLowerCase().includes(q)) ||
          (e.olfactiveFamily?.name?.toLowerCase().includes(q)) ||
          (e.house?.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEssences, debouncedSearch]);

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
    <div className="min-h-screen bg-slate-50 pb-20 font-body">
      {/* ── Section 1 — AppBar ─────────────────────────────────────────── */}
      <AppBar title="Catálogo" showCart />

      {/* ── Section 2 — Sticky search bar ──────────────────────────────── */}
      <div className="sticky top-14 z-20 bg-slate-50/90 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3">
        <div
          className="relative flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
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
              onClick={() => { setSelectedType(chip.value); setVisibleCount(PAGE_SIZE); }}
              className={clsx(
                'shrink-0 font-body text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap',
                selectedType === chip.value
                  ? 'bg-brand-pink text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-pink/30 hover:text-slate-800'
              )}
              role="option"
              aria-selected={selectedType === chip.value}
            >
              {chip.label}
              {chip.value === 'ALL' && !isLoading && !isError && (
                <span className="ml-1.5 text-[11px] opacity-70">
                  {allProducts.filter((p) => p.active).length + allEssences.filter((e) => e.active !== false).length}
                </span>
              )}
              {chip.value === 'ESSENCE' && !essencesLoading && (
                <span className="ml-1.5 text-[11px] opacity-70">
                  {allEssences.filter((e) => e.active !== false).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Section 4 — Sort + results count ─────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          {!isLoading && !isError && !showingEssences && (
            <span className="text-[13px] text-slate-500">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
          {showingEssences && !essencesLoading && !essencesError && (
            <span className="text-[13px] text-slate-500">
              {filteredEssences.length} esencia{filteredEssences.length !== 1 ? "s" : ""}
            </span>
          )}

          <div className="relative ml-auto">
            <label htmlFor="sort-select" className="sr-only">Ordenar por</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2 text-[13px] text-slate-600 cursor-pointer outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10"
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

        {/* ── Section 5 — Product / Essence grid ──────────────────────── */}

        {/* ── Essences mode ────────────────────────────────────────── */}
        {showingEssences && (
          <>
            {essencesLoading && (
              <div className="grid grid-cols-1 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}

            {essencesError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <AlertCircle size={36} className="text-orange-400" strokeWidth={1.5} />
                <p className="font-body text-sm text-muted">
                  No pudimos cargar las esencias.
                </p>
                <button
                  onClick={() => retryEssences()}
                  className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2.5 rounded-full"
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  Reintentar
                </button>
              </div>
            )}

            {!essencesLoading && !essencesError && filteredEssences.length > 0 && (
              <div className="space-y-3">
                {filteredEssences.map((essence) => (
                  <EssenceCard
                    key={essence.id}
                    essence={essence}
                    onPress={() => navigate(`/esencia/${essence.id}`)}
                  />
                ))}
              </div>
            )}

            {!essencesLoading && !essencesError && filteredEssences.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-14 text-center">
                <SearchX size={44} className="text-brand-pink/40" strokeWidth={1.2} />
                <div>
                  <p className="font-heading font-semibold text-base text-text-primary">
                    No encontramos esencias
                  </p>
                  <p className="font-body text-sm text-muted mt-1.5">
                    Prueba ajustando la búsqueda.
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
          </>
        )}

        {/* ── Products mode ────────────────────────────────────────── */}
        {!showingEssences && (
          <>
        {/* Loading — 6 skeleton cards */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-pink/5 flex items-center justify-center">
              <SearchX size={32} className="text-brand-pink/30" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-slate-700">
                No encontramos fragancias
              </p>
              <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                Prueba ajustando la búsqueda o los filtros.
              </p>
            </div>
            <button
              onClick={clearAllFilters}
              className="bg-white text-slate-600 font-medium text-sm px-6 py-2.5 rounded-full border border-slate-200 hover:border-brand-pink/30 hover:text-brand-pink transition-all"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* ── Section 6 — "Ver más" button ─────────────────────────────── */}
        {!isLoading && !isError && hasMore && (
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full py-3.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 hover:border-brand-pink/20 transition-all"
          >
            Ver {Math.min(PAGE_SIZE, remaining)} más ({remaining} restante
            {remaining !== 1 ? "s" : ""})
          </button>
        )}
          </>
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
