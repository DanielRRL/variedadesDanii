# Plan: Organizar visualmente + migrar MyGramsPage de Tailwind a CSS puro

## Archivos involucrados

| Archivo | Acción |
|---|---|
| `frontendVD/src/css/MyGramsPage.css` | **Crear** — hoja BEM con prefijo `.grams-` |
| `frontendVD/src/pages/MyGramsPage.tsx` | **Modificar** — reemplazar `className=` Tailwind → clases BEM, reorganizar visualmente |

---

## Reorganización visual (sin cambiar estilos predefinidos)

### Secciones actuales → mejoradas:

| Antes | Después |
|---|---|
| **Hero**: gradiente rosa, jar SVG, número grande, "gramos", dots de compra | Igual pero con **estadísticas compactas** debajo del número (total ganado, canjeado, compras) en una sola fila de badges |
| **Action buttons**: card sin header | Card con **section header** (`Gem` icon + "Canje") + botón redeem/locked + link "Ir a jugar" |
| **How to earn**: toggle sin icono | Card con **section header** (`Info` icon + "¿Cómo ganar gramos?") + contenido expandible |
| **Transaction history**: título suelto + lista | Card unificada con **section header** (`List` icon + "Historial") + lista de transacciones |
| **Redemption history**: toggle + lista | Card con **section header** (`Package` icon + "Mis canjes") + toggle expandible |

### Mejoras de layout:

1. **Hero** — Agrega fila de 3 badges (total ganado, canjeado, compras) debajo del número de gramos, en lugar de solo los dots
2. **Action card** — Agrega ícono `Gem` como section header, separa claramente el botón redeem del link "Ir a jugar"
3. **How to earn** — Ícono `Info` + título como section header (mismo patrón ProductDetailPage)
4. **Transaction history** — Ícono `List` + título como section header, lista dentro de card `bg-surface rounded-xl border`
5. **Redemption history** — Ícono `Package` + título como section header, badge de estado más prominente
6. **Spacing** — `space-y-5` entre secciones (consistente con ProductDetailPage)

---

## Mapeo de Tailwind → CSS (por sección)

### 1. Página raíz
```css
.grams-page {
  min-height: 100vh;
  background: var(--color-background, #FAFAFA);
  font-family: var(--font-body, 'Inter', sans-serif);
  padding-bottom: 6rem;
}
```

### 2. Hero
```css
.grams-hero {
  background: linear-gradient(to bottom right, var(--color-brand-pink, #D81B60), rgba(216, 27, 96, 0.8));
  padding: 2rem 1.5rem 2.5rem;
  text-align: center;
}

.grams-hero__jar { display: flex; justify-content: center; margin-bottom: 0.75rem; }
.grams-hero__number { font-family: var(--font-heading); font-weight: 800; font-size: 4.5rem; line-height: 1; color: white; }
.grams-hero__label { color: white; font-size: 1.125rem; margin-top: 0.25rem; }
.grams-hero__subtitle { color: rgba(255,255,255,0.7); font-size: 0.875rem; margin-top: 0.125rem; }
.grams-hero__stats { display: flex; justify-content: center; gap: 0.75rem; margin-top: 0.75rem; }
.grams-hero__stat-badge { background: rgba(255,255,255,0.15); color: white; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; white-space: nowrap; }
.grams-hero__stat-badge strong { font-weight: 700; }
.grams-hero__redeem-badge { background: #34d399; color: white; font-weight: 600; font-size: 0.75rem; padding: 0.25rem 1rem; border-radius: 9999px; display: inline-block; margin-top: 0.75rem; }
.grams-hero__purchase-dots { display: flex; align-items: center; justify-content: center; gap: 0.375rem; margin-top: 0.75rem; }
.grams-hero__dot { width: 0.625rem; height: 0.625rem; border-radius: 50%; }
.grams-hero__dot--filled { background: white; }
.grams-hero__dot--empty { background: rgba(255,255,255,0.3); }
.grams-hero__dots-label { color: rgba(255,255,255,0.6); font-size: 0.75rem; margin-left: 0.375rem; }
```

### 3. Content wrapper
```css
.grams-main {
  padding: 0 1rem;
  margin-top: -1.25rem;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
```

### 4. Action card
```css
.grams-card { background: var(--color-surface); border-radius: 1rem; border: 1px solid var(--color-border); padding: 1rem; }
.grams-section-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
.grams-section-header__icon { color: var(--color-brand-pink); flex-shrink: 0; }
.grams-section-header__title { font-family: var(--font-heading); font-weight: 600; font-size: 0.9375rem; color: var(--color-text-primary); }
.grams-actions__redeem-btn { width: 100%; padding: 0.875rem 0; border-radius: 9999px; background: var(--color-brand-pink); color: white; font-family: var(--font-heading); font-weight: 700; font-size: 0.875rem; border: none; cursor: pointer; }
.grams-actions__redeem-btn--locked { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.grams-actions__play-link { display: block; width: 100%; padding: 0.75rem 0; border-radius: 9999px; border: 2px solid var(--color-brand-pink); color: var(--color-brand-pink); font-family: var(--font-heading); font-weight: 700; font-size: 0.875rem; text-align: center; text-decoration: none; margin-top: 0.75rem; }
```

### 5. How to earn
```css
.grams-howto { background: var(--color-surface); border-radius: 1rem; border: 1px solid var(--color-border); overflow: hidden; }
.grams-howto__toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: none; border: none; cursor: pointer; }
.grams-howto__body { overflow: hidden; transition: max-height 0.3s ease; }
.grams-howto__body--collapsed { max-height: 0; }
.grams-howto__body--expanded { max-height: 20rem; }
.grams-howto__content { padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.grams-howto__item { display: flex; align-items: flex-start; gap: 0.75rem; }
.grams-howto__item-icon { flex-shrink: 0; margin-top: 0.125rem; }
.grams-howto__item-text { font-size: 0.875rem; color: var(--color-muted); }
```

### 6. Transaction history
```css
.grams-tx__list { display: flex; flex-direction: column; gap: 0.5rem; }
.grams-tx__item { background: var(--color-surface); border-radius: 1rem; border: 1px solid var(--color-border); padding: 0.875rem; display: flex; align-items: center; gap: 0.75rem; }
.grams-tx__icon { width: 2.25rem; height: 2.25rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.grams-tx__icon--pink { color: var(--color-brand-pink); background: rgba(216,27,96,0.1); }
.grams-tx__icon--gold { color: var(--color-brand-gold); background: #fef3c7; }
.grams-tx__icon--blue { color: #3b82f6; background: #eff6ff; }
.grams-tx__icon--gray { color: #9ca3af; background: #f3f4f6; }
.grams-tx__icon--red { color: #f87171; background: #fef2f2; }
.grams-tx__info { flex: 1; min-width: 0; }
.grams-tx__desc { font-size: 0.875rem; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grams-tx__date { font-size: 0.6875rem; color: var(--color-muted); }
.grams-tx__delta { font-family: var(--font-heading); font-weight: 700; font-size: 1rem; flex-shrink: 0; }
.grams-tx__delta--positive { color: #10b981; }
.grams-tx__delta--negative { color: #f87171; }
.grams-tx__more { width: 100%; text-align: center; font-size: 0.875rem; color: var(--color-brand-pink); font-weight: 500; padding: 0.5rem 0; background: none; border: none; cursor: pointer; }
.grams-tx__empty { text-align: center; padding: 2rem 0; font-size: 0.875rem; color: var(--color-muted); }
```

### 7. Redemption history
```css
.grams-redemptions { background: var(--color-surface); border-radius: 1rem; border: 1px solid var(--color-border); overflow: hidden; }
.grams-redemptions__toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: none; border: none; cursor: pointer; }
.grams-redemptions__body { overflow: hidden; transition: max-height 0.3s ease; }
.grams-redemptions__body--collapsed { max-height: 0; }
.grams-redemptions__body--expanded { max-height: 40rem; }
.grams-redemptions__content { padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.grams-redemptions__item { background: var(--color-background); border-radius: 1rem; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.375rem; }
.grams-redemptions__name { font-weight: 500; font-size: 0.875rem; color: var(--color-text-primary); }
.grams-redemptions__detail { font-size: 0.75rem; color: var(--color-muted); }
.grams-redemptions__footer { display: flex; align-items: center; justify-content: space-between; }
.grams-redemptions__status { font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.625rem; border-radius: 9999px; }
.grams-redemptions__status--pending { background: #fff7ed; color: #ea580c; }
.grams-redemptions__status--delivered { background: #ecfdf5; color: #059669; }
.grams-redemptions__status--cancelled { background: #f3f4f6; color: #6b7280; }
.grams-redemptions__date { font-size: 0.6875rem; color: var(--color-muted); }
```

### 8. RedeemModal (migración de clases Tailwind)
```css
.grams-modal__overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.4); }
.grams-modal { width: 100%; max-width: 32rem; background: var(--color-surface); border-radius: 1rem 1rem 0 0; overflow-y: auto; max-height: 85vh; }
.grams-modal__inner { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.grams-modal__handle { width: 2.5rem; height: 0.25rem; background: var(--color-border); border-radius: 9999px; margin: 0 auto; }
.grams-modal__title { font-family: var(--font-heading); font-weight: 700; font-size: 1rem; color: var(--color-text-primary); text-align: center; }
.grams-modal__stepper { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.grams-modal__stepper-btn { width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 1px solid; display: flex; align-items: center; justify-content: center; cursor: pointer; background: none; }
.grams-modal__stepper-btn--active { border-color: var(--color-brand-pink); color: var(--color-brand-pink); }
.grams-modal__stepper-btn--disabled { border-color: var(--color-border); color: var(--color-border); cursor: default; }
.grams-modal__stepper-val { font-family: var(--font-heading); font-weight: 700; font-size: 1.875rem; color: var(--color-brand-gold); width: 3rem; text-align: center; }
.grams-modal__oz-preview { font-size: 0.75rem; color: var(--color-muted); margin-top: 0.375rem; text-align: center; }
.grams-modal__info-banner { font-size: 0.6875rem; color: var(--color-muted); text-align: center; background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
.grams-modal__essence-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 12.5rem; overflow-y: auto; padding-right: 0.25rem; }
.grams-modal__essence-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; border-radius: 0.75rem; border: 1px solid; padding: 0.75rem; text-align: left; cursor: pointer; background: var(--color-surface); border-color: var(--color-border); transition: 0.15s; }
.grams-modal__essence-item--selected { border-color: var(--color-brand-pink); background: rgba(216,27,96,0.05); }
.grams-modal__essence-img { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; object-fit: cover; flex-shrink: 0; }
.grams-modal__essence-placeholder { width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: rgba(216,27,96,0.05); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(216,27,96,0.3); font-family: var(--font-heading); font-weight: 700; }
.grams-modal__essence-name { font-size: 0.875rem; font-weight: 500; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grams-modal__essence-family { font-size: 0.625rem; background: var(--color-background); color: var(--color-muted); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
.grams-modal__summary { background: var(--color-background); border-radius: 0.75rem; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; }
.grams-modal__summary-row { display: flex; justify-content: space-between; }
.grams-modal__summary-label { color: var(--color-muted); }
.grams-modal__summary-value { font-weight: 700; color: var(--color-text-primary); }
.grams-modal__confirm-btn { width: 100%; padding: 0.875rem 0; border-radius: 9999px; font-family: var(--font-heading); font-weight: 700; font-size: 0.875rem; color: white; display: flex; align-items: center; justify-content: center; gap: 0.5rem; border: none; cursor: pointer; background: var(--color-brand-pink); }
.grams-modal__confirm-btn:active:not(:disabled) { background: rgba(216,27,96,0.8); }
.grams-modal__confirm-btn--disabled { background: #d1d5db; cursor: not-allowed; }
.grams-modal__spinner { width: 1rem; height: 1rem; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: grams-spin 0.6s linear infinite; }
@keyframes grams-spin { to { transform: rotate(360deg); } }
/* Success state */
.grams-modal__success { text-align: center; padding-top: 1.5rem; padding-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.grams-modal__success-icon { width: 4rem; height: 4rem; border-radius: 50%; background: #ecfdf5; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #10b981; }
.grams-modal__success-title { font-family: var(--font-heading); font-weight: 700; font-size: 1.125rem; color: var(--color-text-primary); }
.grams-modal__success-text { font-size: 0.875rem; color: var(--color-muted); }
.grams-modal__success-number { font-weight: 500; font-size: 0.875rem; color: var(--color-text-primary); }
.grams-modal__success-number span { color: var(--color-brand-pink); }
.grams-modal__success-btn { background: var(--color-brand-pink); color: white; font-family: var(--font-heading); font-weight: 700; padding: 0.75rem 2rem; border-radius: 9999px; font-size: 0.875rem; border: none; cursor: pointer; }
```

### 9. Loading spinner (hero)
```css
.grams-hero__spinner { width: 2rem; height: 2rem; border: 4px solid white; border-top-color: transparent; border-radius: 50%; animation: grams-spin 0.6s linear infinite; margin: 0 auto; }
```

### 10. Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  .grams-modal__spinner, .grams-hero__spinner { animation: none; }
  .grams-howto__body, .grams-redemptions__body { transition: none; }
}
```

---

## Cambios en el TSX

### Import
```tsx
import '../css/MyGramsPage.css';
```

### Nuevos íconos necesarios
```tsx
import { Info, List, Package } from 'lucide-react';
```

### Resumen de reemplazos de `className`

| Elemento | Antes | Después |
|---|---|---|
| Root div | `min-h-screen bg-background font-body pb-24` | `grams-page` |
| Hero div | `bg-linear-to-br from-brand-pink to-brand-pink/80 px-6 pt-8 pb-10 text-center` | `grams-hero` |
| GramJar wrapper | `flex justify-center mb-3` | `grams-hero__jar` |
| Gram number | `font-heading font-extrabold text-[72px] leading-none text-white` | `grams-hero__number` |
| "gramos" label | `text-white text-lg mt-1 font-body` | `grams-hero__label` |
| "de 13 máximos" | `text-white/70 text-sm mt-0.5` | `grams-hero__subtitle` |
| Stats badges row | Nuevo | `grams-hero__stats` + `grams-hero__stat-badge` ×3 |
| Canje badge | `inline-block mt-3 bg-emerald-400 text-white ...` | `grams-hero__redeem-badge` |
| Purchase dots row | `mt-3 flex items-center justify-center gap-1.5` | `grams-hero__purchase-dots` |
| Dot filled/empty | `w-2.5 h-2.5 rounded-full bg-white` / `bg-white/30` | `grams-hero__dot grams-hero__dot--filled` / `--empty` |
| Main wrapper | `px-4 -mt-5 space-y-4` | `grams-main` |
| Cards base | `bg-surface rounded-xl border border-border p-4` | `grams-card` |
| Section headers | Nuevo patrón | `grams-section-header` + icon + title |
| Redeem button | `w-full py-3.5 rounded-full bg-brand-pink ...` | `grams-actions__redeem-btn` |
| Locked button | `w-full py-3.5 rounded-full bg-gray-200 ...` | `grams-actions__redeem-btn grams-actions__redeem-btn--locked` |
| Play link | `block w-full py-3 rounded-full border-2 ...` | `grams-actions__play-link` |
| Tx item | `bg-surface rounded-xl border border-border p-3.5 flex items-center gap-3` | `grams-tx__item` |
| Tx icon wrapper | `w-9 h-9 rounded-full flex items-center justify-center flex-none` + clsx | `grams-tx__icon` + `--pink/gold/blue/gray/red` |
| Tx delta | `font-heading font-bold text-base flex-none` + clsx | `grams-tx__delta` + `--positive/negative` |
| Redemption item | `bg-background rounded-xl p-3.5 space-y-1.5` | `grams-redemptions__item` |
| Redemption status | `text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full` + clsx | `grams-redemptions__status` + `--pending/delivered/cancelled` |

### El SVG `GramJar` mantiene su `className="w-20 h-28"` (dimensiones) y `className="transition-all duration-700"` (fill animation) — son las ÚNICAS clases Tailwind que se conservan porque son puramente utilitarias del SVG y no hay equivalente en CSS sin romper.

---

## Archivos resultantes

| Archivo | Líneas estimadas |
|---|---|
| `MyGramsPage.css` | ~380 líneas |
| `MyGramsPage.tsx` | ~560 líneas (baja de 597 porque se eliminan clases largas) |
