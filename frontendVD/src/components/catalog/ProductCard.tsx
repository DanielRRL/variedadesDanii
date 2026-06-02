/**
 * ProductCard — Premium product card for catalog grids and featured sections.
 *
 * States: default, just-added (emerald pulse), out-of-stock (dimmed).
 * On click navigates to product detail. Add-to-cart button with feedback.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Check, ShoppingBag } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { formatCOP } from "../../utils/format";
import type { Product } from "../../types";
import "../../css/ProductCard.css";

const TYPE_LABELS: Record<string, string> = {
  LOTION: "Loción", CREAM: "Crema", SHAMPOO: "Shampoo",
  MAKEUP: "Maquillaje", SPLASH: "Splash", ACCESSORY: "Accesorio",
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const outOfStock = product.stockUnits <= 0;
  const lowStock = product.stockUnits > 0 && product.stockUnits <= 5;
  const isInCart = cartItems.some((item) => item.productId === product.id);

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
    <article
      onClick={() => navigate(`/productos/${product.id}`)}
      className={clsx("product-card", outOfStock && "product-card--out-of-stock")}
      role="article"
      aria-label={product.name}
    >
      {/* Image */}
      <div className="product-card__image-area">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="product-card__image-placeholder">
            <span>{product.name[0]?.toUpperCase()}</span>
          </div>
        )}

        {/* Type badge */}
        <span className="product-card__type-badge">
          {TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {/* Gram badge */}
        {product.generatesGram && (
          <span className="product-card__gram-badge">+1g</span>
        )}
      </div>

      {/* Info */}
      <div className="product-card__info">
        <h3 className="product-card__name">{product.name}</h3>

        <p className="product-card__price">{formatCOP(product.price)}</p>

        {/* Stock indicator */}
        <div className="product-card__stock">
          <span
            className={clsx(
              "product-card__stock-dot",
              outOfStock ? "product-card__stock-dot--out" : lowStock ? "product-card__stock-dot--low" : "product-card__stock-dot--ok",
            )}
          />
          <span className="product-card__stock-text">
            {outOfStock
              ? "Agotado"
              : lowStock
                ? `Quedan ${product.stockUnits}`
                : "Disponible"}
          </span>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={clsx(
            "product-card__add-btn",
            outOfStock
              ? "product-card__add-btn--disabled"
              : isInCart || justAdded
                ? "product-card__add-btn--added"
                : "product-card__add-btn--default",
          )}
        >
          {outOfStock ? (
            "Sin stock"
          ) : isInCart || justAdded ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              Agregado
            </>
          ) : (
            <>
              <ShoppingBag size={14} strokeWidth={2} />
              Agregar
            </>
          )}
        </button>
      </div>
    </article>
  );
}
