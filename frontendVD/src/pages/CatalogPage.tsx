/**
 * CatalogPage — Product catalog for lotions, creams, splashes, and accessories.
 * Route: /catalogo (public)
 *
 * Sections:
 *  1. Unified topbar — logo | brand | cart + avatar
 *  2. Sticky search bar — 500 ms debounce, role="search"
 *  3. Product type filter chips — horizontal scroll
 *  4. Sort selector + results count
 *  5. Product grid — 2 cols mobile, 3 cols ≥640 px, with ProductCard
 *  6. "Ver más" progressive loading (10 per batch)
 *  7. Weekly challenge teaser — trophy + progress bar → /juegos
 *  BottomTabBar
 */

import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, ChevronDown, AlertCircle,
  RefreshCw, SearchX, Trophy, ShoppingBag, Star, Crown,
  LayoutGrid, Flower, Droplets, Container,
  Sparkles, Palette, Wind, Gem,
  FilterX, PackageSearch, RotateCcw, ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import '../css/CatalogPage.css';
import { getProducts, getEssences, getCurrentChallenge } from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import ProductCard from '../components/catalog/ProductCard';
import { EssenceCard } from '../components/catalog/EssenceCard';
import type { Product, Essence } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type ChipIcon = typeof LayoutGrid;

const TYPE_CHIPS: { value: string; label: string; icon: ChipIcon }[] = [
  { value: 'ALL', label: 'Todos', icon: LayoutGrid },
  { value: 'ESSENCE', label: 'Esencias', icon: Flower },
  { value: 'LOTION', label: 'Lociones', icon: Droplets },
  { value: 'CREAM', label: 'Cremas', icon: Container },
  { value: 'SHAMPOO', label: 'Shampoo', icon: Sparkles },
  { value: 'MAKEUP', label: 'Maquillaje', icon: Palette },
  { value: 'SPLASH', label: 'Splash', icon: Wind },
  { value: 'ACCESSORY', label: 'Accesorios', icon: Gem },
];

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

// ─────────────────────────────────────────────────────────────────────────────
// SortDropdown — chip-based sort selector
// ─────────────────────────────────────────────────────────────────────────────

type SortOption = 'name' | 'price_asc' | 'price_desc';

function SortDropdown({ sortBy, setSortBy }: { sortBy: SortOption; setSortBy: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const labels: Record<SortOption, string> = {
    name: 'Precio',
    price_asc: 'Menor precio',
    price_desc: 'Mayor precio',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={clsx('catalog-sort-chip', open && 'catalog-sort-chip--open')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {labels[sortBy]}
        <ChevronDown size={14} strokeWidth={2} className="catalog-sort-chip__chevron" />
      </button>
      {open && (
        <ul className="catalog-sort-dropdown" role="listbox">
          {(Object.entries(labels) as [SortOption, string][]).map(([value, label]) => (
            <li key={value}>
              <button
                onClick={() => { setSortBy(value); setOpen(false); }}
                className={clsx(
                  'catalog-sort-dropdown__option',
                  sortBy === value && 'catalog-sort-dropdown__option--active',
                )}
                role="option"
                aria-selected={sortBy === value}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterDropdown — chip-based filter selector (mobile)
// ─────────────────────────────────────────────────────────────────────────────

function FilterDropdown({ selectedType, setSelectedType, typeChips, setVisibleCount }: {
  selectedType: string;
  setSelectedType: (v: string) => void;
  typeChips: { value: string; label: string; icon: ChipIcon }[];
  setVisibleCount: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedChip = typeChips.find((c) => c.value === selectedType) ?? typeChips[0];
  const Icon = selectedChip.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={clsx('catalog-sort-chip', open && 'catalog-sort-chip--open')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon size={14} strokeWidth={1.8} />
        <span className="catalog-filter-dropdown__label">{selectedChip.label}</span>
        <ChevronDown size={14} strokeWidth={2} className="catalog-sort-chip__chevron" />
      </button>
      {open && (
        <ul className="catalog-sort-dropdown" role="listbox">
          {typeChips.map((chip) => {
            const ChipIcon = chip.icon;
            return (
              <li key={chip.value}>
                <button
                  onClick={() => { setSelectedType(chip.value); setVisibleCount(PAGE_SIZE); setOpen(false); }}
                  className={clsx(
                    'catalog-sort-dropdown__option',
                    selectedType === chip.value && 'catalog-sort-dropdown__option--active',
                  )}
                  role="option"
                  aria-selected={selectedType === chip.value}
                >
                  <ChipIcon size={14} strokeWidth={1.8} />
                  {chip.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.length;
  const level = user?.loyaltyAccount?.level;
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

  // ── Local state ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, _setSortBy] = useState<SortOption>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const setSortBy = (v: SortOption) => { _setSortBy(v); setVisibleCount(PAGE_SIZE); };

  // ── Scroll edge fades for filter chips ──────────────────────────────────
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const filtersScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = filtersScrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth <= clientWidth) {
        setShowLeftFade(false);
        setShowRightFade(false);
      } else {
        setShowLeftFade(scrollLeft > 6);
        setShowRightFade(scrollLeft + clientWidth < scrollWidth - 6);
      }
    };
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

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

  // ── Rotating placeholder ─────────────────────────────────────────────
  const [placeholderText, setPlaceholderText] = useState('Buscar fragancias...');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (searchTerm) return;
    const texts = [
      'Buscar fragancias...',
      '¿Chanel o Dior?',
      'Encuentra tu esencia ideal...',
      'Lociones, cremas y más...',
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % texts.length;
      setPlaceholderText(texts[i]);
    }, 3000);
    return () => clearInterval(id);
  }, [searchTerm]);

  // ── Data — GET /api/products ────────────────────────────────────────────
  const { data: productsRes, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.products,
    queryFn: getProducts,
    staleTime: 2 * 60 * 1000,
  });

  const allProducts: Product[] = useMemo(() => {
    const body = productsRes?.data;
    return Array.isArray(body) ? body : (body?.products ?? []);
  }, [productsRes]);

  // ── Data — GET /api/essences ────────────────────────────────────────────
  const { data: essencesRes, isLoading: essencesLoading, isError: essencesError, refetch: retryEssences } = useQuery({
    queryKey: queryKeys.essences,
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
    queryKey: queryKeys.challenge,
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

  const inStockCount = useMemo(
    () => visibleProducts.filter((p) => p.stockUnits > 0).length,
    [visibleProducts],
  );

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
    <div className="catalog-page pb-24 font-body" style={{ background: '#FAFAFA', paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      {/* ── Background decorative blobs ─────────────────────────────────── */}
      <div className="catalog-bg-decor" aria-hidden="true">
        <div className="catalog-blob catalog-blob--1" />
        <div className="catalog-blob catalog-blob--2" />
        <div className="catalog-blob catalog-blob--3" />
      </div>

      {/* ── Section 1 — Unified topbar ─────────────────────────────────── */}
      <header className="catalog-topbar">
        {/* Left — back button */}
        <button
          onClick={() => navigate(-1)}
          className="catalog-topbar__back-btn"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={2} className="text-text-primary" />
        </button>

        {/* Center — section title */}
        <div className="catalog-topbar__section-title">
          <span>CATÁLOGO</span>
        </div>

        {/* Right — cart + avatar */}
        <div className="catalog-topbar__actions">
          <button
            onClick={() => navigate('/carrito')}
            className="catalog-topbar__cart-btn"
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`}
          >
            <ShoppingBag size={20} className="text-text-primary" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="catalog-topbar__cart-badge" key={cartCount}>
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {user ? (
            <button
              onClick={() => navigate('/perfil')}
              className="catalog-topbar__avatar"
              aria-label="Perfil"
            >
              <span className={clsx(
                'catalog-topbar__avatar-initials',
                level === 'VIP' ? 'text-brand-gold' : 'text-brand-pink'
              )}>
                {initials}
              </span>
              {level === 'VIP' && (
                <span className="catalog-topbar__loyalty-badge">
                  <Crown size={9} className="text-surface" strokeWidth={2.5} />
                </span>
              )}
              {level === 'PREFERRED' && (
                <span className="catalog-topbar__loyalty-badge">
                  <Star size={9} className="text-surface" strokeWidth={2.5} />
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/perfil')}
              className="catalog-topbar__avatar"
              aria-label="Iniciar sesión"
            >
              <span className="catalog-topbar__avatar-initials text-muted">?</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Section 2 — Sticky search bar ───────────────────────────────── */}
      <div className="catalog-search-bar-wrapper sticky z-20">
        <div
          className={clsx('catalog-search__wrapper', isFocused && 'catalog-search__wrapper--focused')}
          role="search"
        >
          <span className="pl-4 flex items-center pointer-events-none">
            <Search size={16} className="catalog-search__icon" strokeWidth={2.2} />
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholderText}
            className="catalog-search__input"
            aria-label="Buscar productos"
          />
          {!searchTerm && !isFocused && (
            <kbd className="catalog-search__kbd">
              <span className="catalog-search__kbd-key catalog-search__kbd-key--desktop">Ctrl</span>
              <span className="catalog-search__kbd-key">K</span>
            </kbd>
          )}
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
              className="catalog-search__clear"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Section 2.5 — Divider ──────────────────────────────────────── */}
      {/* <div className="catalog-section-divider mx-4" /> */}

      {/* ── Section 3 — Filter chips + sort ────────────────────────────── */}
      <div className="catalog-filters-bar px-4">

        {/* Scroll fade wrapper */}
        <div className="catalog-filters-scroll" ref={filtersScrollRef}>
          {showLeftFade && <div className="catalog-filters-scroll__fade catalog-filters-scroll__fade--left" />}
          {showRightFade && <div className="catalog-filters-scroll__fade catalog-filters-scroll__fade--right" />}
          <div
            className="catalog-filters-wrapper"
            role="listbox"
            aria-label="Filtrar por tipo de producto"
          >
            {TYPE_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.value}
                  onClick={() => { setSelectedType(chip.value); setVisibleCount(PAGE_SIZE); }}
                  className={clsx(
                    'catalog-chip',
                    selectedType === chip.value && 'catalog-chip--active'
                  )}
                  role="option"
                  aria-selected={selectedType === chip.value}
                >
                  <Icon size={14} strokeWidth={1.8} />
                  {chip.label}
                  {chip.value === 'ALL' && !isLoading && !isError && (
                    <span className="catalog-chip__count">
                      {allProducts.filter((p) => p.active).length + allEssences.filter((e) => e.active !== false).length}
                    </span>
                  )}
                  {chip.value === 'ESSENCE' && !essencesLoading && (
                    <span className="catalog-chip__count">
                      {allEssences.filter((e) => e.active !== false).length}
                    </span>
                  )}
                  {chip.value !== 'ALL' && chip.value !== 'ESSENCE' && !isLoading && !isError && (
                    <span className="catalog-chip__count">
                      {allProducts.filter((p) => p.active && p.productType === chip.value).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile filter select — replaces chips below sm breakpoint */}
        <div className="catalog-filter-select-wrapper">
          <FilterDropdown
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            typeChips={TYPE_CHIPS}
            setVisibleCount={setVisibleCount}
          />
        </div>

        {/* Sort */}
        <div className="catalog-filters-actions">
          <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />

        </div>

      </div>

      {/* ── Section 5 — Product / Essence grid ──────────────────────── */}
      <div className="catalog-content">

        {/* ── Essences mode ────────────────────────────────────────── */}
        {(showingEssences || selectedType === 'ALL') && (
          <>
            {essencesLoading && (
              <div className="catalog-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="catalog-skeleton" style={{ height: '17rem' }} />
                ))}
              </div>
            )}

            {essencesError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center catalog-error">
                <div className="catalog-error__icon-wrap">
                  <AlertCircle size={36} className="text-brand-pink" strokeWidth={1.5} />
                </div>
                <p className="font-body text-sm text-muted">
                  No pudimos cargar las esencias.
                </p>
                <button
                  onClick={() => retryEssences()}
                  className="catalog-retry-btn flex items-center gap-1.5"
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  Reintentar
                </button>
              </div>
            )}

            {!essencesLoading && !essencesError && filteredEssences.length > 0 && (
              <div className="catalog-grid">
                {filteredEssences.map((essence) => (
                  <EssenceCard
                    key={essence.id}
                    essence={essence}
                    onPress={() => navigate(`/esencia/${essence.id}`)}
                  />
                ))}
              </div>
            )}

            {!essencesLoading && !essencesError && filteredEssences.length === 0 && showingEssences && (
              <div className="catalog-empty py-10">
                <div className="catalog-empty__card">
                  <div className="catalog-empty__icon-wrap">
                    <Flower size={28} className="text-brand-pink/40" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="catalog-empty__title">
                      {searchTerm ? 'No encontramos esencias' : 'No hay esencias disponibles'}
                    </p>
                    <p className="catalog-empty__subtitle mt-1">
                      Prueba ajustando la búsqueda.
                    </p>
                    <p className="catalog-empty__hint mt-2">
                      Intenta con un perfume distinto o una familia olfativa
                    </p>
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="catalog-empty__cta"
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Products mode ────────────────────────────────────────── */}
        {selectedType !== 'ESSENCE' && (
          <>
            {/* Loading — 6 skeleton cards */}
            {isLoading && (
              <div className="catalog-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="catalog-skeleton" style={{ height: '13.5rem' }} />
                ))}
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="flex flex-col items-center gap-3 py-10 text-center catalog-error">
                <div className="catalog-error__icon-wrap">
                  <AlertCircle size={36} className="text-brand-pink" strokeWidth={1.5} />
                </div>
                <p className="font-body text-sm text-muted">
                  No pudimos cargar los productos. Revisa tu conexión.
                </p>
                <button
                  onClick={() => refetch()}
                  className="catalog-retry-btn flex items-center gap-1.5"
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  Reintentar
                </button>
              </div>
            )}

            {/* Product cards */}
            {!isLoading && !isError && visibleProducts.length > 0 && (
              <div className="catalog-grid">
                {visibleProducts.map((product, idx) => (
                  <Fragment key={product.id}>
                    {idx === inStockCount && inStockCount > 0 && inStockCount < visibleProducts.length && (
                      <div className="catalog-stock-divider">Agotados</div>
                    )}
                    <ProductCard product={product} />
                  </Fragment>
                ))}
              </div>
            )}

            {/* Empty state — products */}
            {!isLoading && !isError && filtered.length === 0 && (() => {
              const hasSearch = searchTerm.length > 0;
              const hasFilter = selectedType !== 'ALL';
              const selectedChip = TYPE_CHIPS.find((c) => c.value === selectedType);
              const EmptyIcon = hasSearch ? SearchX : hasFilter ? (selectedChip?.icon ?? FilterX) : PackageSearch;
              const title = hasSearch
                ? 'No encontramos fragancias'
                : hasFilter
                  ? `No encontramos ${(selectedChip?.label ?? 'productos').toLowerCase()}`
                  : 'No hay productos disponibles';
              const hint = hasSearch
                ? "Intenta con 'Chanel', 'Cremas' o 'Lociones'"
                : hasFilter
                  ? `No hay ${(selectedChip?.label ?? 'productos').toLowerCase()} disponibles ahora`
                  : 'Vuelve pronto, estamos preparando más productos';
              return (
                <div className="catalog-empty py-10">
                  <div className="catalog-empty__card">
                    <div className="catalog-empty__icon-wrap">
                      <EmptyIcon size={28} className="text-brand-pink/40" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="catalog-empty__title">
                        {title}
                      </p>
                      <p className="catalog-empty__subtitle mt-1">
                        Prueba ajustando la búsqueda o los filtros.
                      </p>
                      <p className="catalog-empty__hint mt-2">
                        {hint}
                      </p>
                    </div>
                    <button
                      onClick={clearAllFilters}
                      className="catalog-empty__cta"
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Section 6 — "Ver más" button ─────────────────────────────── */}
            {!isLoading && !isError && hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="catalog-load-more mt-6"
              >
                Ver {Math.min(PAGE_SIZE, remaining)} más ({remaining} restante{remaining !== 1 ? 's' : ''})
              </button>
            )}
          </>
        )}

        {/* ── Section 7 — Weekly challenge teaser ──────────────────────── */}
        {challenge && challenge.active && (
          <div
            onClick={() => navigate('/juegos')}
            className="catalog-challenge p-4 mt-4"
            role="link"
            aria-label="Ir a juegos — desafío semanal"
          >
            <div className="flex items-center gap-3">
              <div className="catalog-challenge__icon">
                <Trophy size={22} className="text-brand-gold" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-text-primary truncate">
                  Desafío semanal
                </p>
                <p className="font-body text-[12px] text-muted line-clamp-1">
                  {challenge.description}
                </p>
              </div>
              <span className="catalog-challenge__reward flex-none">
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
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(249,168,37,0.2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (challenge.myProgress.purchasesCount / challenge.requiredPurchases) * 100)}%`, background: 'linear-gradient(90deg, #F9A825, #F57F17)' }}
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
