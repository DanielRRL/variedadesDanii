import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Plus, Minus, X, Package } from 'lucide-react';
import clsx from 'clsx';
import { getEssences, adminGetProducts, registerEssenceMovement } from '../../services/api';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import type { Essence, Product } from '../../types';
import { OZ_TO_ML } from '../../utils/priceCalculator';
import '../../css/AdminInventoryPage.css';

const INVENTORY_TABS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ESSENCES', label: 'Esencias' },
  { key: 'LOTION', label: 'Lociones' },
  { key: 'CREAM', label: 'Cremas' },
  { key: 'SHAMPOO', label: 'Shampoo' },
  { key: 'MAKEUP', label: 'Maquillaje' },
  { key: 'SPLASH', label: 'Splash' },
  { key: 'ACCESSORY', label: 'Accesorios' },
];

const MOVEMENT_REASONS: string[] = [
  'Compra a proveedor', 'Ajuste de inventario', 'Merma / evaporación',
  'Venta de esencia', 'Devolución', 'Corrección', 'Otro',
];

interface MovementForm { type: 'IN' | 'OUT'; ml: string; reason: string; notes: string; }
const EMPTY_MOVEMENT: MovementForm = { type: 'IN', ml: '', reason: 'Compra a proveedor', notes: '' };

function RegisterMovementModal({ essence, onClose }: { essence: Essence; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MovementForm>(EMPTY_MOVEMENT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof MovementForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mlVal = parseFloat(form.ml);
    if (!mlVal || mlVal <= 0) { setError('Ingresa una cantidad válida.'); return; }
    setBusy(true); setError('');
    try {
      await registerEssenceMovement(essence.id, { type: form.type, ml: mlVal, reason: form.reason, notes: form.notes || undefined });
      queryClient.invalidateQueries({ queryKey: ['essences-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al registrar el movimiento.');
    } finally { setBusy(false); }
  };

  const ozVal = (parseFloat(form.ml) / OZ_TO_ML).toFixed(2);

  return (
    <div className="admin-inventory__modal-overlay">
      <div className="admin-inventory__modal-backdrop" onClick={onClose} />
      <div className="admin-inventory__modal-body">
        <div className="admin-inventory__modal-header">
          <div className="admin-inventory__modal-title-info">
            <h2 className="admin-inventory__modal-title">Registrar Movimiento</h2>
            <p className="admin-inventory__modal-subtitle">{essence.name}</p>
          </div>
          <button onClick={onClose} className="admin-inventory__modal-close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="admin-inventory__form admin-inventory__modal-content">
          <div className="admin-inventory__toggle-group">
            {(['IN', 'OUT'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className={clsx('admin-inventory__toggle-btn', `admin-inventory__toggle-btn--${t === 'IN' ? 'in' : 'out'}`, form.type === t && 'admin-inventory__toggle-btn--active')}>
                {t === 'IN' ? <><Plus size={14} /> Entrada</> : <><Minus size={14} /> Salida</>}
              </button>
            ))}
          </div>
          <div className="admin-inventory__form-group">
            <label className="admin-inventory__form-label">Cantidad (ml)</label>
            <input type="number" min={0.1} step={0.1} value={form.ml} onChange={e => set('ml', e.target.value)}
              className="admin-inventory__form-input" placeholder="Ej: 500" />
            {form.ml && <p className="admin-inventory__oz-hint">≈ {ozVal} oz</p>}
          </div>
          <div className="admin-inventory__form-group">
            <label className="admin-inventory__form-label">Motivo</label>
            <select value={form.reason} onChange={e => set('reason', e.target.value)} className="admin-inventory__form-select">
              {MOVEMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="admin-inventory__form-group">
            <label className="admin-inventory__form-label">Notas (opcional)</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className="admin-inventory__form-textarea" maxLength={300} placeholder="Detalles adicionales..." />
            <p className="admin-inventory__form-hint">{form.notes.length}/300</p>
          </div>
          {error && <div className="admin-inventory__form-error">{error}</div>}
          <button type="submit" disabled={busy} className="admin-inventory__form-submit">
            {busy && <div className="admin-inventory__spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />}
            Registrar {form.type === 'IN' ? 'Entrada' : 'Salida'}
          </button>
        </form>
      </div>
    </div>
  );
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'Loción', CREAM: 'Crema', SHAMPOO: 'Shampoo', MAKEUP: 'Maquillaje', SPLASH: 'Splash', ACCESSORY: 'Accesorio', ESSENCE_CATALOG: 'Esencia',
};

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [movementTarget, setMovementTarget] = useState<Essence | null>(null);

  const { data: essencesData, isLoading: loadingEssences, isError: isEssencesError } = useQuery({
    queryKey: ['essences-inventory'], queryFn: () => getEssences({ limit: 200 }), staleTime: 60_000,
  });
  const { data: productsData, isLoading: loadingProducts, isError: isProductsError } = useQuery({
    queryKey: ['products-inventory'], queryFn: () => adminGetProducts({ page: 1 }), staleTime: 60_000,
  });

  if (isEssencesError || isProductsError) return <AdminQueryError />;

  const rawEssences: Essence[] = essencesData?.data?.essences ?? essencesData?.data ?? [];
  const rawProducts: Product[] = productsData?.data?.products ?? productsData?.data ?? [];

  const q = search.toLowerCase();
  const filteredEssences = rawEssences.filter(e => !q || e.name.toLowerCase().includes(q) || e.olfactiveFamily?.name?.toLowerCase().includes(q));
  const filteredProducts = rawProducts.filter(p => p.productType !== 'ESSENCE_CATALOG')
    .filter(p => activeTab === 'ALL' || activeTab === 'ESSENCES' || p.productType === activeTab)
    .filter(p => !q || p.name.toLowerCase().includes(q));

  const showEssences = activeTab === 'ALL' || activeTab === 'ESSENCES';
  const showProducts = activeTab !== 'ESSENCES';
  const lowCount = rawEssences.filter(e => (e.currentStockMl ?? 0) < (e.minStockGrams ?? 30)).length;
  const lowStockProducts = rawProducts.filter(p => p.stockUnits <= 5 && p.productType !== 'ESSENCE_CATALOG').length;
  const isLoading = loadingEssences || loadingProducts;

  return (
    <div className="admin-inventory">
      <div className="admin-inventory__header">
        <div className="admin-inventory__header-info">
          <h1 className="admin-inventory__title">Inventario</h1>
          <p className="admin-inventory__subtitle">1 oz = {OZ_TO_ML} ml</p>
        </div>
        <div className="admin-inventory__alerts">
          {lowCount > 0 && <span className="admin-inventory__alert admin-inventory__alert--orange"><AlertTriangle size={12} />{lowCount} stock bajo</span>}
          {lowStockProducts > 0 && <span className="admin-inventory__alert admin-inventory__alert--red"><AlertTriangle size={12} />{lowStockProducts} prod. bajo</span>}
        </div>
      </div>

      {/* Filters */}
      {isLoading ? (
        <div className="admin-inventory__loading"><div className="admin-inventory__spinner" /></div>
      ) : (
        <div className="admin-inventory__filters">
          <div className="admin-inventory__tabs">
            {INVENTORY_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={clsx('admin-inventory__tab', activeTab === t.key && 'admin-inventory__tab--active')}>{t.label}</button>
            ))}
          </div>
          <div className="admin-inventory__search">
            <Search size={15} className="admin-inventory__search-icon" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre…"
              className="admin-inventory__search-input" />
          </div>
        </div>
      )}

      {/* Essences table */}
      {showEssences && !isLoading && (
        <div className="admin-inventory__table-card">
          <div className="admin-inventory__table-header admin-inventory__table-header--purple">
            <Package size={14} /><span className="admin-inventory__table-subtitle admin-inventory__table-subtitle--purple">Esencias (gramos/ml)</span>
          </div>
          <div className="admin-inventory__table-scroll">
            <table className="admin-inventory__table">
              <thead><tr>{['ESENCIA','FAMILIA','STOCK ACTUAL','EN OZ','MÍNIMO','ESTADO','ACC.'].map(h => <th key={h} className="admin-inventory__th">{h}</th>)}</tr></thead>
              <tbody className="admin-inventory__tbody">
                {filteredEssences.length === 0 ? (
                  <tr><td colSpan={7} className="admin-inventory__empty">No se encontraron esencias.</td></tr>
                ) : filteredEssences.map(e => {
                  const stockMl = e.currentStockMl ?? 0;
                  const minStock = e.minStockGrams ?? 30;
                  const isLow = stockMl < minStock;
                  return (
                    <tr key={e.id} className={clsx(isLow && 'admin-inventory__row--low')}>
                      <td className="admin-inventory__td"><span className="admin-inventory__td-name">{e.name}</span></td>
                      <td className="admin-inventory__td" style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>{e.olfactiveFamily?.name ?? '—'}</td>
                      <td className="admin-inventory__td"><span className={clsx('admin-inventory__td-stock', isLow && 'admin-inventory__td-stock--low')}>{stockMl.toFixed(1)}</span></td>
                      <td className="admin-inventory__td" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{(stockMl / OZ_TO_ML).toFixed(1)}</td>
                      <td className="admin-inventory__td" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{minStock}</td>
                      <td className="admin-inventory__td">
                        {isLow ? <span className="admin-inventory__status-low"><AlertTriangle size={10} /> BAJO</span>
                          : <span className="admin-inventory__status-ok">OK</span>}
                      </td>
                      <td className="admin-inventory__td">
                        <div className="admin-inventory__td-actions">
                          <button onClick={() => setMovementTarget(e)} className="admin-inventory__action-btn"><Plus size={12} /> Mov.</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products table */}
      {showProducts && !isLoading && filteredProducts.length > 0 && (
        <div className="admin-inventory__table-card">
          <div className="admin-inventory__table-header admin-inventory__table-header--blue">
            <Package size={14} /><span className="admin-inventory__table-subtitle admin-inventory__table-subtitle--blue">Productos (unidades)</span>
          </div>
          <div className="admin-inventory__table-scroll">
            <table className="admin-inventory__table">
              <thead><tr>{['PRODUCTO','TIPO','ESENCIA ASOC.','STOCK','ESTADO'].map(h => <th key={h} className="admin-inventory__th">{h}</th>)}</tr></thead>
              <tbody className="admin-inventory__tbody">
                {filteredProducts.map(p => {
                  const isLow = p.stockUnits <= 5;
                  return (
                    <tr key={p.id} className={clsx(isLow && 'admin-inventory__row--low')}>
                      <td className="admin-inventory__td"><span className="admin-inventory__td-name">{p.name}</span></td>
                      <td className="admin-inventory__td" style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>{PRODUCT_TYPE_LABELS[p.productType] ?? p.productType}</td>
                      <td className="admin-inventory__td" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{p.essence?.name ?? '—'}</td>
                      <td className="admin-inventory__td"><span className={clsx('admin-inventory__td-stock', isLow && 'admin-inventory__td-stock--low')}>{p.stockUnits}</span></td>
                      <td className="admin-inventory__td">
                        {isLow ? <span className="admin-inventory__status-low"><AlertTriangle size={10} /> BAJO</span>
                          : <span className="admin-inventory__status-ok">OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="admin-inventory__legend">1 oz = {OZ_TO_ML} ml</p>

      {movementTarget && <RegisterMovementModal essence={movementTarget} onClose={() => setMovementTarget(null)} />}
    </div>
  );
}
