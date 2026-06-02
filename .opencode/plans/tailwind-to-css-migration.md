# Plan: Migrar ProductDetailPage de Tailwind CSS a CSS puro

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `frontendVD/src/css/ProductDetailPage.css` | **Crear** — hoja de estilos BEM pura |
| `frontendVD/src/pages/ProductDetailPage.tsx` | **Modificar** — reemplazar `className=` Tailwind por classNames estáticos BEM |

## Convenciones del proyecto

- **BEM**: `.product-detail__section--modifier`
- **Custom properties**: `var(--color-brand-pink)`, `var(--font-heading)`, etc. (definidos en `index.css` `@theme`)
- **Prefijo**: `.pd-` para reducir verbosidad (ej: `.pd-hero` en vez de `.product-detail__hero`)
- **`clsx`** se mantiene para clases condicionales (mismos patrones que `CartPage.css` con `--active`, `--disabled`, etc.)

---

## Mapeo de Tailwind → CSS (por sección)

### 1. Contenedor raíz
| Tailwind | CSS |
|---|---|
| `min-h-screen bg-background pb-28 font-body` | `.pd-page` |

### 2. Top bar
| Tailwind | CSS |
|---|---|
| barra: `fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-[env(...)] h-14 bg-background/80 backdrop-blur-sm` | `.pd-topbar` |
| botones: `w-10 h-10 flex items-center justify-center rounded-full bg-surface/90 border border-border shadow-sm` | `.pd-topbar__btn` |
| iconos: `text-text-primary` | `.pd-topbar__icon` |

### 3. Hero (320px)
| Tailwind | CSS |
|---|---|
| container: `relative w-full h-[320px] bg-gradient-to-br from-brand-pink/10 to-brand-pink/5 overflow-hidden` | `.pd-hero` |
| img: `w-full h-full object-cover` | `.pd-hero__img` |
| placeholder wrapper: `w-full h-full flex items-center justify-center` | `.pd-hero__placeholder` |
| placeholder letra: `font-heading font-bold text-[72px] text-brand-pink/20 select-none` | `.pd-hero__letter` |
| gradiente fade: `absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent` | `.pd-hero__fade` |
| type badge: `absolute top-4 left-3 bg-surface/90 backdrop-blur-sm text-[11px] font-body font-semibold text-text-primary px-3 py-1 rounded-full border border-border shadow-sm` | `.pd-hero__type-badge` |
| gram pill: `absolute top-4 right-3 bg-emerald-500 text-white text-[11px] font-body font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm` | `.pd-hero__gram-pill` |

### 4. Cards wrapper
| Tailwind | CSS |
|---|---|
| `px-4 space-y-5 -mt-6 relative z-10` | `.pd-content` |

### 5. Info card
| Tailwind | CSS |
|---|---|
| card: `bg-surface rounded-2xl border border-border p-4 space-y-3` | `.pd-card` |
| h1: `font-heading font-bold text-[22px] text-text-primary leading-tight` | `.pd-info__name` |
| price: `font-heading font-bold text-[28px] text-brand-gold` | `.pd-info__price` |
| stock row: `flex items-center gap-2` | `.pd-info__stock` |
| dot: `w-2.5 h-2.5 rounded-full flex-none` + condicional | `.pd-info__stock-dot` + `--out` / `--low` / `--ok` |
| stock text: `font-body text-sm text-muted` | `.pd-info__stock-text` |
| ml: `font-body text-[13px] text-muted` | `.pd-info__ml` |

### 6. Description card
| Tailwind | CSS |
|---|---|
| card: `bg-surface rounded-2xl border border-border p-4` | `.pd-card` |
| header: `flex items-center gap-2 mb-3` | `.pd-section-header` |
| icon: `text-brand-pink` | `.pd-section-header__icon` |
| title: `font-heading font-semibold text-[15px] text-text-primary` | `.pd-section-header__title` |
| text: `font-body text-sm text-muted leading-relaxed` + condicional `line-clamp-3` | `.pd-desc__text` + `.pd-desc__text--clamped` |
| toggle: `font-body text-[13px] text-brand-pink font-medium mt-2` | `.pd-desc__toggle` |

### 7. Quantity card
| Tailwind | CSS |
|---|---|
| card: `bg-surface rounded-2xl border border-border p-4` | `.pd-card` |
| header: `flex items-center gap-2 mb-3` | `.pd-section-header` |
| stepper row: `flex items-center gap-4` | `.pd-quantity__stepper` |
| btn base: `w-10 h-10 rounded-full border flex items-center justify-center transition-colors` | `.pd-quantity__stepper-btn` |
| btn enabled: `border-brand-pink text-brand-pink active:bg-brand-pink/10` | (default) |
| btn disabled: `border-border text-border cursor-not-allowed` | `.pd-quantity__stepper-btn--disabled` |
| count: `font-heading font-bold text-lg text-text-primary w-8 text-center` | `.pd-quantity__count` |
| gram note: `font-body text-[13px] text-emerald-600 mt-3 flex items-center gap-1.5` | `.pd-quantity__gram-note` |

### 8. Gram explainer
| Tailwind | CSS |
|---|---|
| button: `w-full bg-surface rounded-2xl border border-amber-200 p-4 text-left` | `.pd-gram` |
| header row: `flex items-center justify-between` | `.pd-gram__header` |
| title: `font-heading font-semibold text-[15px] text-text-primary` | `.pd-gram__title` |
| chevron: `text-muted` | `.pd-gram__chevron` |
| collapse: `overflow-hidden transition-all duration-300` + condicional | `.pd-gram__body` + `.pd-gram__body--expanded` |
| text: `font-body text-[13px] text-muted leading-relaxed` | `.pd-gram__text` |
| progress wrapper: `mt-3` | `.pd-gram__progress` |
| progress row: `flex items-center justify-between mb-1` | `.pd-gram__progress-labels` |
| progress left: `font-body text-[11px] text-muted` | `.pd-gram__progress-label` |
| progress right: `font-body text-[11px] font-semibold text-amber-600` | `.pd-gram__progress-remaining` |
| progress bar bg: `h-2 rounded-full bg-amber-200/50 overflow-hidden` | `.pd-gram__progress-bar` |
| progress fill: `h-full rounded-full bg-amber-500 transition-all` | `.pd-gram__progress-fill` |

### 9. Sticky add-to-cart bar
| Tailwind | CSS |
|---|---|
| container: `fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 pb-[env(...)] pt-3 shadow-[...]` | `.pd-cart-bar` |
| btn base: `w-full py-3.5 rounded-full text-[15px] font-heading font-bold transition-all flex items-center justify-center gap-2` | `.pd-cart-bar__btn` |
| out of stock: `bg-gray-200 text-gray-400 cursor-not-allowed` | `.pd-cart-bar__btn--out` |
| just added: `bg-emerald-500 text-white` | `.pd-cart-bar__btn--added` |
| default: `bg-brand-pink text-white active:bg-brand-pink/80` | (default) |

### 10. Auth sheet
| Tailwind | CSS |
|---|---|
| overlay: `fixed inset-0 z-50 flex items-end justify-center bg-black/40` | `.pd-auth-sheet__overlay` |
| sheet: `w-full max-w-lg bg-surface rounded-t-2xl p-6 pb-[env(...)] space-y-4 animate-[slideUp_0.25s_ease-out]` | `.pd-auth-sheet` |
| handle: `w-10 h-1 bg-border rounded-full mx-auto` | `.pd-auth-sheet__handle` |
| title: `font-heading font-semibold text-base text-text-primary text-center` | `.pd-auth-sheet__title` |
| login btn: `w-full py-3 rounded-full bg-brand-pink text-white font-body font-semibold text-sm` | `.pd-auth-sheet__btn--primary` |
| register btn: `w-full py-3 rounded-full border border-brand-pink text-brand-pink font-body font-semibold text-sm` | `.pd-auth-sheet__btn--outline` |

### 11. Loading skeleton
| Tailwind | CSS |
|---|---|
| wrapper: `animate-pulse` | `.pd-skeleton` |
| hero: `w-full h-[320px] bg-border` | `.pd-skeleton__hero` |
| cards wrapper: `px-4 space-y-5 pt-2` | `.pd-skeleton__content` |
| card: `bg-surface rounded-2xl border border-border p-4 space-y-3` | `.pd-skeleton__card` |
| lines: `h-6 bg-border rounded-full w-28`, etc. | `.pd-skeleton__line` + `--sm`, `--md`, `--lg` widths |

### 12. Error state
| Tailwind | CSS |
|---|---|
| wrapper: `flex flex-col items-center gap-3 py-24 text-center px-4` | `.pd-error` |
| icon: `text-orange-400` | `.pd-error__icon` |
| text: `font-body text-sm text-muted` | `.pd-error__text` |
| btn: `flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2.5 rounded-full` | `.pd-error__retry` |

---

## Cambios en el TSX

1. Agregar `import '../css/ProductDetailPage.css'` al inicio
2. Reemplazar todos los `className="..."` por classNames BEM con `clsx` donde haya condicionales
3. Los íconos de Lucide mantienen sus `size` y `strokeWidth` prop, pero pierden `className` (o reciben clase CSS propia)
4. El `style={{ width: ... }}` del progress bar se mantiene (inline necesario)

Ejemplo de uso con `clsx`:
```tsx
// Antes
<span className={clsx('w-2.5 h-2.5 rounded-full flex-none', outOfStock ? 'bg-red-400' : ...)} />
// Después
<span className={clsx('pd-info__stock-dot', outOfStock ? 'pd-info__stock-dot--out' : lowStock ? 'pd-info__stock-dot--low' : 'pd-info__stock-dot--ok')} />
```

Ejemplo sin `clsx`:
```tsx
// Antes
<div className="bg-surface rounded-2xl border border-border p-4">
// Después
<div className="pd-card">
```

---

## Animaciones a incluir en el CSS

- `@keyframes pd-slideUp`: reelabora `animate-[slideUp_0.25s_ease-out]` como animación con nombre propio
- `@keyframes pd-pulse`: para el skeleton (mantiene `animate-pulse` pero con nombre propio)
- `@keyframes pd-spin`: no se usa actualmente, pero se incluye por si acaso

---

## Resultado esperado

- **0 referencias a clases Tailwind** en `ProductDetailPage.tsx`
- **1 archivo nuevo**: `ProductDetailPage.css` (~350-400 líneas) con BEM limpio
- **Sin cambios** en lógica, handlers, imports de stores/types/servicios
- **`clsx`** se sigue usando para clases condicionales (mismo patrón que `CartPage`)
- **Custom properties** de `index.css` se usan vía `var(--color-brand-pink)` etc.
