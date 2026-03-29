/**
 * ProductDetailPage — Full detail view for a single product.
 * Route: /productos/:id (public)
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, ShoppingCart, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { getProductById } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import type { Product } from '../types';

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'Loción',
  CREAM: 'Crema',
  SHAMPOO: 'Shampoo',
  MAKEUP: 'Maquillaje',
  SPLASH: 'Splash',
  ACCESSORY: 'Accesorio',
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: res, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const product: Product | null = res?.data ?? null;

  const outOfStock = product ? product.stockUnits <= 0 : true;
  const lowStock = product ? product.stockUnits > 0 && product.stockUnits <= 5 : false;

  const handleAdd = () => {
    if (!product || outOfStock) return;
    addItem(product, 1);
    setJustAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1500);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="min-h-screen bg-background pb-20 font-body">
      <AppBar title="Detalle" showBack showCart />

      {/* Loading */}
      {isLoading && (
        <div className="px-4 pt-6 space-y-4 animate-pulse">
          <div className="aspect-square bg-border rounded-xl" />
          <div className="h-6 bg-border rounded-md w-3/4" />
          <div className="h-4 bg-border rounded-md w-1/2" />
          <div className="h-4 bg-border rounded-md w-full" />
          <div className="h-12 bg-border rounded-full w-full mt-4" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
          <AlertCircle size={36} className="text-orange-400" strokeWidth={1.5} />
          <p className="font-body text-sm text-muted">
            No pudimos cargar este producto.
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

      {/* Product detail */}
      {!isLoading && !isError && product && (
        <div className="px-4 pt-4 space-y-4">
          {/* Photo */}
          <div className="relative aspect-square bg-brand-pink/5 rounded-xl overflow-hidden">
            {product.photoUrl ? (
              <img
                src={product.photoUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart size={48} className="text-brand-pink/30" strokeWidth={1.5} />
              </div>
            )}

            {product.generatesGram && (
              <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-body font-semibold px-3 py-1 rounded-full">
                Gana 1g
              </span>
            )}
          </div>

          {/* Type badge */}
          <span className="inline-block bg-brand-pink/10 text-brand-pink text-[12px] font-body font-medium px-3 py-1 rounded-full">
            {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
          </span>

          {/* Name & price */}
          <h1 className="font-heading font-bold text-xl text-text-primary">
            {product.name}
          </h1>

          <p className="font-heading font-bold text-2xl text-brand-gold">
            {formatCOP(product.price)}
          </p>

          {/* Stock */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'w-2.5 h-2.5 rounded-full',
                outOfStock ? 'bg-red-400' : lowStock ? 'bg-orange-400' : 'bg-emerald-400'
              )}
            />
            <span className="font-body text-sm text-muted">
              {outOfStock
                ? 'Agotado'
                : lowStock
                  ? `Quedan ${product.stockUnits} unidades`
                  : `${product.stockUnits} unidades disponibles`}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="font-body text-sm text-muted leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Ml quantity */}
          {product.mlQuantity && (
            <p className="font-body text-sm text-muted">
              Contenido: {product.mlQuantity} ml
            </p>
          )}

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={clsx(
              'w-full py-3.5 rounded-full text-base font-body font-semibold transition-colors flex items-center justify-center gap-2',
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
                <Check size={18} strokeWidth={2.5} />
                Agregado al carrito
              </>
            ) : (
              <>
                <ShoppingCart size={18} strokeWidth={2} />
                Agregar al carrito
              </>
            )}
          </button>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
