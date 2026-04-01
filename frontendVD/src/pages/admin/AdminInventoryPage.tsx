/**
 * AdminInventoryPage.tsx — Inventory management for essences and products.
 *
 * Features:
 *  - Tab filter: Esencias / Lociones / Cremas / Shampoo / Maquillaje / Splash / Todos
 *  - Table of essences with current stock (ml / oz) and status (OK / LOW)
 *  - Table of products with stock units
 *  - Search filter
 *  - RegisterMovementModal to add IN/OUT movements per essence
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, AlertTriangle, CheckCircle2, Package } from 'lucide-react';

import { getEssences, registerEssenceMovement, adminGetProducts } from '../../services/api';
import type { Essence, Product } from '../../types';

const OZ_TO_ML = 29.5735;

const INVENTORY_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ESSENCES', label: 'Esencias' },
  { key: 'LOTION', label: 'Lociones' },
  { key: 'CREAM', label: 'Cremas' },
  { key: 'SHAMPOO', label: 'Shampoo' },
  { key: 'MAKEUP', label: 'Maquillaje' },
  { key: 'SPLASH', label: 'Splash' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Register Movement Modal
// ─────────────────────────────────────────────────────────────────────────────

const MOVEMENT_REASONS = [
  'Compra a proveedor',
  'Ajuste de inventario',
  'Merma / evaporación',
  'Devolución parcial',
  'Muestra al cliente',
  'Pérdida / daño',
  'Otro',
];

interface MovementForm {
  type:   'IN' | 'OUT';
  ml:     string;
  reason: string;
  notes:  string;
}

function RegisterMovementModal({
  essence,
  onClose,
  onSaved,
}: {
  essence: Essence;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm]   = useState<MovementForm>({ type: 'IN', ml: '', reason: MOVEMENT_REASONS[0], notes: '' });
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof MovementForm, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mlNum = parseFloat(form.ml);
    if (isNaN(mlNum) || mlNum <= 0) { setError('Ingresa una cantidad válida en ml.'); return; }
    setBusy(true);
    setError('');
    try {
      await registerEssenceMovement(essence.id, {
        type:   form.type,
        ml:     mlNum,
        reason: form.reason,
        notes:  form.notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al registrar el movimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-heading font-bold text-text-primary">Registrar Movimiento</h3>
            <p className="text-xs text-muted mt-0.5">{essence.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted hover:bg-gray-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* IN / OUT toggle */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5">Tipo de movimiento</label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(['IN', 'OUT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    form.type === t
                      ? t === 'IN'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-white text-muted hover:bg-gray-50'
                  }`}
                >
                  {t === 'IN' ? '▲ Entrada' : '▼ Salida'}
                </button>
              ))}
            </div>
          </div>

          {/* ml input */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="mv-ml">
              Cantidad (ml)
            </label>
            <div className="relative">
              <input
                id="mv-ml"
                type="number"
                min="0.1"
                step="0.1"
                value={form.ml}
                onChange={(e) => set('ml', e.target.value)}
                placeholder="Ej: 500"
                className="w-full pr-12 pl-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">ml</span>
            </div>
            {form.ml && !isNaN(parseFloat(form.ml)) && (
              <p className="text-[10px] text-muted mt-1">
                = {(parseFloat(form.ml) / OZ_TO_ML).toFixed(2)} oz
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="mv-reason">
              Motivo
            </label>
            <select
              id="mv-reason"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
            >
              {MOVEMENT_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="mv-notes">
              Notas (opcional)
            </label>
            <textarea
              id="mv-notes"
              rows={2}
              maxLength={300}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Detalles adicionales…"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-brand-pink text-white font-semibold text-sm rounded-xl hover:bg-brand-pink/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : null}
            {form.type === 'IN' ? 'Registrar Entrada' : 'Registrar Salida'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product type labels
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'Loción',
  CREAM: 'Crema',
  SHAMPOO: 'Shampoo',
  MAKEUP: 'Maquillaje',
  SPLASH: 'Splash',
  ACCESSORY: 'Accesorio',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedEssence, setSelectedEssence] = useState<Essence | null>(null);

  // Fetch essences
  const { data: essencesData, isLoading: loadingEssences } = useQuery({
    queryKey: ['essences-inventory'],
    queryFn: () => getEssences({ limit: 200 }),
    staleTime: 60_000,
  });

  // Fetch products
  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-inventory'],
    queryFn: () => adminGetProducts({ page: 1 }),
    staleTime: 60_000,
  });

  const rawEssences: Essence[] = essencesData?.data?.essences ?? essencesData?.data ?? [];
  const rawProducts: Product[] = productsData?.data?.products ?? productsData?.data ?? [];

  const isLoading = loadingEssences || loadingProducts;

  // Filter essences
  const filteredEssences = rawEssences.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.olfactiveFamily?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // Filter products by type tab and search
  const filteredProducts = rawProducts
    .filter((p) => p.productType !== 'ESSENCE_CATALOG')
    .filter((p) => {
      if (activeTab !== 'ALL' && activeTab !== 'ESSENCES') {
        return p.productType === activeTab;
      }
      return true;
    })
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );

  const showEssences = activeTab === 'ALL' || activeTab === 'ESSENCES';
  const showProducts = activeTab !== 'ESSENCES';

  const lowCount = rawEssences.filter(
    (e) => (e.currentStockMl ?? 0) < (e.minStockGrams ?? 0),
  ).length;

  const lowStockProducts = rawProducts.filter((p) => p.stockUnits <= 5 && p.productType !== 'ESSENCE_CATALOG').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Inventario</h1>
          <p className="text-xs text-muted mt-0.5">Stock de esencias y productos · 1 oz = {OZ_TO_ML} ml</p>
        </div>
        <div className="flex items-center gap-2">
          {lowCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl text-xs text-orange-700 font-medium">
              <AlertTriangle size={14} />
              {lowCount} esencia{lowCount !== 1 ? 's' : ''} stock bajo
            </div>
          )}
          {lowStockProducts > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-xs text-red-700 font-medium">
              <AlertTriangle size={14} />
              {lowStockProducts} producto{lowStockProducts !== 1 ? 's' : ''} stock bajo
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {INVENTORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-pink text-white shadow-sm'
                  : 'bg-gray-100 text-muted hover:text-text-primary hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          />
        </div>
      </div>

      {/* Essences Table */}
      {showEssences && (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-purple-50/50">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Package size={14} className="text-brand-pink" />
              Esencias (gramos/ml)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  {['ESENCIA', 'FAMILIA', 'STOCK ACTUAL', 'STOCK EN OZ', 'MÍNIMO', 'ESTADO', 'ACCIÓN'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="inline-block w-6 h-6 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : filteredEssences.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">
                      No se encontraron esencias.
                    </td>
                  </tr>
                ) : (
                  filteredEssences.map((essence) => {
                    const stockMl  = essence.currentStockMl ?? 0;
                    const minStock = essence.minStockGrams  ?? 0;
                    const stockOz  = (stockMl / OZ_TO_ML).toFixed(1);
                    const isLow    = stockMl < minStock;

                    return (
                      <tr key={essence.id} className={`transition-colors ${isLow ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
                              <span className="text-brand-pink font-bold text-[10px]">
                                {essence.name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-text-primary">{essence.name}</p>
                              {essence.house && <p className="text-muted text-[10px]">@{essence.house.handle}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-muted">
                          {essence.olfactiveFamily?.name ?? '—'}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`font-bold ${isLow ? 'text-red-500' : 'text-text-primary'}`}>
                            {stockMl.toLocaleString('es-CO')} ml
                          </span>
                        </td>

                        <td className="px-4 py-3 text-muted">{stockOz} oz</td>

                        <td className="px-4 py-3 text-muted">
                          {minStock > 0 ? `${minStock.toLocaleString('es-CO')} ml` : '—'}
                        </td>

                        <td className="px-4 py-3">
                          {isLow ? (
                            <div className="flex items-center gap-1.5 text-red-500 font-semibold">
                              <AlertTriangle size={12} />
                              BAJO
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                              <CheckCircle2 size={12} />
                              OK
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedEssence(essence)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-brand-pink text-white text-[11px] font-semibold rounded-lg hover:bg-brand-pink/90 transition-colors"
                          >
                            <Plus size={11} />
                            Movimiento
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Table */}
      {showProducts && filteredProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-blue-50/50">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Package size={14} className="text-brand-blue" />
              Productos (unidades)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  {['PRODUCTO', 'TIPO', 'ESENCIA ASOCIADA', 'STOCK', 'ESTADO'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
                  const isLow = product.stockUnits <= 5;
                  return (
                    <tr key={product.id} className={`transition-colors ${isLow ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <span className="text-brand-blue font-bold text-[10px]">
                              {product.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{product.name}</p>
                            {product.description && <p className="text-muted text-[10px] truncate max-w-40">{product.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-text-primary font-medium text-[10px]">
                          {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {product.essence ? (
                          <span className="text-[10px]">{product.essence.name} {product.mlQuantity ? `(${product.mlQuantity} ml)` : ''}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${isLow ? 'text-red-500' : 'text-text-primary'}`}>
                          {product.stockUnits} uds
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <div className="flex items-center gap-1.5 text-red-500 font-semibold">
                            <AlertTriangle size={12} />
                            BAJO
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-green-600 font-semibold">
                            <CheckCircle2 size={12} />
                            OK
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <p className="text-[11px] text-muted text-right">
        * El stock mínimo de esencias se configura en la sección de Esencias. Productos con ≤5 uds se marcan como bajo.
      </p>

      {/* Essence Movement Modal */}
      {selectedEssence && (
        <RegisterMovementModal
          essence={selectedEssence}
          onClose={() => setSelectedEssence(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['essences-inventory'] });
            queryClient.invalidateQueries({ queryKey: ['products-inventory'] });
          }}
        />
      )}
    </div>
  );
}
