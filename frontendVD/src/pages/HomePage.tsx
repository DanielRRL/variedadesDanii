/**
 * HomePage — Landing page for Variedades DANII.
 *
 * Sections:
 *  1. Cinematic hero   — Glass blobs, Playfair heading, dual CTA
 *  2. Bento Grid        — ¿Por qué elegirnos? 4 premium cards
 *  3. Coleccion         — Featured products horizontal scroll
 *  4. Loyalty teaser    — Conditional on auth state
 *
 * BottomTabBar fixed at bottom.
 */

import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingBag,
  Gamepad2,
  CreditCard,
  Trophy,
  Sparkles,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  User,
  Scale,
  MapPin,
  ArrowDown,
} from "lucide-react";
import { clsx } from "clsx";
import { getProducts, getMyGramAccount } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { BottomTabBar } from "../components/layout/BottomTabBar";
import { formatCOP } from "../utils/format";
import { GRAMS_PER_OZ, gramProgress } from "../utils/priceCalculator";
import type { Product, GramAccount } from "../types";

// ─── Constants ─────────────────────────────────────────────────────────────

const WA_NUMBER = "573003837442";
const WA_GREETING = encodeURIComponent("Hola, quiero información sobre las esencias");

const TYPE_LABELS: Record<string, string> = {
  LOTION: "Loción", CREAM: "Crema", SHAMPOO: "Shampoo",
  MAKEUP: "Maquillaje", SPLASH: "Splash", ACCESSORY: "Accesorio",
};

// ─── Sub-components ────────────────────────────────────────────────────────

function FeaturedProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const outOfStock = product.stockUnits <= 0;

  return (
    <article
      onClick={outOfStock ? undefined : onPress}
      className={clsx(
        "flex-none w-44 sm:w-56 bg-surface rounded-2xl border border-slate-200/60",
        "shadow-sm overflow-hidden flex flex-col",
        "transition-all duration-300",
        !outOfStock && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-pink/20"
      )}
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onKeyDown={(e) => {
        if (!outOfStock && (e.key === "Enter" || e.key === " ")) onPress();
      }}
      aria-disabled={outOfStock}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-brand-pink/5 overflow-hidden">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display font-bold text-5xl text-brand-pink/20 select-none">
              {product.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Type badge */}
        <span className="absolute top-2.5 left-2.5 bg-surface/90 backdrop-blur-sm text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
          {TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {/* +1g badge */}
        {product.generatesGram && (
          <span className="absolute top-2.5 right-2.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            +1g
          </span>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
            <span className="bg-amber-500 text-white text-[11px] font-medium px-3 py-1 rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <p className="font-heading font-semibold text-[13px] sm:text-sm text-slate-800 leading-snug line-clamp-2">
          {product.name}
        </p>
        <p className="font-heading font-semibold text-brand-gold text-sm sm:text-base mt-auto">
          {formatCOP(product.price)}
        </p>
      </div>
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-none w-44 sm:w-56 rounded-2xl bg-slate-100 animate-pulse"
          style={{ height: 240 }}
        />
      ))}
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.length;
  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : null;

  // Featured products
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: retryProducts,
  } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: getProducts,
    staleTime: 2 * 60 * 1000,
  });

  const products: Product[] = (() => {
    const raw = Array.isArray(productsData?.data)
      ? productsData.data
      : productsData?.data?.products ?? [];
    return raw.filter((p: Product) => p.active).slice(0, 6);
  })();

  // Gram wallet (auth only)
  const { data: gramRes } = useQuery({
    queryKey: ["gramAccount", "home"],
    queryFn: getMyGramAccount,
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });
  const gram = (gramRes?.data?.account ?? gramRes?.data) as GramAccount | undefined;
  const currentGrams = gram?.currentGrams ?? 0;
  const pct = gramProgress(currentGrams);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-body">
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Cinematic Hero
      ════════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden bg-brand-pink"
        style={{ minHeight: "min(520px, 100svh)" }}
        aria-label="Hero"
      >
        {/* Animated glass blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />
          <div className="hero-blob hero-blob-3" />
        </div>

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-brand-pink-dark/10 pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-8 sm:pt-12 pb-2">
          <span className="font-display font-semibold text-white text-xl sm:text-2xl tracking-tight">
            DANII
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/carrito")}
              className="relative w-9 h-9 flex items-center justify-center"
              aria-label={`Carrito, ${cartCount} productos`}
            >
              <ShoppingBag size={20} className="text-white" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-brand-pink text-[10px] font-bold flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {user ? (
              <button
                onClick={() => navigate("/perfil")}
                className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center"
                aria-label="Perfil"
              >
                <span className="font-heading font-bold text-[11px] text-white leading-none">
                  {initials}
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-8 h-8 flex items-center justify-center"
                aria-label="Iniciar sesión"
              >
                <User size={20} className="text-white" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 pt-8 sm:pt-16 pb-10">
          <h1 className="hero-text-delay-1 font-display font-bold text-white text-[32px] sm:text-[42px] lg:text-[52px] leading-[1.1] max-w-lg tracking-tight">
            Tu fragancia perfecta
          </h1>
          <p className="hero-text-delay-2 font-body text-white/70 text-sm sm:text-base max-w-xs sm:max-w-sm mt-4">
            Lociones, cremas y más al mejor precio
          </p>

          <div className="hero-text-delay-3 flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm sm:max-w-none sm:w-auto">
            <button
              onClick={() => navigate("/catalogo")}
              className="bg-white text-brand-pink font-semibold text-sm sm:text-[15px] px-8 py-3 rounded-full hover:bg-white/95 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2"
            >
              Descubrir colección
              <ChevronRight size={16} />
            </button>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${WA_GREETING}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/30 text-white font-medium text-sm sm:text-[15px] px-8 py-3 rounded-full hover:bg-white/10 active:scale-[0.98] transition-all text-center"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-text-delay-4 absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
          <span className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
            Desliza
          </span>
          <ArrowDown size={14} className="text-white/40 animate-scroll-indicator" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Bento Grid: ¿Por qué elegirnos?
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 -mt-6 relative z-10" aria-labelledby="why-heading">
        <div className="max-w-5xl mx-auto">
          <h2
            id="why-heading"
            className="font-display font-semibold text-[22px] sm:text-2xl text-slate-800 mb-6 text-center"
          >
            ¿Por qué elegirnos?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                Icon: Gamepad2,
                title: "Juega y gana gramos",
                desc: "Cada compra te da una ficha. Gira la ruleta y gana gramos extra.",
                accent: "pink",
              },
              {
                Icon: CreditCard,
                title: "Pagos sin comisión",
                desc: "Nequi, Bancolombia o Bre-B con confirmación inmediata.",
                accent: "blue",
              },
              {
                Icon: MapPin,
                title: "Recoge o recibe en casa",
                desc: "Retira en tienda gratis o solicita envío a domicilio.",
                accent: "gold",
              },
              {
                Icon: Trophy,
                title: "13g = 1 oz gratis",
                desc: "Acumula gramos en cada compra y canjea esencias premium.",
                accent: "pink",
              },
            ].map(({ Icon, title, desc, accent }, i) => (
              <div
                key={title}
                className={clsx(
                  "bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5",
                  "glass-card-hover cursor-default",
                  i === 0 && "sm:col-span-2"
                )}
              >
                <div
                  className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                    accent === "pink" && "bg-brand-pink/10",
                    accent === "blue" && "bg-brand-blue/10",
                    accent === "gold" && "bg-brand-gold/10"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className={clsx(
                      accent === "pink" && "text-brand-pink",
                      accent === "blue" && "text-brand-blue",
                      accent === "gold" && "text-brand-gold"
                    )}
                  />
                </div>
                <p className="font-heading font-semibold text-[15px] text-slate-800 mb-1">
                  {title}
                </p>
                <p className="font-body text-[13px] text-slate-500 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Colección Destacada
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-10 sm:mt-14 px-4 sm:px-6" aria-labelledby="collection-heading">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="font-body text-xs text-brand-pink font-semibold uppercase tracking-[0.15em] mb-1">
                Colección
              </p>
              <h2
                id="collection-heading"
                className="font-display font-semibold text-2xl sm:text-3xl text-slate-800"
              >
                Nuestros destacados
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue/80 transition-colors shrink-0"
            >
              Ver todo <ChevronRight size={16} strokeWidth={2} />
            </Link>
          </div>

          {/* Horizontal scroll */}
          <div
            className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {productsLoading && <FeaturedSkeleton />}

            {productsError && (
              <div className="flex flex-col items-center gap-4 py-12 w-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle size={28} className="text-amber-500" strokeWidth={1.5} />
                </div>
                <p className="text-slate-500 text-sm">
                  No pudimos cargar los productos. Intenta de nuevo.
                </p>
                <button
                  onClick={() => retryProducts()}
                  className="inline-flex items-center gap-2 bg-brand-pink text-white font-medium text-sm px-5 py-2.5 rounded-full hover:bg-brand-pink/90 transition-colors"
                >
                  <RefreshCw size={14} strokeWidth={2} />
                  Reintentar
                </button>
              </div>
            )}

            {!productsLoading &&
              !productsError &&
              products.map((product) => (
                <FeaturedProductCard
                  key={product.id}
                  product={product}
                  onPress={() => navigate(`/productos/${product.id}`)}
                />
              ))}

            {!productsLoading && !productsError && products.length === 0 && (
              <p className="text-slate-400 text-sm py-6 w-full text-center">
                No hay productos disponibles por el momento.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Loyalty teaser
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-10 sm:mt-14 px-4 sm:px-6 mb-4" aria-labelledby="gram-heading">
        <div className="max-w-2xl mx-auto">
          {!isAuthenticated ? (
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 sm:p-10 text-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-gold/5 rounded-tr-full -ml-6 -mb-6 pointer-events-none" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-5">
                  <Sparkles size={26} className="text-brand-gold" strokeWidth={1.5} />
                </div>

                <h2 id="gram-heading" className="font-display font-semibold text-2xl text-slate-800 mb-2">
                  Acumula gramos y gana esencias gratis
                </h2>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Cada compra te da 1g + una ficha de juego. Al llegar a {GRAMS_PER_OZ}g
                  canjeas 1 oz de esencia premium.
                </p>

                <div className="flex items-center justify-center gap-5 my-7">
                  {[
                    { Icon: Scale, label: "Compra" },
                    { Icon: Gamepad2, label: "Juega" },
                    { Icon: Trophy, label: "Canjea" },
                  ].map(({ Icon, label }, i) => (
                    <div key={label} className="flex items-center gap-0">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Icon size={20} className="text-slate-600" strokeWidth={1.5} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {label}
                        </span>
                      </div>
                      {i < 2 && (
                        <ChevronRight size={16} className="text-slate-300 ml-5 mr-1" />
                      )}
                    </div>
                  ))}
                </div>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-brand-pink text-white font-semibold text-sm px-10 py-3 rounded-full hover:bg-brand-pink/90 active:scale-[0.98] transition-all"
                >
                  Regístrate gratis
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-brand-gold/20 shadow-sm p-6 sm:p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 id="gram-heading" className="font-display font-semibold text-xl text-slate-800">
                    Mis gramos
                  </h2>
                  <p className="text-sm text-slate-500">{user?.name?.split(" ")[0]}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Scale size={20} className="text-brand-gold" strokeWidth={1.5} />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-display font-bold text-[40px] text-brand-gold leading-none">
                  {currentGrams}
                </span>
                <span className="font-body text-base text-slate-400">/ {GRAMS_PER_OZ}g</span>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                {currentGrams >= GRAMS_PER_OZ
                  ? "¡Puedes canjear 1 oz de esencia gratis!"
                  : `${GRAMS_PER_OZ - currentGrams}g más para tu próxima oz gratis`}
              </p>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-brand-gold rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <Link
                to="/mis-gramos"
                className="inline-flex items-center gap-1.5 text-brand-blue text-sm font-medium hover:text-brand-blue/80 transition-colors"
              >
                Ver mi billetera de gramos
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <BottomTabBar />
    </div>
  );
}
