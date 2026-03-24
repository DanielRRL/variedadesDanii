/**
 * CatalogPage — Filterable, searchable essence catalog.
 * Route: /catalogo (public)
 *
 * Sections:
 *  1. Search bar (sticky)         — GET /api/essences?search=term
 *  2. Olfactive family chips      — GET /api/essences/families
 *                                   + GET /api/essences?olfactiveFamily=id
 *  3. Price slider (dual min/max) — GET /api/essences?minPrice=X&maxPrice=Y (COP/ml)
 *  4. Sort + results count        — client-side sort fallback when backend lacks orderBy
 *  5. Essence list                — client-side pagination (10 items, "Ver más")
 *  6. Active filter pills         — visual feedback for applied filters
 *  BottomTabBar
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, ChevronDown, AlertCircle,
  RefreshCw, Package,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getEssences, getOlfactiveFamilies } from '../services/api';
import { EssenceCard } from '../components/catalog/EssenceCard';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import type { Essence } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 1 fluid ounce in millilitres. */
const OZ_TO_ML = 29.5735;

/** Maximum slider value in COP/oz — covers the highest-end essences. */
const PRICE_MAX_OZ = 50_000;

/** How many essences to show before the "Ver más" button. */
const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SortOption = 'name' | 'sales' | 'price_asc' | 'price_desc' | 'rating' | 'stock';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Client-side sort fallback.
 * Comment: orderBy=sales requires backend support. If not available, implement
 * client-side sort as fallback.
 */
function sortEssences(list: Essence[], orderBy: SortOption): Essence[] {
  const arr = [...list];
  switch (orderBy) {
    case 'price_asc':  return arr.sort((a, b) => a.pricePerMl - b.pricePerMl);
    case 'price_desc': return arr.sort((a, b) => b.pricePerMl - a.pricePerMl);
    case 'rating':     return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'stock':      return arr.sort((a, b) => (b.currentStockMl ?? 0) - (a.currentStockMl ?? 0));
    // 'sales' has no client-side total-sales metric — keep server order.
    default:           return arr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Skeleton placeholder while essence cards are loading (×3). */
function EssenceCardSkeleton() {
  return (
    <div className="bg-surface rounded-[12px] border border-border flex gap-3 p-3 w-full animate-pulse">
      <div className="w-24 h-24 rounded-lg bg-border flex-none" />
      <div className="flex-1 flex flex-col gap-2 py-1">
        <div className="h-4 bg-border rounded-md w-3/4" />
        <div className="h-3 bg-border rounded-md w-1/2" />
        <div className="h-3 bg-border rounded-md w-2/5" />
        <div className="h-5 bg-border rounded-md w-1/3 mt-auto" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Derive current filter values from URL params ────────────────────────
  // Each URL param corresponds to a query param in GET /api/essences.
  const urlSearch  = searchParams.get('search')   ?? '';
  const urlFamily  = searchParams.get('family')   ?? '';
  const urlMinOz   = Number(searchParams.get('minPrice') ?? '0');
  const urlMaxOz   = Number(searchParams.get('maxPrice') ?? String(PRICE_MAX_OZ));
  const urlOrderBy = (searchParams.get('orderBy') ?? 'name') as SortOption;

  // Local state for inputs that need debouncing or drag-end commits.
  const [localSearch, setLocalSearch] = useState(urlSearch);
  const [localMinOz,  setLocalMinOz]  = useState(urlMinOz);
  const [localMaxOz,  setLocalMaxOz]  = useState(urlMaxOz);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Keep local search in sync when browser back/forward changes URL.
  useEffect(() => { setLocalSearch(urlSearch); }, [urlSearch]);

  // Reset slider when family or search change externally.
  useEffect(() => {
    setLocalMinOz(urlMinOz);
    setLocalMaxOz(urlMaxOz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFamily, urlSearch]);

  // Reset visible count whenever any filter changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [urlSearch, urlFamily, urlMinOz, urlMaxOz, urlOrderBy]);

  // ── URL param helper ────────────────────────────────────────────────────
  const setParam = (key: string, value: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );

  // ── SECTION 1 — Search debounce (400 ms) ───────────────────────────────
  // GET /api/essences?search=term — backend searches in essence name and
  // inspirationBrand fields.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setParam('search', value || null);
    }, 400);
  };
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  // ── SECTION 3 — Price slider commit (on drag end) ───────────────────────
  // GET /api/essences?minPrice=X — backend filters by pricePerMl.
  // Frontend shows COP/oz; we divide by OZ_TO_ML (29.5735) when sending to API.
  const commitPrices = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (localMinOz > 0)          next.set('minPrice', String(localMinOz));
        else                         next.delete('minPrice');
        if (localMaxOz < PRICE_MAX_OZ) next.set('maxPrice', String(localMaxOz));
        else                           next.delete('maxPrice');
        return next;
      },
      { replace: true }
    );

  // ── SECTION 2 data — GET /api/essences/families ─────────────────────────
  // Returns all olfactive families for the filter chip row.
  const { data: familiesRes } = useQuery({
    queryKey: ['families'],
    queryFn: getOlfactiveFamilies,
    staleTime: 10 * 60 * 1000, // families rarely change
  });
  const families: { id: string; name: string }[] =
    familiesRes?.data?.data ?? [];

  // ── SECTION 5 data — GET /api/essences (paginated, filtered) ───────────
  // Params: search, olfactiveFamily, minPrice (COP/ml), maxPrice (COP/ml).
  // GET /api/essences returns paginated results. Use ?page=N&limit=10.
  // Currently the backend returns all results; client-side slicing used for
  // "Ver más" until the backend supports pagination natively.
  const { data: essencesRes, isLoading, isError, refetch } = useQuery({
    queryKey: ['essences', 'catalog', urlSearch, urlFamily, urlMinOz, urlMaxOz],
    queryFn: () =>
      getEssences({
        search:          urlSearch || undefined,
        // GET /api/essences?olfactiveFamily=id — filter by olfactiveFamily.id
        olfactiveFamily: urlFamily || undefined,
        // Convert COP/oz → COP/ml before sending to backend
        minPrice: urlMinOz > 0            ? urlMinOz / OZ_TO_ML : undefined,
        maxPrice: urlMaxOz < PRICE_MAX_OZ ? urlMaxOz / OZ_TO_ML : undefined,
      }),
    staleTime: 2 * 60 * 1000,
  });

  // Extract the array from the Axios response shape:
  // axiosResponse.data = { success: true, data: Essence[] }
  const allFromApi: Essence[] = useMemo(() => {
    const body = essencesRes?.data; // { success: true, data: [...] }
    const list = Array.isArray(body) ? body : (body?.data ?? []);
    return Array.isArray(list) ? list : [];
  }, [essencesRes]);

  // Apply client-side sort (fallback for orderBy options the backend doesn't support).
  const sortedEssences = useMemo(
    () => sortEssences(allFromApi, urlOrderBy),
    [allFromApi, urlOrderBy]
  );

  const visibleEssences = sortedEssences.slice(0, visibleCount);
  const hasMore         = visibleCount < sortedEssences.length;
  const totalCount      = sortedEssences.length;

  // ── SECTION 6 — Active filter pills ────────────────────────────────────
  // Visual feedback for active filters. Improves UX especially on mobile.
  const activeFamily    = families.find((f) => f.id === urlFamily);
  const hasPriceFilter  = urlMinOz > 0 || urlMaxOz < PRICE_MAX_OZ;
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];

  if (urlSearch) activeFilters.push({
    key: 'search',
    label: `"${urlSearch}"`,
    onRemove: () => { setLocalSearch(''); setParam('search', null); },
  });
  if (activeFamily) activeFilters.push({
    key: 'family',
    label: activeFamily.name,
    onRemove: () => setParam('family', null),
  });
  if (hasPriceFilter) activeFilters.push({
    key: 'price',
    label: `${formatCOP(urlMinOz)} – ${formatCOP(urlMaxOz)}/oz`,
    onRemove: () => {
      setLocalMinOz(0);
      setLocalMaxOz(PRICE_MAX_OZ);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('minPrice');
          next.delete('maxPrice');
          return next;
        },
        { replace: true }
      );
    },
  });

  const clearAllFilters = () => {
    setLocalSearch('');
    setLocalMinOz(0);
    setLocalMaxOz(PRICE_MAX_OZ);
    setSearchParams({}, { replace: true });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20 font-body">
      <AppBar title="Catálogo" showCart />

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Search bar
          Sticky below AppBar. Debounced 400 ms.
          GET /api/essences?search=term — backend searches in essence name
          and inspirationBrand fields.
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-14 z-20 bg-background border-b border-border px-4 py-2.5 shadow-sm">
        <div className="relative flex items-center bg-surface border border-border rounded-xl overflow-hidden">
          <span className="pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-muted" strokeWidth={2} />
          </span>
          <input
            type="search"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar esencia o perfume original..."
            className="flex-1 px-3 py-2.5 text-sm font-body text-text-primary placeholder:text-muted bg-transparent outline-none"
            aria-label="Buscar esencias"
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); setParam('search', null); }}
              className="pr-3 flex items-center"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} className="text-muted" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2 — Olfactive family filter chips
            GET /api/essences/families — full list of families for chip row.
            GET /api/essences?olfactiveFamily=id — filter by olfactiveFamily.id.
        ════════════════════════════════════════════════════════════════════ */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
          style={{ scrollbarWidth: 'none' }}
          role="listbox"
          aria-label="Filtrar por familia olfativa"
        >
          <button
            onClick={() => setParam('family', null)}
            className={clsx(
              'flex-none px-4 py-1.5 rounded-full text-[13px] font-body font-medium border transition-colors',
              !urlFamily
                ? 'bg-brand-pink text-surface border-brand-pink'
                : 'bg-surface text-text-primary border-border'
            )}
            role="option"
            aria-selected={!urlFamily}
          >
            Todas
          </button>

          {families.map((family) => (
            <button
              key={family.id}
              onClick={() =>
                setParam('family', family.id === urlFamily ? null : family.id)
              }
              className={clsx(
                'flex-none px-4 py-1.5 rounded-full text-[13px] font-body font-medium border transition-colors whitespace-nowrap',
                urlFamily === family.id
                  ? 'bg-brand-pink text-surface border-brand-pink'
                  : 'bg-surface text-text-primary border-border'
              )}
              role="option"
              aria-selected={urlFamily === family.id}
            >
              {family.name}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3 — Price slider (min / max per ounce)
            GET /api/essences?minPrice=X — backend filters by pricePerMl.
            Frontend shows COP/oz; divides by OZ_TO_ML (29.5735) before
            sending to API.
            Update is committed on mouseup / touchend (not on every move).
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-body text-[12px] font-medium text-muted uppercase tracking-wide">
              Precio por onza
            </span>
            <span className="font-body text-sm font-semibold text-brand-pink">
              {formatCOP(localMinOz)} — {formatCOP(localMaxOz)}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Min slider */}
            <div className="flex items-center gap-3">
              <span className="font-body text-[11px] text-muted w-7 flex-none">Mín</span>
              <input
                type="range"
                min={0}
                max={PRICE_MAX_OZ}
                step={500}
                value={localMinOz}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMinOz(Math.min(v, localMaxOz - 500));
                }}
                onMouseUp={commitPrices}
                onTouchEnd={commitPrices}
                className="flex-1 h-1.5 cursor-pointer"
                style={{ accentColor: '#D81B60' }}
                aria-label="Precio mínimo por onza"
              />
            </div>

            {/* Max slider */}
            <div className="flex items-center gap-3">
              <span className="font-body text-[11px] text-muted w-7 flex-none">Máx</span>
              <input
                type="range"
                min={0}
                max={PRICE_MAX_OZ}
                step={500}
                value={localMaxOz}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLocalMaxOz(Math.max(v, localMinOz + 500));
                }}
                onMouseUp={commitPrices}
                onTouchEnd={commitPrices}
                className="flex-1 h-1.5 cursor-pointer"
                style={{ accentColor: '#D81B60' }}
                aria-label="Precio máximo por onza"
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 4 — Sort selector + results count
            Comment: orderBy=sales requires backend support. If not available,
            client-side sort is implemented as fallback (see sortEssences).
        ════════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <label htmlFor="sort-select" className="sr-only">Ordenar por</label>
            <select
              id="sort-select"
              value={urlOrderBy}
              onChange={(e) => setParam('orderBy', e.target.value)}
              className="appearance-none bg-surface border border-border rounded-xl pl-3 pr-8 py-2 text-[13px] font-body text-text-primary cursor-pointer outline-none focus:border-brand-pink"
            >
              <option value="name">Nombre</option>
              <option value="sales">Más vendido</option>
              <option value="price_desc">Mayor precio</option>
              <option value="price_asc">Menor precio</option>
              <option value="rating">Mejor valorado</option>
              <option value="stock">Disponibilidad</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
              strokeWidth={2}
            />
          </div>

          {!isLoading && !isError && (
            <span className="font-body text-[13px] text-muted">
              {totalCount} resultado{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 6 — Active filter pills
            Visual feedback for active filters. Improves UX especially on
            mobile. Shown when at least one filter has a value.
        ════════════════════════════════════════════════════════════════════ */}
        {activeFilters.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
            aria-label="Filtros activos"
          >
            {activeFilters.map((f) => (
              <div
                key={f.key}
                className="flex-none flex items-center gap-1.5 bg-brand-pink/10 border border-brand-pink/30 text-brand-pink px-3 py-1.5 rounded-full text-[12px] font-body font-medium"
              >
                <span>{f.label}</span>
                <button
                  onClick={f.onRemove}
                  aria-label={`Quitar filtro ${f.label}`}
                  className="flex items-center"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ))}

            <button
              onClick={clearAllFilters}
              className="flex-none px-3 py-1.5 rounded-full border border-border text-muted text-[12px] font-body bg-surface"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 5 — Essence list
            GET /api/essences returns results. Use ?page=N&limit=10.
            Currently uses client-side slicing: "Ver más" reveals next
            PAGE_SIZE (10) items from the already-fetched array.
            Stock status is shown by EssenceCard via StockIndicator.
            "Agotado" state: card is dimmed (opacity-60) and cannot be pressed.
        ════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3 pb-2">
          {/* Loading — 3 skeleton cards */}
          {isLoading && (
            <>
              <EssenceCardSkeleton />
              <EssenceCardSkeleton />
              <EssenceCardSkeleton />
            </>
          )}

          {/* Error */}
          {isError && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle size={36} className="text-warning" strokeWidth={1.5} />
              <p className="font-body text-sm text-muted">
                No pudimos cargar las esencias. Revisa tu conexión.
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

          {/* Essence cards — each navigates to /esencia/:id */}
          {!isLoading && !isError && visibleEssences.map((essence) => (
            <EssenceCard
              key={essence.id}
              essence={essence}
              onPress={() => navigate(`/esencia/${essence.id}`)}
            />
          ))}

          {/* Empty state */}
          {!isLoading && !isError && sortedEssences.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-14 text-center">
              <Package size={44} className="text-border" strokeWidth={1.2} />
              <div>
                <p className="font-heading font-semibold text-base text-text-primary">
                  No encontramos esencias con estos filtros
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

          {/* "Ver más" button — loads next PAGE_SIZE items client-side */}
          {!isLoading && !isError && hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 border border-border rounded-xl font-body text-sm text-text-primary bg-surface active:bg-background transition-colors"
            >
              Ver más ({sortedEssences.length - visibleCount} restante
              {sortedEssences.length - visibleCount !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}
