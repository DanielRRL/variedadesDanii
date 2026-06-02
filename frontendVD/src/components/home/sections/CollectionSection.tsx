import { Link } from 'react-router-dom';
import type { Product } from '../../../types';
import { formatCOP } from '../../../utils/format';

interface CollectionSectionProps {
  products: Product[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onProductPress: (id: string) => void;
  onAddToCart: (product: Product) => void;
  addRef: (el: HTMLElement | null) => void;
}

const TYPE_LABELS: Record<string, string> = {
  LOTION: 'Loción', CREAM: 'Crema', SHAMPOO: 'Shampoo',
  MAKEUP: 'Maquillaje', SPLASH: 'Splash', ACCESSORY: 'Accesorio',
};

function ChevronRightIcon({ size, strokeWidth = 2 }: { size: number; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function AlertCircleIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function RefreshCwIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  );
}

function FeaturedProductCard({
  product,
  onPress,
  onAddToCart,
}: {
  product: Product;
  onPress: () => void;
  onAddToCart: (product: Product) => void;
}) {
  const outOfStock = product.stockUnits <= 0;
  const lowStock = product.stockUnits > 0 && product.stockUnits <= 5;

  return (
    <article
      onClick={outOfStock ? undefined : onPress}
      className={`home-product-card${outOfStock ? ' home-product-card--disabled' : ''}`}
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onKeyDown={(e) => {
        if (!outOfStock && (e.key === 'Enter' || e.key === ' ')) onPress();
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
      </div>

      <div className="home-product-card__content">
        <p className="home-product-card__name">{product.name}</p>
        <p className="home-product-card__price">{formatCOP(product.price)}</p>

        <div className="home-product-card__stock">
          <span className={`home-product-card__stock-dot ${outOfStock ? 'home-product-card__stock-dot--out' : lowStock ? 'home-product-card__stock-dot--low' : 'home-product-card__stock-dot--ok'}`} />
          <span className="home-product-card__stock-text">
            {outOfStock ? 'Agotado' : lowStock ? `Quedan ${product.stockUnits}` : 'Disponible'}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          disabled={outOfStock}
          className={`home-product-card__add-btn ${outOfStock ? 'home-product-card__add-btn--disabled' : ''}`}
        >
          Agregar
        </button>
      </div>
    </article>
  );
}

export function CollectionSection({
  products,
  isLoading,
  isError,
  onRetry,
  onProductPress,
  onAddToCart,
  addRef,
}: CollectionSectionProps) {
  return (
    <section
      ref={addRef}
      className="home-collection home-section scroll-reveal"
      aria-labelledby="collection-heading"
    >
      <div className="home-section__decorative-bg" aria-hidden="true">
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
      </div>

      <div className="home-collection__inner">
        <div className="home-collection__header">
          <div className="home-collection__header-left">
            <p className="home-collection__label">Colección</p>
            <h2 id="collection-heading" className="home-collection__title">
              Nuestros destacados
            </h2>
          </div>
          <Link to="/catalogo" className="home-collection__link">
            Ver todo <ChevronRightIcon size={16} />
          </Link>
        </div>

        <div className="home-collection__scroll">
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="home-product-skeleton" />
              ))}
            </>
          )}

          {isError && (
            <div className="home-collection__error">
              <div className="home-collection__error-icon">
                <AlertCircleIcon size={28} />
              </div>
              <p className="home-collection__error-text">
                No pudimos cargar los productos. Intenta de nuevo.
              </p>
              <button onClick={onRetry} className="home-collection__error-btn">
                <RefreshCwIcon size={14} />
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && products.length > 0 && products.map((product) => (
            <FeaturedProductCard
              key={product.id}
              product={product}
              onPress={() => onProductPress(product.id)}
              onAddToCart={() => onAddToCart(product)}
            />
          ))}

          {!isLoading && !isError && products.length === 0 && (
            <p className="home-collection__empty">
              No hay productos disponibles por el momento.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
