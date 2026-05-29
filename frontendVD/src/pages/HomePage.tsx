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
 *
 * Styling: Pure CSS in HomePage.css (no Tailwind).
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
import "../css/HomePage.css";
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
      className={`home-product-card${outOfStock ? " home-product-card--disabled" : ""}`}
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onKeyDown={(e) => {
        if (!outOfStock && (e.key === "Enter" || e.key === " ")) onPress();
      }}
      aria-disabled={outOfStock}
    >
      <div className="home-product-card__image-wrap">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="home-product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="home-product-card__placeholder">
            <span>{product.name[0]?.toUpperCase()}</span>
          </div>
        )}

        <span className="home-product-card__badge">
          {TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {product.generatesGram && (
          <span className="home-product-card__badge home-product-card__badge--gram">
            +1g
          </span>
        )}

        {outOfStock && (
          <div className="home-product-card__outofstock">
            <span>Agotado</span>
          </div>
        )}
      </div>

      <div className="home-product-card__content">
        <p className="home-product-card__name">{product.name}</p>
        <p className="home-product-card__price">{formatCOP(product.price)}</p>
      </div>
    </article>
  );
}

function FeaturedSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="home-product-skeleton" />
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
    <div className="home-page">
      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Cinematic Hero
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="home-hero" aria-label="Hero">
        <div className="home-hero__blob home-hero__blob-1" aria-hidden="true" />
        <div className="home-hero__blob home-hero__blob-2" aria-hidden="true" />
        <div className="home-hero__blob home-hero__blob-3" aria-hidden="true" />
        <div className="home-hero__glass-overlay" aria-hidden="true" />

        <div className="home-hero__topbar">
          <div className="home-hero__logo">
            <div className="home-hero__logo-box">VD</div>
            <div>
              <p className="home-hero__logo-title">Variedades DANII</p>
              <p className="home-hero__logo-subtitle">Perfumería · Armenia, Quindío</p>
            </div>
          </div>

          <div className="home-hero__actions">
            <button
              onClick={() => navigate("/carrito")}
              className="home-hero__cart-btn"
              aria-label={`Carrito, ${cartCount} productos`}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="home-hero__cart-badge">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {user ? (
              <button
                onClick={() => navigate("/perfil")}
                className="home-hero__avatar-btn"
                aria-label="Perfil"
              >
                <span>{initials}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="home-hero__user-btn"
                aria-label="Iniciar sesión"
              >
                <User size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="home-hero__content">
          <h1 className="home-hero__headline">
            <span className="home-hero__headline-line1">Tu fragancia</span>
            <br />
            <span className="home-hero__headline-line2">perfecta</span>
          </h1>
          <p className="home-hero__sub">
            Lociones, cremas y más al mejor precio
          </p>

          <div className="home-hero__cta-group">
            <button
              onClick={() => navigate("/catalogo")}
              className="home-hero__btn-primary"
            >
              Descubrir colección
              <ChevronRight size={16} />
            </button>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${WA_GREETING}`}
              target="_blank"
              rel="noopener noreferrer"
              className="home-hero__btn-secondary"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>

        <div className="home-hero__scroll-indicator">
          <span className="home-hero__scroll-text">Desliza</span>
          <ArrowDown size={14} className="home-hero__scroll-arrow" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Bento Grid: ¿Por qué elegirnos?
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="home-bento" aria-labelledby="why-heading">
        <div className="home-bento__inner">
          <h2 id="why-heading" className="home-bento__title">
            ¿Por qué elegirnos?
          </h2>

          <div className="home-bento__grid">
            {[
              {
                Icon: Gamepad2,
                title: "Juega y gana gramos",
                desc: "Cada compra te da una ficha. Gira la ruleta y gana gramos extra.",
                accent: "pink",
                featured: true,
              },
              {
                Icon: CreditCard,
                title: "Pagos sin comisión",
                desc: "Nequi, Bancolombia o Bre-B con confirmación inmediata.",
                accent: "blue",
                featured: false,
              },
              {
                Icon: MapPin,
                title: "Recoge o recibe en casa",
                desc: "Retira en tienda gratis o solicita envío a domicilio.",
                accent: "gold",
                featured: false,
              },
              {
                Icon: Trophy,
                title: "13g = 1 oz gratis",
                desc: "Acumula gramos en cada compra y canjea esencias premium.",
                accent: "pink",
                featured: false,
              },
            ].map(({ Icon, title, desc, accent, featured }) => (
              <div
                key={title}
                className={`home-bento__card${featured ? " home-bento__card--featured" : ""}`}
              >
                <div className={`home-bento__icon-wrap home-bento__icon-wrap--${accent}`}>
                  <Icon
                    size={featured ? 24 : 20}
                    className={`home-bento__icon home-bento__icon--${accent}`}
                  />
                </div>
                <p className="home-bento__card-title">{title}</p>
                <p className="home-bento__card-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Colección Destacada
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="home-collection" aria-labelledby="collection-heading">
        <div className="home-collection__inner">
          <div className="home-collection__header">
            <div className="home-collection__header-left">
              <p className="home-collection__label">Colección</p>
              <h2 id="collection-heading" className="home-collection__title">
                Nuestros destacados
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="home-collection__link"
            >
              Ver todo <ChevronRight size={16} strokeWidth={2} />
            </Link>
          </div>

          <div className="home-collection__scroll">
            {productsLoading && <FeaturedSkeleton />}

            {productsError && (
              <div className="home-collection__error">
                <div className="home-collection__error-icon">
                  <AlertCircle size={28} />
                </div>
                <p className="home-collection__error-text">
                  No pudimos cargar los productos. Intenta de nuevo.
                </p>
                <button
                  onClick={() => retryProducts()}
                  className="home-collection__error-btn"
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
              <p className="home-collection__empty">
                No hay productos disponibles por el momento.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Loyalty teaser
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="home-loyalty" aria-labelledby="gram-heading">
        <div className="home-loyalty__inner">
          {!isAuthenticated ? (
            <div className="home-loyalty__card">
              <div className="home-loyalty__ornament-tl" aria-hidden="true" />
              <div className="home-loyalty__ornament-bl" aria-hidden="true" />

              <div className="home-loyalty__icon-wrap">
                <Sparkles size={26} className="home-loyalty__icon" />
              </div>

              <h2 id="gram-heading" className="home-loyalty__title">
                Acumula gramos y gana esencias gratis
              </h2>
              <p className="home-loyalty__desc">
                Cada compra te da 1g + una ficha de juego. Al llegar a {GRAMS_PER_OZ}g
                canjeas 1 oz de esencia premium.
              </p>

              <div className="home-loyalty__steps">
                {[
                  { Icon: Scale, label: "Compra" },
                  { Icon: Gamepad2, label: "Juega" },
                  { Icon: Trophy, label: "Canjea" },
                ].map(({ Icon, label }, i) => (
                  <div key={label} className="home-loyalty__step">
                    <div className="home-loyalty__step-icon">
                      <Icon size={20} />
                    </div>
                    <span className="home-loyalty__step-label">{label}</span>
                    {i < 2 && (
                      <div className={`home-loyalty__step-connector${i === 0 ? " home-loyalty__step-connector--active" : ""}`}>
                        <ChevronRight size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Link to="/register" className="home-loyalty__btn">
                Regístrate gratis
                <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="home-loyalty__card home-loyalty__card--auth">
              <div className="home-loyalty__auth-header">
                <div>
                  <h2 id="gram-heading" className="home-loyalty__auth-title">
                    Mis gramos
                  </h2>
                  <p className="home-loyalty__auth-subtitle">
                    {user?.name?.split(" ")[0]}
                  </p>
                </div>
                <div className="home-loyalty__auth-gold-icon">
                  <Scale size={20} />
                </div>
              </div>

              <div className="home-loyalty__auth-balance">
                <span className="home-loyalty__auth-grams">{currentGrams}</span>
                <span className="home-loyalty__auth-grams-total">/ {GRAMS_PER_OZ}g</span>
              </div>
              <p className="home-loyalty__auth-message">
                {currentGrams >= GRAMS_PER_OZ
                  ? "¡Puedes canjear 1 oz de esencia gratis!"
                  : `${GRAMS_PER_OZ - currentGrams}g más para tu próxima oz gratis`}
              </p>

              <div className="home-loyalty__progress">
                <div
                  className="home-loyalty__progress-bar"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <Link to="/mis-gramos" className="home-loyalty__auth-link">
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
