/**
 * AdminProductsPage — Full CRUD for products.
 *
 * Sections:
 *  1. Header with "Nuevo Producto" button
 *  2. Filter bar: product type + active/inactive toggle
 *  3. Products data table
 *  4. CreateProductModal / EditProductModal (shared form)
 *  5. AddStockModal
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Pencil,
  PackagePlus,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
} from 'lucide-react';

import {
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProduct,
  adminAddProductStock,
} from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { Product } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_TYPES: Record<string, string> = {
  ALL:             'Todos',
  LOTION:          'Lociones',
  CREAM:           'Cremas',
  SHAMPOO:         'Shampoo',
  MAKEUP:          'Maquillaje',
  SPLASH:          'Splash',
  ACCESSORY:       'Accesorios',
  ESSENCE_CATALOG: 'Esencias',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared modal backdrop
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product form (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

type ProductFormData = {
  name: string;
  description: string;
  productType: string;
  price: string;
  stockUnits: string;
  generatesGram: boolean;
};

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  productType: 'LOTION',
  price: '',
  stockUnits: '',
  generatesGram: true,
};

function ProductForm({
  initial,
  onSubmit,
  loading,
  submitLabel,
}: {
  initial: ProductFormData;
  onSubmit: (d: ProductFormData) => void;
  loading: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const set = (k: keyof ProductFormData, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Nombre</label>
        <input
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Descripción</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 resize-none"
        />
      </div>

      {/* Type + Price row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Tipo</label>
          <select
            value={form.productType}
            onChange={(e) => set('productType', e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          >
            {Object.entries(PRODUCT_TYPES)
              .filter(([k]) => k !== 'ALL')
              .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Precio (COP)</label>
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
        </div>
      </div>

      {/* Stock + Gram toggle row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Stock (unidades)</label>
          <input
            required
            type="number"
            min={0}
            value={form.stockUnits}
            onChange={(e) => set('stockUnits', e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.generatesGram}
              onChange={(e) => set('generatesGram', e.target.checked)}
              className="w-4 h-4 rounded border-border text-brand-pink focus:ring-brand-pink"
            />
            <span className="text-xs font-medium text-text-primary">Genera 1g</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Stock Modal
// ─────────────────────────────────────────────────────────────────────────────

function AddStockModal({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const [qty, setQty]       = useState('');
  const [notes, setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product || !qty) return;
    setLoading(true);
    try {
      await adminAddProductStock(product.id, Number(qty), notes || undefined);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setQty('');
      setNotes('');
      onClose();
    } catch {
      alert('Error al agregar stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agregar stock — ${product?.name ?? ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Cantidad</label>
          <input
            required
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-primary mb-1">Notas (opcional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Agregar stock
        </button>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  // Modals
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [saving, setSaving]           = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-products', typeFilter, activeFilter, page],
    queryFn: () =>
      adminGetProducts({
        page,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
    staleTime: 30_000,
  });

  const products: Product[] = res?.data?.products ?? res?.data ?? [];
  const totalPages: number  = res?.data?.totalPages ?? 1;

  // Filter client-side by name search
  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  // ── Create ──
  const handleCreate = async (form: ProductFormData) => {
    setSaving(true);
    try {
      await adminCreateProduct({
        name: form.name,
        description: form.description || undefined,
        productType: form.productType,
        price: Number(form.price),
        stockUnits: Number(form.stockUnits),
        generatesGram: form.generatesGram,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setCreateOpen(false);
    } catch {
      alert('Error al crear producto.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const handleEdit = async (form: ProductFormData) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminUpdateProduct(editTarget.id, {
        name: form.name,
        description: form.description || undefined,
        productType: form.productType as Product['productType'],
        price: Number(form.price),
        stockUnits: Number(form.stockUnits),
        generatesGram: form.generatesGram,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditTarget(null);
    } catch {
      alert('Error al actualizar producto.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──
  const handleToggle = async (p: Product) => {
    if (!window.confirm(`¿${p.active ? 'Desactivar' : 'Activar'} "${p.name}"?`)) return;
    try {
      await adminToggleProduct(p.id);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch {
      alert('Error al cambiar estado.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl text-text-primary">Productos</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-pink text-white text-sm font-semibold hover:bg-brand-pink/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Producto
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
        >
          {Object.entries(PRODUCT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Active filter */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeFilter === f
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-muted hover:text-text-primary'
              }`}
            >
              {{ all: 'Todos', active: 'Activos', inactive: 'Inactivos' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['PRODUCTO', 'TIPO', 'PRECIO', 'STOCK', 'GRAMO', 'ESTADO', 'ACCIONES'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-muted text-[10px] font-bold">{p.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate max-w-48">{p.name}</p>
                          {p.description && (
                            <p className="text-muted truncate max-w-48 text-[10px]">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-text-primary font-medium text-[10px]">
                        {PRODUCT_TYPES[p.productType] ?? p.productType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-primary">{formatCOP(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p.stockUnits <= 5 ? 'text-red-500' : 'text-text-primary'}`}>
                        {p.stockUnits}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.generatesGram ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold text-[10px]">+1g</span>
                      ) : (
                        <span className="text-muted text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        p.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'
                      }`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setEditTarget(p)
                          }
                          className="p-1.5 text-muted hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setStockTarget(p)}
                          className="p-1.5 text-muted hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                          title="Agregar stock"
                        >
                          <PackagePlus size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(p)}
                          className="p-1.5 text-muted hover:text-brand-pink rounded-lg hover:bg-brand-pink/10 transition-colors"
                          title={p.active ? 'Desactivar' : 'Activar'}
                        >
                          {p.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Producto">
        <ProductForm initial={EMPTY_FORM} onSubmit={handleCreate} loading={saving} submitLabel="Crear producto" />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Producto">
        {editTarget && (
          <ProductForm
            initial={{
              name: editTarget.name,
              description: editTarget.description ?? '',
              productType: editTarget.productType,
              price: String(editTarget.price),
              stockUnits: String(editTarget.stockUnits),
              generatesGram: editTarget.generatesGram,
            }}
            onSubmit={handleEdit}
            loading={saving}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>

      {/* Add stock modal */}
      <AddStockModal
        product={stockTarget}
        open={!!stockTarget}
        onClose={() => setStockTarget(null)}
      />
    </div>
  );
}
