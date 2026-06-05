import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Plus, Minus, X, Loader2, Package, Pencil, ToggleLeft, ToggleRight, Tag, Home, Trash2, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import AdminConfirmDialog from '../../components/admin/AdminConfirmDialog';
import { useToastStore } from '../../stores/toastStore';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import {
  getEssences, getOlfactiveFamilies, getHouses, createEssence, updateEssence,
  createHouse, createOlfactiveFamily, registerEssenceMovement, getLowStockAlerts, adminDeleteEssence,
  uploadImage,
} from '../../services/api';
import type { Essence, OlfactiveFamily, House } from '../../types';
import '../../css/AdminEssencesPage.css';

const OZ_TO_ML = 29.5735;

// ─── Movement Modal ──────────────────────────────────────────────────────────

function MovementModal({ essence, onClose }: { essence: Essence; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [ml, setMl] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useMutation({
    mutationFn: () => registerEssenceMovement(essence.id, { type, ml: parseFloat(ml), reason: reason || (type === 'IN' ? 'PURCHASE' : 'SALE'), notes: notes || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-essences'] }); queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] }); onClose(); },
  });
  const canSubmit = parseFloat(ml) > 0 && !mutation.isPending;

  return (
    <div className="admin-essences__modal-overlay">
      <div className="admin-essences__modal-backdrop" onClick={onClose} />
      <div className="admin-essences__modal-body">
        <div className="admin-essences__modal-header">
          <h2 className="admin-essences__modal-title">Movimiento de Inventario</h2>
          <button onClick={onClose} className="admin-essences__modal-close"><X size={18} /></button>
        </div>
        <div className="admin-essences__modal-content">
          <div className="admin-essences__form" style={{ gap: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{essence.name}</p>
            <div className="admin-essences__toggle-group">
              {(['IN', 'OUT'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={clsx('admin-essences__toggle-btn', `admin-essences__toggle-btn--${t === 'IN' ? 'in' : 'out'}`, type === t && 'admin-essences__toggle-btn--active')}>
                  {t === 'IN' ? <><Plus size={14} /> Entrada (gramos)</> : <><Minus size={14} /> Salida (gramos)</>}
                </button>
              ))}
            </div>
            <div className="admin-essences__form-group">
              <label className="admin-essences__form-label">Cantidad (gramos)</label>
              <input type="number" min={0.1} step={0.1} value={ml} onChange={e => setMl(e.target.value)} className="admin-essences__form-input" placeholder="Ej: 500" />
            </div>
            <div className="admin-essences__form-group">
              <label className="admin-essences__form-label">Razón</label>
              <select value={reason} onChange={e => setReason(e.target.value)} className="admin-essences__form-select">
                {type === 'IN' ? (['PURCHASE','RETURN','ADJUSTMENT'].map(o => <option key={o} value={o}>{o === 'PURCHASE' ? 'Compra a proveedor' : o === 'RETURN' ? 'Devolución' : 'Ajuste manual'}</option>))
                  : (['SALE','ADJUSTMENT'].map(o => <option key={o} value={o}>{o === 'SALE' ? 'Venta' : 'Ajuste manual'}</option>))}
              </select>
            </div>
            <div className="admin-essences__form-group">
              <label className="admin-essences__form-label">Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="admin-essences__form-input" placeholder="Detalles adicionales..." />
            </div>
            {mutation.isError && <p className="admin-essences__form-error">Error al registrar movimiento.</p>}
            <button disabled={!canSubmit} onClick={() => mutation.mutate()} className="admin-essences__form-submit">
              {mutation.isPending && <div className="admin-essences__spinner" style={{ width: '1rem', height: '1rem' }} />} Registrar Movimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Essence Form Modal (create / edit) ──────────────────────────────────────

type EssenceFormData = { name: string; description: string; olfactiveFamilyId: string; inspirationBrand: string; houseId: string; tagIds: string[]; photoUrl: string; };
const EMPTY_FORM: EssenceFormData = { name: '', description: '', olfactiveFamilyId: '', inspirationBrand: '', houseId: '', tagIds: [], photoUrl: '' };

function EssenceFormModal({ initial, open, onClose, onSubmit, loading, title, submitLabel, families, houses, onCreateFamily, onCreateHouse }: {
  initial: EssenceFormData; open: boolean; onClose: () => void; onSubmit: (d: EssenceFormData) => void;
  loading: boolean; title: string; submitLabel: string; families: OlfactiveFamily[]; houses: House[];
  onCreateFamily: (name: string) => Promise<void>; onCreateHouse: (name: string, handle: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EssenceFormData>(initial);
  const [photoMode, setPhotoMode] = useState<'upload' | 'url'>('url');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState(''); const [showNewFamily, setShowNewFamily] = useState(false);
  const [newHouseName, setNewHouseName] = useState(''); const [newHouseHandle, setNewHouseHandle] = useState(''); const [showNewHouse, setShowNewHouse] = useState(false);
  if (!open) return null;
  const set = (k: keyof EssenceFormData, v: string | string[]) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleTag = (familyId: string) => setForm(prev => ({ ...prev, tagIds: prev.tagIds.includes(familyId) ? prev.tagIds.filter(id => id !== familyId) : [...prev.tagIds, familyId] }));

  return (
    <div className="admin-essences__modal-overlay">
      <div className="admin-essences__modal-backdrop" onClick={onClose} />
      <div className="admin-essences__modal-body">
        <div className="admin-essences__modal-header">
          <h2 className="admin-essences__modal-title">{title}</h2>
          <button onClick={onClose} className="admin-essences__modal-close"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="admin-essences__form admin-essences__modal-content" style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label">Nombre *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className="admin-essences__form-input" placeholder="Ej: 212 VIP" />
          </div>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label">Descripción</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} className="admin-essences__form-textarea" placeholder="Notas del aroma..." />
          </div>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label">Familia olfativa principal *</label>
            <div className="admin-essences__form-select-row">
              <select required value={form.olfactiveFamilyId} onChange={e => set('olfactiveFamilyId', e.target.value)} className="admin-essences__form-select">
                <option value="">Seleccionar...</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewFamily(!showNewFamily)} className="admin-essences__create-toggle"><Plus size={14} /></button>
            </div>
            {showNewFamily && (
              <div className="admin-essences__inline-create">
                <input value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} placeholder="Nueva familia..." className="admin-essences__inline-create-input" />
                <button type="button" onClick={async () => { if (newFamilyName.trim()) { await onCreateFamily(newFamilyName.trim()); setNewFamilyName(''); setShowNewFamily(false); } }} className="admin-essences__inline-create-btn">Crear</button>
              </div>
            )}
          </div>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label"><Tag size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />Etiquetas aromáticas</label>
            <p className="admin-essences__form-hint">Selecciona familias olfativas adicionales como etiquetas</p>
            <div className="admin-essences__tag-pills" style={{ marginTop: '0.5rem' }}>
              {families.map(f => (
                <button key={f.id} type="button" onClick={() => toggleTag(f.id)}
                  className={clsx('admin-essences__tag-pill', form.tagIds.includes(f.id) && 'admin-essences__tag-pill--active')}>
                  #{f.name.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label"><Home size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />Casa / Marca</label>
            <div className="admin-essences__form-select-row">
              <select value={form.houseId} onChange={e => set('houseId', e.target.value)} className="admin-essences__form-select">
                <option value="">Sin casa</option>
                {houses.map(h => <option key={h.id} value={h.id}>{h.name} (@{h.handle})</option>)}
              </select>
              <button type="button" onClick={() => setShowNewHouse(!showNewHouse)} className="admin-essences__create-toggle"><Plus size={14} /></button>
            </div>
            {showNewHouse && (
              <div className="admin-essences__inline-create">
                <input value={newHouseName} onChange={e => { setNewHouseName(e.target.value); setNewHouseHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); }} placeholder="Nombre (ej: Carolina Herrera)" className="admin-essences__inline-create-input" />
                <span className="admin-essences__inline-create-handle">@{newHouseHandle || '...'}</span>
                <button type="button" onClick={async () => { if (newHouseName.trim() && newHouseHandle.trim()) { await onCreateHouse(newHouseName.trim(), newHouseHandle.trim()); setNewHouseName(''); setNewHouseHandle(''); setShowNewHouse(false); } }} className="admin-essences__inline-create-btn">Crear</button>
              </div>
            )}
          </div>
          <div className="admin-essences__form-group">
            <label className="admin-essences__form-label">Inspiración</label>
            <input value={form.inspirationBrand} onChange={e => set('inspirationBrand', e.target.value)} className="admin-essences__form-input" placeholder="Ej: Chanel Nº5" />
          </div>

          {/* ── Photo URL ────────────────────────────── */}
          <div className="admin-essences__field-group" style={{ gridColumn: '1 / -1' }}>
            <label className="admin-essences__label">Foto</label>

            <div className="admin-essences__photo-toggle">
              <button type="button" onClick={() => setPhotoMode('upload')}
                className={photoMode === 'upload' ? 'admin-essences__photo-toggle-btn admin-essences__photo-toggle-btn--active' : 'admin-essences__photo-toggle-btn'}>
                Subir archivo
              </button>
              <button type="button" onClick={() => setPhotoMode('url')}
                className={photoMode === 'url' ? 'admin-essences__photo-toggle-btn admin-essences__photo-toggle-btn--active' : 'admin-essences__photo-toggle-btn'}>
                Pegar URL
              </button>
            </div>

            {photoMode === 'upload' ? (
              <div className="admin-essences__photo-upload">
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
                {photoUploading && <span className="admin-essences__photo-uploading">Subiendo...</span>}
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
                className="admin-essences__input" />
            )}

            {form.photoUrl && (
              <img src={form.photoUrl} alt="Preview" className="admin-essences__photo-preview" />
            )}
          </div>
          <button type="submit" disabled={loading || !form.name || !form.olfactiveFamilyId} className="admin-essences__form-submit">
            {loading && <div className="admin-essences__spinner" style={{ width: '1rem', height: '1rem' }} />} {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminEssencesPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Essence | null>(null);
  const [movementTarget, setMovementTarget] = useState<Essence | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Essence | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Essence | null>(null);

  const { data: essencesRes, isLoading, isError } = useQuery({ queryKey: ['admin-essences'], queryFn: () => getEssences(), staleTime: 30_000 });
  const { data: lowStockRes, isError: isLowStockError } = useQuery({ queryKey: ['admin-low-stock'], queryFn: () => getLowStockAlerts(), staleTime: 5 * 60_000 });
  const { data: familiesRes, isError: isFamiliesError } = useQuery({ queryKey: ['olfactive-families'], queryFn: () => getOlfactiveFamilies(), staleTime: 60_000 });
  const { data: housesRes, isError: isHousesError } = useQuery({ queryKey: ['houses'], queryFn: () => getHouses(), staleTime: 60_000 });

  if (isError || isLowStockError || isFamiliesError || isHousesError) return <AdminQueryError />;

  const essences: Essence[] = essencesRes?.data?.essences ?? essencesRes?.data ?? [];
  const lowStock: { name: string; stockMl: number }[] = lowStockRes?.data?.essences ?? lowStockRes?.data ?? [];
  const families: OlfactiveFamily[] = familiesRes?.data ?? [];
  const houses: House[] = housesRes?.data ?? [];

  const q = search.toLowerCase();
  const filtered = q ? essences.filter(e => e.name.toLowerCase().includes(q) || e.olfactiveFamily?.name?.toLowerCase().includes(q) || (e.house?.name?.toLowerCase().includes(q)) || (e.house?.handle?.toLowerCase().includes(q))) : essences;

  const handleCreate = async (form: EssenceFormData) => { setSaving(true); try { await createEssence({ name: form.name, description: form.description || undefined, olfactiveFamilyId: form.olfactiveFamilyId, inspirationBrand: form.inspirationBrand || undefined, houseId: form.houseId || undefined, photoUrl: form.photoUrl || undefined, tagIds: form.tagIds.length > 0 ? form.tagIds : undefined }); queryClient.invalidateQueries({ queryKey: ['admin-essences'] }); setCreateOpen(false); } catch { addToast('Error al crear esencia.', 'error'); } finally { setSaving(false); } };
  const handleEdit = async (form: EssenceFormData) => { if (!editTarget) return; setSaving(true); try { await updateEssence(editTarget.id, { name: form.name, description: form.description || undefined, olfactiveFamilyId: form.olfactiveFamilyId, inspirationBrand: form.inspirationBrand || undefined, houseId: form.houseId || undefined, photoUrl: form.photoUrl || undefined, tagIds: form.tagIds }); queryClient.invalidateQueries({ queryKey: ['admin-essences'] }); setEditTarget(null); } catch { addToast('Error al actualizar esencia.', 'error'); } finally { setSaving(false); } };
  const handleToggle = async () => { if (!toggleTarget) return; const e = toggleTarget; setToggleTarget(null); const newActive = e.active === false ? true : (e.isActive === false ? true : false); try { await updateEssence(e.id, { active: newActive }); queryClient.invalidateQueries({ queryKey: ['admin-essences'] }); } catch { addToast('Error al cambiar estado.', 'error'); } };
  const handleDelete = async () => { if (!deleteTarget || !deletePassword) return; setDeleting(true); setDeleteError(''); try { await adminDeleteEssence(deleteTarget.id, deletePassword); queryClient.invalidateQueries({ queryKey: ['admin-essences'] }); queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] }); setDeleteTarget(null); setDeletePassword(''); } catch (err: unknown) { const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message; setDeleteError(msg ?? 'Error al eliminar esencia.'); } finally { setDeleting(false); } };
  const handleCreateFamily = async (name: string) => { try { await createOlfactiveFamily(name); queryClient.invalidateQueries({ queryKey: ['olfactive-families'] }); } catch { addToast('Error al crear familia.', 'error'); } };
  const handleCreateHouse = async (name: string, handle: string) => { try { await createHouse({ name, handle }); queryClient.invalidateQueries({ queryKey: ['houses'] }); } catch { addToast('Error al crear casa.', 'error'); } };

  return (
    <div className="admin-essences">
      <div className="admin-essences__header">
        <div className="admin-essences__header-left">
          <h1 className="admin-essences__title">Esencias</h1>
          <p className="admin-essences__desc">Catálogo de esencias y gestión de stock</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="admin-essences__create-btn"><Plus size={16} /> Nueva Esencia</button>
      </div>

      {lowStock.length > 0 && (
        <div className="admin-essences__low-stock">
          <AlertTriangle size={16} className="admin-essences__low-stock-icon" />
          <div>
            <p className="admin-essences__low-stock-text"><strong>{lowStock.length}</strong> esencia{lowStock.length !== 1 ? 's' : ''} con stock bajo: {lowStock.slice(0, 3).map(e => e.name).join(', ')}{lowStock.length > 3 ? ` y ${lowStock.length - 3} más` : ''}</p>
            <button onClick={() => setSearch('')} className="admin-essences__low-stock-link">Ver todas las esencias</button>
          </div>
        </div>
      )}

      <div className="admin-essences__search">
        <Search size={15} className="admin-essences__search-icon" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, familia, casa..." className="admin-essences__search-input" />
      </div>

      {isLoading ? (
        <div className="admin-essences__loading"><Loader2 size={28} className="admin-essences__spinner" /></div>
      ) : filtered.length === 0 ? (
        <p className="admin-essences__empty">No se encontraron esencias.</p>
      ) : (
        <div className="admin-essences__grid">
          {filtered.map(e => {
            const isActive = e.active !== false && e.isActive !== false;
            const stockMl = e.currentStockMl ?? 0;
            const minStock = e.minStockGrams ?? 30;
            const isLow = stockMl > 0 && stockMl < minStock;
            const pct = Math.min(100, (stockMl / Math.max(minStock * 2, 1)) * 100);

            return (
              <div key={e.id} className={clsx('admin-essences__card', !isActive && 'admin-essences__card--inactive')}>
                <div className="admin-essences__card-header">
                  <div>
                    <p className="admin-essences__card-name">{e.name}</p>
                    <p className="admin-essences__card-family">{e.olfactiveFamily?.name ?? 'Sin familia'}</p>
                  </div>
                </div>
                <div className="admin-essences__card-status-row">
                  {!isActive && <span className="admin-essences__card-status admin-essences__card-status--inactive">Inactiva</span>}
                  {stockMl === 0 && isActive && <span className="admin-essences__card-status admin-essences__card-status--low"><AlertTriangle size={9} /> Agotado</span>}
                  {isLow && <span className="admin-essences__card-status admin-essences__card-status--low"><AlertTriangle size={9} /> Bajo</span>}
                  {!isLow && stockMl > 0 && <span className="admin-essences__card-status admin-essences__card-status--ok">Disponible</span>}
                  {e.house && <span className="admin-essences__card-house" title={e.house.name}>@{e.house.handle}</span>}
                </div>
                {e.olfactiveTags && e.olfactiveTags.length > 0 && (
                  <div className="admin-essences__card-tags">
                    {e.olfactiveTags.map(t => <span key={t.id} className="admin-essences__card-tag">{t.name}</span>)}
                  </div>
                )}
                <div className="admin-essences__card-stock">
                  <div className="admin-essences__card-stock-row">
                    <span className="admin-essences__card-stock-label">Stock</span>
                    <span className="admin-essences__card-stock-value">{stockMl.toFixed(0)}g / {(stockMl / OZ_TO_ML).toFixed(1)}oz</span>
                  </div>
                  <div className="admin-essences__card-stock-bar">
                    <div className="admin-essences__card-stock-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="admin-essences__card-stock-row">
                    <span className="admin-essences__card-stock-label" style={{ fontSize: '0.625rem' }}>Mín: {minStock}g</span>
                  </div>
                </div>
                <div className="admin-essences__card-actions">
                  <button onClick={() => setMovementTarget(e)} className="admin-essences__card-action-btn"><Package size={11} /> Movimiento</button>
                  <button onClick={() => setEditTarget(e)} className="admin-essences__card-action-btn"><Pencil size={11} /></button>
                  <button onClick={() => setToggleTarget(e)} className="admin-essences__card-action-btn">{isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}</button>
                  <button onClick={() => { setDeleteTarget(e); setDeletePassword(''); setDeleteError(''); }} className="admin-essences__card-action-btn admin-essences__card-action-btn--red"><Trash2 size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EssenceFormModal initial={EMPTY_FORM} open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} loading={saving} title="Nueva Esencia" submitLabel="Crear esencia" families={families} houses={houses} onCreateFamily={handleCreateFamily} onCreateHouse={handleCreateHouse} />
      <EssenceFormModal initial={editTarget ? { name: editTarget.name, description: editTarget.description ?? '', olfactiveFamilyId: editTarget.olfactiveFamily?.id ?? '', inspirationBrand: editTarget.inspirationBrand ?? '', houseId: editTarget.houseId ?? '', tagIds: editTarget.olfactiveTags?.map(t => t.id) ?? [], photoUrl: editTarget.photoUrl || '' } : EMPTY_FORM} open={!!editTarget} onClose={() => setEditTarget(null)} onSubmit={handleEdit} loading={saving} title="Editar Esencia" submitLabel="Guardar cambios" families={families} houses={houses} onCreateFamily={handleCreateFamily} onCreateHouse={handleCreateHouse} />
      {movementTarget && <MovementModal essence={movementTarget} onClose={() => setMovementTarget(null)} />}

      {/* Delete modal */}
      <div className="admin-essences__modal-overlay" style={{ display: deleteTarget ? 'flex' : 'none' }}>
        <div className="admin-essences__modal-backdrop" onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }} />
        {deleteTarget && (
          <div className="admin-essences__modal-body">
            <div className="admin-essences__modal-header">
              <h2 className="admin-essences__modal-title">Eliminar Esencia</h2>
              <button onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }} className="admin-essences__modal-close"><X size={18} /></button>
            </div>
            <div className="admin-essences__modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="admin-essences__delete-warning">
                <p className="admin-essences__delete-warning-title">¿Estás seguro de eliminar "{deleteTarget.name}"?</p>
                <p className="admin-essences__delete-warning-text">Esta acción es irreversible. Se eliminará la esencia y todos sus movimientos asociados.</p>
              </div>
              <div className="admin-essences__form-group">
                <label className="admin-essences__form-label">Contraseña del administrador</label>
                <div className="admin-essences__delete-password-wrap">
                  <input type={showDeletePassword ? 'text' : 'password'} value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Ingresa tu contraseña para confirmar" className="admin-essences__delete-password-input" />
                  <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="admin-essences__delete-password-toggle" tabIndex={-1}>{showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              {deleteError && <p className="admin-essences__delete-error admin-essences__delete-error--mb">{deleteError}</p>}
              <div className="admin-essences__delete-actions">
                <button onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); setShowDeletePassword(false); }} className="admin-essences__delete-cancel">Cancelar</button>
                <button onClick={handleDelete} disabled={!deletePassword || deleting} className="admin-essences__delete-confirm">
                  {deleting && <div className="admin-essences__spinner" style={{ width: '1rem', height: '1rem' }} />} Eliminar permanentemente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AdminConfirmDialog open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleToggle}
        title={toggleTarget?.active === false || toggleTarget?.isActive === false ? "Activar esencia" : "Desactivar esencia"}
        message={`¿${toggleTarget?.active === false || toggleTarget?.isActive === false ? "Activar" : "Desactivar"} "${toggleTarget?.name ?? ""}"?`}
        confirmLabel={toggleTarget?.active === false || toggleTarget?.isActive === false ? "Activar" : "Desactivar"} variant="warning" />
    </div>
  );
}
