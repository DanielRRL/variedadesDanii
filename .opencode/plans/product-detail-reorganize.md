# Plan: Reorganizar ProductDetailPage visualmente

Archivo: `frontendVD/src/pages/ProductDetailPage.tsx`

---

## 1. Agregar ícono `ShoppingBag` a los imports (línea 19)

```tsx
import {
  ArrowLeft, Share2, Leaf, AlertCircle, RefreshCw,
  Check, Minus, Plus, Info, ChevronDown, ChevronUp, ShoppingBag,
} from 'lucide-react';
```

---

## 2. Hero — 320px, badges top, gradient overlay (líneas 194-222)

- Cambiar `h-[280px]` → `h-[320px]`
- Mover type badge de `bottom-3 left-3` → `top-4 left-3`
- Mover "Gana 1g" de `top-16 right-3` → `top-4 right-3`
- Agregar `<div>` con gradiente en la parte inferior para transición suave

```tsx
<div className="relative w-full h-[320px] bg-gradient-to-br from-brand-pink/10 to-brand-pink/5 overflow-hidden">
  {product.photoUrl ? (
    <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center">
      <span className="font-heading font-bold text-[72px] text-brand-pink/20 select-none">
        {product.name.charAt(0).toUpperCase()}
      </span>
    </div>
  )}

  {/* Gradient fade to background */}
  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />

  {/* Type badge — top left */}
  <span className="absolute top-4 left-3 bg-surface/90 backdrop-blur-sm text-[11px] font-body font-semibold text-text-primary px-3 py-1 rounded-full border border-border shadow-sm">
    {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
  </span>

  {/* "Gana 1g" pill — top right */}
  {product.generatesGram && (
    <span className="absolute top-4 right-3 bg-emerald-500 text-white text-[11px] font-body font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
      <Leaf size={12} strokeWidth={2.5} />
      Gana 1g
    </span>
  )}
</div>
```

---

## 3. Product info → tarjeta (reemplaza SECTION 3, líneas 224-279)

Agrupa nombre, precio, stock, ml en `bg-surface rounded-2xl border border-border p-4`.

```tsx
<div className="px-4 -mt-6 relative z-10">
  <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
    <h1 className="font-heading font-bold text-[22px] text-text-primary leading-tight">
      {product.name}
    </h1>

    <p className="font-heading font-bold text-[28px] text-brand-gold">
      {formatCOP(product.price)}
    </p>

    {/* Stock indicator */}
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          'w-2.5 h-2.5 rounded-full flex-none',
          outOfStock ? 'bg-red-400' : lowStock ? 'bg-orange-400' : 'bg-emerald-400'
        )}
      />
      <span className="font-body text-sm text-muted">
        {outOfStock
          ? 'Agotado'
          : lowStock
            ? `Quedan ${product.stockUnits} unidades`
            : `${product.stockUnits} disponibles`}
      </span>
    </div>

    {/* Ml quantity */}
    {product.mlQuantity && (
      <p className="font-body text-[13px] text-muted">
        Contenido: {product.mlQuantity} ml
      </p>
    )}
  </div>
</div>
```

---

## 4. Descripción → tarjeta propia (nueva, va después de SECTION 3)

```tsx
{product.description && (
  <div className="px-4">
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-brand-pink" strokeWidth={2} />
        <h2 className="font-heading font-semibold text-[15px] text-text-primary">
          Descripción
        </h2>
      </div>
      <p
        className={clsx(
          'font-body text-sm text-muted leading-relaxed',
          !descExpanded && 'line-clamp-3'
        )}
      >
        {product.description}
      </p>
      {product.description.length > 150 && (
        <button
          onClick={() => setDescExpanded((v) => !v)}
          className="font-body text-[13px] text-brand-pink font-medium mt-2"
        >
          {descExpanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  </div>
)}
```

---

## 5. Cantidad + gramos → tarjeta unificada (reemplaza SECTION 4, líneas 281-327)

```tsx
{!outOfStock && (
  <div className="px-4">
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag size={16} className="text-brand-pink" strokeWidth={2} />
        <h2 className="font-heading font-semibold text-[15px] text-text-primary">
          Cantidad
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          className={clsx(
            'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
            quantity <= 1
              ? 'border-border text-border cursor-not-allowed'
              : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
          )}
          aria-label="Reducir cantidad"
        >
          <Minus size={18} strokeWidth={2} />
        </button>

        <span className="font-heading font-bold text-lg text-text-primary w-8 text-center">
          {quantity}
        </span>

        <button
          onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
          disabled={quantity >= maxAllowed}
          className={clsx(
            'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
            quantity >= maxAllowed
              ? 'border-border text-border cursor-not-allowed'
              : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
          )}
          aria-label="Aumentar cantidad"
        >
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {product.generatesGram && (
        <p className="font-body text-[13px] text-emerald-600 mt-3 flex items-center gap-1.5">
          <Leaf size={14} className="flex-none" />
          Esta compra te dará {quantity} gramo{quantity !== 1 ? 's' : ''} acumulable{quantity !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  </div>
)}
```

---

## 6. Gram explainer → section header pattern (reemplaza SECTION 5, líneas 329-381)

```tsx
{product.generatesGram && (
  <div className="px-4">
    <button
      onClick={() => setGramInfoExpanded((v) => !v)}
      className="w-full bg-surface rounded-2xl border border-amber-200 p-4 text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-amber-600 flex-none" strokeWidth={2} />
          <span className="font-heading font-semibold text-[15px] text-text-primary">
            ¿Qué son los gramos?
          </span>
        </div>
        {gramInfoExpanded
          ? <ChevronUp size={16} className="text-muted" />
          : <ChevronDown size={16} className="text-muted" />}
      </div>

      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          gramInfoExpanded ? 'max-h-60 mt-3' : 'max-h-0'
        )}
      >
        <p className="font-body text-[13px] text-muted leading-relaxed">
          Por cada loción comprada acumulas 1 gramo. Al juntar 13 gramos (1 onza)
          puedes canjear una esencia de perfume gratis. Es nuestro regalo por tu fidelidad.
        </p>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-[11px] text-muted">
              {isAuthenticated ? `${gramBalance}g de 13g` : 'Progreso'}
            </span>
            <span className="font-body text-[11px] font-semibold text-amber-600">
              {isAuthenticated
                ? `Te faltan ${Math.max(0, 13 - gramBalance)}g`
                : 'Crea tu cuenta para acumular'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-amber-200/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: isAuthenticated ? `${Math.min(100, (gramBalance / 13) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </button>
  </div>
)}
```

---

## 7. Espaciado general

- Envolver sections 3-5 en `<div className="space-y-5 pt-2">` en lugar de `pt-4`/`pt-5` sueltos.
- Loading skeleton: `h-[280px]` → `h-[320px]`.
- El container principal se mantiene con `pb-28`.

---

## 8. Loading skeleton actualizado (líneas 162-173)

```tsx
<div className="animate-pulse">
  <div className="w-full h-[320px] bg-border" />
  <div className="px-4 space-y-3 pt-2">
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      <div className="h-5 bg-border rounded-full w-24" />
      <div className="h-7 bg-border rounded-md w-3/4" />
      <div className="h-8 bg-border rounded-md w-1/3" />
      <div className="h-4 bg-border rounded-md w-1/2" />
    </div>
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      <div className="h-5 bg-border rounded-full w-28" />
      <div className="h-16 bg-border rounded-md w-full" />
    </div>
    <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
      <div className="h-5 bg-border rounded-full w-20" />
      <div className="h-10 bg-border rounded-full w-full" />
    </div>
  </div>
</div>
```
