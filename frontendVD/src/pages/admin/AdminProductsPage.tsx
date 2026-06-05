/**
 * AdminProductsPage — Full CRUD for products.
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
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import clsx from 'clsx';

import {
  adminGetProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProduct,
  adminAddProductStock,
  adminDeleteProduct,
  uploadImage,
} from '../../services/api';
import { formatCOP } from '../../utils/format';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import { useToastStore } from '../../stores/toastStore';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import type { Product } from '../../types';
import '../../css/AdminProductsPage.css';

const PRODUCT_TYPES: Record<string, string> = {
  ALL:             'Todos',
  LOTION:          'Lociones',
  CREAM:           'Cremas',
  SHAMPOO:         'Shampoo',
  MAKEUP:          'Maquillaje',
  SPLASH:          'Splash',
  ACCESSORY:       'Accesorios',
};

// ── Modal ──────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="admin-products__modal-overlay">
      <div className="admin-products__modal-backdrop" onClick={onClose} />
      <div className="admin-products__modal-body">
        <div className="admin-products__modal-header">
          <h2 className="admin-products__modal-title">{title}</h2>
          <button onClick={onClose} className="admin-products__modal-close">
            <X size={18} />
          </button>
        </div>
        <div className="admin-products__modal-content">{children}</div>
      </div>
    </div>
  );
}

// ── Product Form ───────────────────────────────────────────────────────────

type ProductFormData = {
  name: string;
  description: string;
  productType: string;
  price: string;
  stockUnits: string;
  photoUrl: string;
};

const EMPTY_FORM: ProductFormData = {
  name: '', description: '', productType: 'LOTION',
  price: '', stockUnits: '', photoUrl: '',
};

function ProductForm({
  initial, onSubmit, loading, submitLabel,
}: {
  initial: ProductFormData;
  onSubmit: (d: ProductFormData) => void;
  loading: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('url');
  const [photoUploading, setPhotoUploading] = useState(false);
  const set = (k: keyof ProductFormData, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="admin-products__form">
      <div className="admin-products__form-group">
        <label className="admin-products__form-label">Nombre</label>
        <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="admin-products__form-input" />
      </div>
      <div className="admin-products__form-group">
        <label className="admin-products__form-label">Descripcion</label>
        <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className="admin-products__form-textarea" />
      </div>
      <div className="admin-products__form-row">
        <div className="admin-products__form-group">
          <label className="admin-products__form-label">Tipo</label>
          <select value={form.productType} onChange={(e) => set('productType', e.target.value)} className="admin-products__form-select">
            {Object.entries(PRODUCT_TYPES).filter(([k]) => k !== 'ALL').map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-products__form-group">
          <label className="admin-products__form-label">Precio (COP)</label>
          <input required type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} className="admin-products__form-input" />
        </div>
      </div>
      <div className="admin-products__form-group">
        <label className="admin-products__form-label">Stock (unidades)</label>
        <input required type="number" min={0} value={form.stockUnits} onChange={(e) => set('stockUnits', e.target.value)} className="admin-products__form-input" />
      </div>

      <div className="admin-products__field-group" style={{ gridColumn: '1 / -1' }}>
        <label className="admin-products__label">Foto</label>

        <div className="admin-products__photo-toggle">
          <button type="button" onClick={() => setPhotoMode('upload')}
            className={photoMode === 'upload' ? 'admin-products__photo-toggle-btn admin-products__photo-toggle-btn--active' : 'admin-products__photo-toggle-btn'}>
            Subir archivo
          </button>
          <button type="button" onClick={() => setPhotoMode('url')}
            className={photoMode === 'url' ? 'admin-products__photo-toggle-btn admin-products__photo-toggle-btn--active' : 'admin-products__photo-toggle-btn'}>
            Pegar URL
          </button>
        </div>

        {photoMode === 'upload' ? (
          <div className="admin-products__photo-upload">
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setPhotoUploading(true);
              try {
                const res = await uploadImage(file);
                const url = res.data?.url as string | undefined;
                if (url) setForm((f: any) => ({ ...f, photoUrl: url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}${url}` }));
              } catch { alert('Error al subir la imagen'); }
              finally { setPhotoUploading(false); }
            }} />
            {photoUploading && <span className="admin-products__photo-uploading">Subiendo...</span>}
          </div>
        ) : (
          <input type="url" value={form.photoUrl}
            onChange={(e) => {
              let val = e.target.value;
              const driveMatch = val.match(/drive\.google\.com\/file\/d\/([^/]+)/);
              if (driveMatch) val = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
              setForm((f: any) => ({ ...f, photoUrl: val }));
            }}
            placeholder="https://drive.google.com/file/d/... o URL externa"
            className="admin-products__input" />
        )}

        {form.photoUrl && (
          <img src={form.photoUrl} alt="Preview" className="admin-products__photo-preview" />
        )}
      </div>

      <button type="submit" disabled={loading} className="admin-products__form-submit">
        {loading && <Loader2 size={14} className="admin-products__spinner" />}
        {submitLabel}
      </button>
    </form>
  );
}

// ── Add Stock Modal ────────────────────────────────────────────────────────

function AddStockModal({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product || !qty) return;
    setLoading(true);
    try {
      await adminAddProductStock(product.id, Number(qty), notes || undefined);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setQty(''); setNotes(''); onClose();
    } catch {
      addToast('Error al agregar stock.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agregar stock — ${product?.name ?? ''}`}>
      <form onSubmit={handleSubmit} className="admin-products__form">
        <div className="admin-products__form-group">
          <label className="admin-products__form-label">Cantidad</label>
          <input required type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="admin-products__form-input" />
        </div>
        <div className="admin-products__form-group">
          <label className="admin-products__form-label">Notas (opcional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="admin-products__form-input" />
        </div>
        <button type="submit" disabled={loading} className="admin-products__form-submit">
          {loading && <Loader2 size={14} className="admin-products__spinner" />}
          Agregar stock
        </button>
      </form>
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-products', typeFilter, activeFilter, page],
    queryFn: () => adminGetProducts({ page, type: typeFilter === 'ALL' ? undefined : typeFilter, active: activeFilter === 'all' ? undefined : activeFilter === 'active' }),
    staleTime: 30_000,
  });

  const products: Product[] = res?.data?.products ?? res?.data ?? [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const handleCreate = async (form: ProductFormData) => {
    setSaving(true);
    try {
      await adminCreateProduct({
        name: form.name, description: form.description || undefined,
        productType: form.productType, price: Number(form.price),
        stockUnits: Number(form.stockUnits),
        photoUrl: form.photoUrl || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setCreateOpen(false);
    } catch { addToast('Error al crear producto.', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form: ProductFormData) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminUpdateProduct(editTarget.id, {
        name: form.name, description: form.description || undefined,
        productType: form.productType as Product['productType'], price: Number(form.price),
        stockUnits: Number(form.stockUnits),
        photoUrl: form.photoUrl || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditTarget(null);
    } catch { addToast('Error al actualizar producto.', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    const p = toggleTarget;
    setToggleTarget(null);
    try { await adminToggleProduct(p.id); queryClient.invalidateQueries({ queryKey: ['admin-products'] }); }
    catch { addToast('Error al cambiar estado.', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deletePassword) return;
    setDeleting(true); setDeleteError('');
    try {
      await adminDeleteProduct(deleteTarget.id, deletePassword);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteTarget(null); setDeletePassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(msg ?? 'Error al eliminar producto.');
    } finally { setDeleting(false); }
  };

  if (isError) return <AdminQueryError />;

  if (isLoading) {
    return (
      <div className="admin-products__loading">
        <div className="admin-products__spinner" />
      </div>
    );
  }

  return (
    <div className="admin-products">

      {/* Header */}
      <div className="admin-products__header">
        <h1 className="admin-products__title">Productos</h1>
        <button onClick={() => setCreateOpen(true)} className="admin-products__create-btn">
          <Plus size={16} /> Nuevo Producto
        </button>
      </div>

      {/* Filter bar */}
      <div className="admin-products__filters">
        <div className="admin-products__search">
          <Search size={15} className="admin-products__search-icon" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…" className="admin-products__search-input"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="admin-products__select"
        >
          {Object.entries(PRODUCT_TYPES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        <div className="admin-products__toggle-group">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setPage(1); }}
              className={clsx('admin-products__toggle-btn', activeFilter === f && 'admin-products__toggle-btn--active')}
            >
              {{ all: 'Todos', active: 'Activos', inactive: 'Inactivos' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div className="admin-products__table-card">
        <div className="admin-products__table-scroll">
          <table className="admin-products__table">
            <thead>
              <tr>
                {['PRODUCTO', 'TIPO', 'PRECIO', 'STOCK', 'ESTADO', 'ACCIONES'].map((h) => (
                  <th key={h} className="admin-products__th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="admin-products__tbody">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="admin-products__empty">No se encontraron productos.</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="admin-products__td">
                      <div className="admin-products__td-info">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="admin-products__thumb" />
                        ) : (
                          <div className="admin-products__thumb-placeholder"><span>{p.name.charAt(0)}</span></div>
                        )}
                        <div className="admin-products__td-info-text">
                          <p className="admin-products__td-name">{p.name}</p>
                          {p.description && <p className="admin-products__td-desc">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="admin-products__td">
                      <span className="admin-products__td-type-badge">{PRODUCT_TYPES[p.productType] ?? p.productType}</span>
                    </td>
                    <td className="admin-products__td admin-products__td-price">{formatCOP(p.price)}</td>
                    <td className="admin-products__td">
                      <span className={clsx('admin-products__td-stock', p.stockUnits <= 5 && 'admin-products__td-stock--low')}>{p.stockUnits}</span>
                    </td>
                    <td className="admin-products__td">
                      <span className={clsx('admin-products__td-status', p.active ? 'admin-products__td-status--active' : 'admin-products__td-status--inactive')}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="admin-products__td">
                      <div className="admin-products__td-actions">
                        <button onClick={() => setEditTarget(p)} className="admin-products__action-btn admin-products__action-btn--blue" title="Editar"><Pencil size={13} /></button>
                        <button onClick={() => setStockTarget(p)} className="admin-products__action-btn admin-products__action-btn--green" title="Agregar stock"><PackagePlus size={13} /></button>
                        <button onClick={() => setToggleTarget(p)} className="admin-products__action-btn admin-products__action-btn--pink" title={p.active ? 'Desactivar' : 'Activar'}>
                          {p.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </button>
                        <button onClick={() => { setDeleteTarget(p); setDeletePassword(''); setDeleteError(''); }} className="admin-products__action-btn admin-products__action-btn--red" title="Eliminar"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-products__pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="admin-products__page-btn">Anterior</button>
            <span className="admin-products__page-info">Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="admin-products__page-btn">Siguiente</button>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Producto">
        <ProductForm initial={EMPTY_FORM} onSubmit={handleCreate} loading={saving} submitLabel="Crear producto" />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar Producto">
        {editTarget && (
          <ProductForm
            initial={{
              name: editTarget.name, description: editTarget.description ?? '',
              productType: editTarget.productType, price: String(editTarget.price),
              stockUnits: String(editTarget.stockUnits),
              photoUrl: editTarget.photoUrl || '',
            }}
            onSubmit={handleEdit} loading={saving} submitLabel="Guardar cambios"
          />
        )}
      </Modal>

      <AddStockModal product={stockTarget} open={!!stockTarget} onClose={() => setStockTarget(null)} />

      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }} title="Eliminar Producto">
        {deleteTarget && (
          <div className="admin-products__form">
            <div className="admin-products__delete-warning">
              <p className="admin-products__delete-warning-title">¿Estás seguro de eliminar "{deleteTarget.name}"?</p>
              <p className="admin-products__delete-warning-text">Esta acción es irreversible. Se eliminará el producto y todos sus movimientos asociados.</p>
            </div>
            <div className="admin-products__form-group">
              <label className="admin-products__form-label">Contraseña del administrador</label>
              <div className="admin-products__delete-password-wrap">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Ingresa tu contraseña para confirmar"
                  className="admin-products__delete-password-input"
                />
                <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="admin-products__delete-password-toggle" tabIndex={-1}>
                  {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {deleteError && <p className="admin-products__delete-error">{deleteError}</p>}
            <div className="admin-products__delete-actions">
              <button onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }} className="admin-products__delete-cancel">Cancelar</button>
              <button onClick={handleDelete} disabled={!deletePassword || deleting} className="admin-products__delete-confirm">
                {deleting && <Loader2 size={14} className="admin-products__spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />}
                Eliminar permanentemente
              </button>
            </div>
          </div>
        )}
      </Modal>

      <AdminConfirmDialog
        open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleToggleConfirm}
        title={toggleTarget?.active ? "Desactivar producto" : "Activar producto"}
        message={`¿${toggleTarget?.active ? "Desactivar" : "Activar"} "${toggleTarget?.name ?? ""}"?`}
        confirmLabel={toggleTarget?.active ? "Desactivar" : "Activar"} variant="warning"
      />
    </div>
  );
}
