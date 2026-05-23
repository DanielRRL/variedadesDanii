/**
 * ProductCard — Premium product card for catalog grids and featured sections.
 *
 * States: default, just-added (emerald pulse), out-of-stock (dimmed).
 * On click navigates to product detail. Add-to-cart button with feedback.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";
import { formatCOP } from "../../utils/format";
import type { Product } from "../../types";

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
    <article
      onClick={() => navigate(`/productos/${product.id}`)}
      className={clsx(
        "bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden cursor-pointer",
        "transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-pink/20",
        outOfStock && "opacity-50 cursor-not-allowed"
      )}
      role="article"
      aria-label={product.name}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-brand-pink/5 overflow-hidden">
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
        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200/50">
          {TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {/* Gram badge */}
        {product.generatesGram && (
          <span className="absolute top-2.5 right-2.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            +1g
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-1.5">
        <h3 className="font-heading font-semibold text-sm text-slate-800 leading-snug line-clamp-2">
          {product.name}
        </h3>

        <p className="font-heading font-bold text-base text-brand-gold">
          {formatCOP(product.price)}
        </p>

        {/* Stock indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "w-2 h-2 rounded-full shrink-0",
              outOfStock ? "bg-red-400" : lowStock ? "bg-amber-400" : "bg-emerald-400"
            )}
          />
          <span className="text-[11px] text-slate-500">
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
            "w-full mt-2 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
            outOfStock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : justAdded
                ? "bg-emerald-500 text-white"
                : "bg-brand-pink text-white hover:bg-brand-pink/90 active:scale-[0.98]"
          )}
        >
          {outOfStock ? (
            "Sin stock"
          ) : justAdded ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              Agregado
            </>
          ) : (
            "Agregar"
          )}
        </button>
      </div>
    </article>
  );
}
