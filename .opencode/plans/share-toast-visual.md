# Plan: Mejorar feedback visual del botón compartir

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `frontendVD/src/pages/ProductDetailPage.tsx` | Agregar estado `justShared`, animación en botón, toast inline |
| `frontendVD/src/css/ProductDetailPage.css` | Agregar estilos del check y del toast inline |

---

## 1. `ProductDetailPage.tsx` — Cambios en lógica

### 1a. Agregar estado `justShared` + ref de timer (línea 65)

```tsx
const [justShared, setJustShared] = useState(false);
const sharedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
```

### 1b. Modificar `handleShare` (líneas 102-111)

- Reemplazar el `addToast(...)` global por un toast inline
- Activar `setJustShared(true)` en ambos casos (navigator.share y clipboard)
- El timer de `justShared` se maneja en el propio handler

```tsx
const handleShare = useCallback(async () => {
  const url = window.location.href;
  const title = product?.name ?? 'Producto';

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      setJustShared(true);
      clearTimeout(sharedTimerRef.current);
      sharedTimerRef.current = setTimeout(() => setJustShared(false), 2500);
    } catch { /* cancelled */ }
  } else {
    await navigator.clipboard.writeText(url);
    setJustShared(true);
    clearTimeout(sharedTimerRef.current);
    sharedTimerRef.current = setTimeout(() => setJustShared(false), 2500);
  }
}, [product]);
```

### 1c. Limpiar timer en useEffect (línea 138)

```tsx
useEffect(() => () => {
  clearTimeout(timerRef.current);
  clearTimeout(sharedTimerRef.current);
}, []);
```

### 1d. Modificar el botón de compartir (líneas 155-161)

Cambiar ícono condicionalmente y agregar clase `--shared` cuando activo:

```tsx
<button
  onClick={handleShare}
  className={clsx('pd-topbar__btn', justShared && 'pd-topbar__btn--shared')}
  aria-label={justShared ? 'Enlace copiado' : 'Compartir'}
  disabled={justShared}
>
  {justShared ? (
    <Check size={18} className="pd-topbar__icon--shared" strokeWidth={2.5} />
  ) : (
    <Share2 size={18} className="pd-topbar__icon" strokeWidth={2} />
  )}
</button>
```

### 1e. Agregar toast inline debajo de la topbar (dentro del div `pd-topbar` o inmediatamente después)

```tsx
{/* ── Share confirmation toast ──────────────────────── */}
{justShared && (
  <div className="pd-share-toast" role="status" aria-live="polite">
    <Check size={14} strokeWidth={2.5} />
    Enlace copiado al portapapeles
  </div>
)}
```

### 1f. Eliminar `addToast` de los imports de store (si ya no se usa en handleShare)

El `addToast` se sigue usando en `handleAdd` (línea 135), así que NO se elimina el import.

---

## 2. `ProductDetailPage.css` — Nuevas clases

### 2a. Botón compartir en estado activo

```css
.pd-topbar__btn--shared {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.pd-topbar__icon--shared {
  color: var(--pd-emerald, #10b981);
}
```

### 2b. Toast inline

```css
.pd-share-toast {
  position: absolute;
  top: calc(3.5rem + env(safe-area-inset-top, 0px) + 0.5rem);
  right: 1rem;
  z-index: 35;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--color-surface, #FFFFFF);
  border: 1px solid var(--color-border, #E0E0E0);
  border-radius: 0.75rem;
  padding: 0.5rem 0.875rem;
  font-family: var(--font-body, 'Inter', sans-serif);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--pd-emerald, #10b981);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  animation: pd-toast-in 0.3s var(--ease-smooth, cubic-bezier(0.22, 1, 0.36, 1)) both;
  white-space: nowrap;
}

@keyframes pd-toast-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## Resumen visual del resultado

1. **Click en compartir (escritorio)**: botón se pone verde con check ✓ + aparece pill verde "Enlace copiado al portapapeles" justo debajo del botón, desaparece a los 2.5s
2. **Click en compartir (móvil)**: se abre la hoja nativa del SO + al volver, si compartió, misma animación que escritorio
3. **Botón deshabilitado** mientras el toast está visible (evita doble click)
