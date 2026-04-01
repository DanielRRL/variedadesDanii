/**
 * AdminEssencesPage — Essence catalog & stock management.
 *
 * Full CRUD: create, edit, list essences with grams tracking.
 * Associations: olfactive family (primary + tags), house/brand, pricePerMl.
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Droplets,
  Search,
  AlertTriangle,
  Plus,
  Minus,
  X,
  Loader2,
  Package,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Tag,
  Home as HomeIcon,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import clsx from 'clsx';

import {
  getEssences,
  getOlfactiveFamilies,
  getHouses,
  createEssence,
  updateEssence,
  createHouse,
  createOlfactiveFamily,
  registerEssenceMovement,
  getLowStockAlerts,
  adminDeleteEssence,
} from '../../services/api';
import type { Essence, OlfactiveFamily, House } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Movement modal
// ─────────────────────────────────────────────────────────────────────────────

function MovementModal({
  essence,
  onClose,
}: {
  essence: Essence;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [ml, setMl] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      registerEssenceMovement(essence.id, {
        type,
        ml: parseFloat(ml),
        reason: reason || (type === 'IN' ? 'PURCHASE' : 'SALE'),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-essences'] });
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
      onClose();
    },
  });

  const canSubmit = parseFloat(ml) > 0 && !mutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted hover:text-text-primary">
          <X size={18} />
        </button>

        <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
          Movimiento de Inventario
        </h3>
        <p className="text-sm text-muted mb-4">{essence.name}</p>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          {(['IN', 'OUT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                type === t
                  ? t === 'IN'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-red-50 border-red-300 text-red-700'
                  : 'border-border text-muted hover:bg-gray-50',
              )}
            >
              {t === 'IN' ? (
                <span className="flex items-center justify-center gap-1"><Plus size={14} /> Entrada (gramos)</span>
              ) : (
                <span className="flex items-center justify-center gap-1"><Minus size={14} /> Salida (gramos)</span>
              )}
            </button>
          ))}
        </div>

        {/* Grams input */}
        <label className="block text-xs font-medium text-muted mb-1">Cantidad (gramos)</label>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={ml}
          onChange={(e) => setMl(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
          placeholder="Ej: 500"
        />

        {/* Reason */}
        <label className="block text-xs font-medium text-muted mb-1">Razón</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
        >
          {type === 'IN' ? (
            <>
              <option value="PURCHASE">Compra a proveedor</option>
              <option value="RETURN">Devolución</option>
              <option value="ADJUSTMENT">Ajuste manual</option>
            </>
          ) : (
            <>
              <option value="SALE">Venta</option>
              <option value="ADJUSTMENT">Ajuste manual</option>
            </>
          )}
        </select>

        {/* Notes */}
        <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
          placeholder="Detalles adicionales..."
        />

        {mutation.isError && (
          <p className="text-red-600 text-xs mb-3">Error al registrar movimiento.</p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          className="w-full bg-brand-pink text-white font-medium text-sm py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Registrar Movimiento
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Essence Form modal (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

type EssenceFormData = {
  name: string;
  description: string;
  olfactiveFamilyId: string;
  inspirationBrand: string;
  houseId: string;
  pricePerMl: string;
  tagIds: string[];
};

const EMPTY_FORM: EssenceFormData = {
  name: '',
  description: '',
  olfactiveFamilyId: '',
  inspirationBrand: '',
  houseId: '',
  pricePerMl: '',
  tagIds: [],
};

function EssenceFormModal({
  initial,
  open,
  onClose,
  onSubmit,
  loading,
  title,
  submitLabel,
  families,
  houses,
  onCreateFamily,
  onCreateHouse,
}: {
  initial: EssenceFormData;
  open: boolean;
  onClose: () => void;
  onSubmit: (d: EssenceFormData) => void;
  loading: boolean;
  title: string;
  submitLabel: string;
  families: OlfactiveFamily[];
  houses: House[];
  onCreateFamily: (name: string) => Promise<void>;
  onCreateHouse: (name: string, handle: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EssenceFormData>(initial);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseHandle, setNewHouseHandle] = useState('');
  const [showNewHouse, setShowNewHouse] = useState(false);

  // Reset form when initial changes (edit vs create)
  const initialKey = JSON.stringify(initial);
  useState(() => { setForm(initial); });

  if (!open) return null;

  const set = (k: keyof EssenceFormData, v: string | string[]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleTag = (familyId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(familyId)
        ? prev.tagIds.filter((id) => id !== familyId)
        : [...prev.tagIds, familyId],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="font-heading font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Nombre *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              placeholder="Ej: 212 VIP"
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
              placeholder="Notas del aroma..."
            />
          </div>

          {/* Primary olfactive family */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Familia olfativa principal *</label>
            <div className="flex gap-2">
              <select
                required
                value={form.olfactiveFamilyId}
                onChange={(e) => set('olfactiveFamilyId', e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              >
                <option value="">Seleccionar...</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewFamily(!showNewFamily)}
                className="px-3 py-2 text-xs font-medium border border-brand-pink/30 text-brand-pink rounded-lg hover:bg-brand-pink/5 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {showNewFamily && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="Nueva familia..."
                  className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newFamilyName.trim()) {
                      await onCreateFamily(newFamilyName.trim());
                      setNewFamilyName('');
                      setShowNewFamily(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-brand-pink text-white rounded-lg"
                >
                  Crear
                </button>
              </div>
            )}
          </div>

          {/* Olfactive tags */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              <Tag size={12} className="inline mr-1" />
              Etiquetas aromáticas
            </label>
            <p className="text-[10px] text-muted mb-2">Selecciona familias olfativas adicionales como etiquetas</p>
            <div className="flex flex-wrap gap-1.5">
              {families.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleTag(f.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                    form.tagIds.includes(f.id)
                      ? 'bg-brand-pink/10 border-brand-pink text-brand-pink'
                      : 'border-border text-muted hover:bg-gray-50',
                  )}
                >
                  #{f.name.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* House / brand */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              <HomeIcon size={12} className="inline mr-1" />
              Casa / Marca
            </label>
            <div className="flex gap-2">
              <select
                value={form.houseId}
                onChange={(e) => set('houseId', e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              >
                <option value="">Sin casa</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (@{h.handle})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewHouse(!showNewHouse)}
                className="px-3 py-2 text-xs font-medium border border-brand-pink/30 text-brand-pink rounded-lg hover:bg-brand-pink/5 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {showNewHouse && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newHouseName}
                  onChange={(e) => {
                    setNewHouseName(e.target.value);
                    // Auto-generate handle
                    setNewHouseHandle(
                      e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    );
                  }}
                  placeholder="Nombre (ej: Carolina Herrera)"
                  className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
                />
                <span className="text-xs text-muted self-center">@{newHouseHandle || '...'}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (newHouseName.trim() && newHouseHandle.trim()) {
                      await onCreateHouse(newHouseName.trim(), newHouseHandle.trim());
                      setNewHouseName('');
                      setNewHouseHandle('');
                      setShowNewHouse(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-brand-pink text-white rounded-lg"
                >
                  Crear
                </button>
              </div>
            )}
          </div>

          {/* Inspiration brand + price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Inspiración</label>
              <input
                value={form.inspirationBrand}
                onChange={(e) => set('inspirationBrand', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                placeholder="Ej: Chanel Nº5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Precio / ml (COP)</label>
              <input
                type="number"
                min={0}
                value={form.pricePerMl}
                onChange={(e) => set('pricePerMl', e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                placeholder="0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.name || !form.olfactiveFamilyId}
            className="w-full py-2.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminEssencesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Essence | null>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Essence | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Essence | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);  const [showDeletePassword, setShowDeletePassword] = useState(false);
  // Data queries
  const { data: essencesRes, isLoading } = useQuery({
    queryKey: ['admin-essences'],
    queryFn: () => getEssences(),
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: () => getLowStockAlerts(),
    staleTime: 5 * 60_000,
  });

  const { data: familiesRes } = useQuery({
    queryKey: ['olfactive-families'],
    queryFn: () => getOlfactiveFamilies(),
  });

  const { data: housesRes } = useQuery({
    queryKey: ['houses'],
    queryFn: () => getHouses(),
  });

  const essences: Essence[] = essencesRes?.data?.essences ?? essencesRes?.data ?? [];
  const lowStock: { name: string; stockMl: number }[] = lowStockRes?.data?.essences ?? lowStockRes?.data ?? [];
  const families: OlfactiveFamily[] = familiesRes?.data ?? [];
  const houses: House[] = housesRes?.data ?? [];

  const filtered = search
    ? essences.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.olfactiveFamily?.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.house?.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.house?.handle?.toLowerCase().includes(search.toLowerCase()),
      )
    : essences;

  // Create essence
  const handleCreate = async (form: EssenceFormData) => {
    setSaving(true);
    try {
      await createEssence({
        name: form.name,
        description: form.description || undefined,
        olfactiveFamilyId: form.olfactiveFamilyId,
        inspirationBrand: form.inspirationBrand || undefined,
        houseId: form.houseId || undefined,
        pricePerMl: form.pricePerMl ? Number(form.pricePerMl) : undefined,
        tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-essences'] });
      setCreateOpen(false);
    } catch {
      alert('Error al crear esencia.');
    } finally {
      setSaving(false);
    }
  };

  // Edit essence
  const handleEdit = async (form: EssenceFormData) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateEssence(editTarget.id, {
        name: form.name,
        description: form.description || undefined,
        olfactiveFamilyId: form.olfactiveFamilyId,
        inspirationBrand: form.inspirationBrand || undefined,
        houseId: form.houseId || undefined,
        pricePerMl: form.pricePerMl ? Number(form.pricePerMl) : null,
        tagIds: form.tagIds,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-essences'] });
      setEditTarget(null);
    } catch {
      alert('Error al actualizar esencia.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active
  const handleToggle = async (e: Essence) => {
    const newActive = !(e.active ?? e.isActive);
    if (!window.confirm(`¿${newActive ? 'Activar' : 'Desactivar'} "${e.name}"?`)) return;
    try {
      await updateEssence(e.id, { active: newActive });
      queryClient.invalidateQueries({ queryKey: ['admin-essences'] });
    } catch {
      alert('Error al cambiar estado.');
    }
  };

  // Create family inline
  const handleCreateFamily = async (name: string) => {
    await createOlfactiveFamily(name);
    queryClient.invalidateQueries({ queryKey: ['olfactive-families'] });
  };

  // Create house inline
  const handleCreateHouse = async (name: string, handle: string) => {
    await createHouse({ name, handle });
    queryClient.invalidateQueries({ queryKey: ['houses'] });
  };

  // Delete essence with password
  const handleDelete = async () => {
    if (!deleteTarget || !deletePassword) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await adminDeleteEssence(deleteTarget.id, deletePassword);
      queryClient.invalidateQueries({ queryKey: ['admin-essences'] });
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock'] });
      setDeleteTarget(null);
      setDeletePassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(msg ?? 'Error al eliminar esencia.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Esencias</h1>
          <p className="text-sm text-muted">Catálogo, casas y movimientos de inventario (gramos)</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-pink text-white text-sm font-semibold hover:bg-brand-pink/90 transition-colors"
        >
          <Plus size={16} />
          Nueva Esencia
        </button>
      </div>

      {/* Low-stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {lowStock.length} esencia{lowStock.length > 1 ? 's' : ''} con stock bajo
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {lowStock.slice(0, 3).map((e) => e.name).join(', ')}
              {lowStock.length > 3 && ` y ${lowStock.length - 3} más`}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, familia, casa o @handle..."
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-brand-pink" />
        </div>
      )}

      {/* Essence grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((essence) => {
            const isLow = lowStock.some((ls) => ls.name === essence.name);
            const isActive = essence.active ?? essence.isActive ?? true;
            return (
              <div
                key={essence.id}
                className={clsx(
                  'bg-white rounded-xl border p-4 flex flex-col gap-2',
                  isActive ? 'border-border' : 'border-red-200 opacity-60',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm text-text-primary truncate">
                      {essence.name}
                    </h3>
                    <p className="text-xs text-muted">{essence.olfactiveFamily?.name ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isLow && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700">
                        BAJO
                      </span>
                    )}
                    {!isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600">
                        OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* House badge */}
                {essence.house && (
                  <p className="text-[10px] text-brand-blue font-medium">
                    @{essence.house.handle} · {essence.house.name}
                  </p>
                )}

                {/* Tags */}
                {essence.olfactiveTags && essence.olfactiveTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {essence.olfactiveTags.map((t) => (
                      <span key={t.id} className="px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-medium">
                        #{t.name.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stock bar */}
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Package size={12} />
                  <span>{essence.currentStockMl != null ? `${essence.currentStockMl.toFixed(0)} g` : 'Sin datos'}</span>
                  {essence.pricePerMl != null && essence.pricePerMl > 0 && (
                    <span className="ml-auto font-medium text-text-primary">
                      ${essence.pricePerMl.toLocaleString('es-CO')}/ml
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => setSelected(essence)}
                    className="flex-1 text-center text-xs font-medium text-brand-pink border border-brand-pink/30 rounded-lg py-1.5 hover:bg-brand-pink/5 transition-colors"
                  >
                    Movimiento
                  </button>
                  <button
                    onClick={() => setEditTarget(essence)}
                    className="p-1.5 text-muted hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleToggle(essence)}
                    className="p-1.5 text-muted hover:text-brand-pink rounded-lg hover:bg-brand-pink/10 transition-colors"
                    title={isActive ? 'Desactivar' : 'Activar'}
                  >
                    {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(essence); setDeletePassword(''); setDeleteError(''); }}
                    className="p-1.5 text-muted hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !isLoading && (
            <p className="col-span-full text-center text-sm text-muted py-6">
              No se encontraron esencias.
            </p>
          )}
        </div>
      )}

      {/* Movement modal */}
      {selected && <MovementModal essence={selected} onClose={() => setSelected(null)} />}

      {/* Create modal */}
      <EssenceFormModal
        key="create"
        initial={EMPTY_FORM}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={saving}
        title="Nueva Esencia"
        submitLabel="Crear esencia"
        families={families}
        houses={houses}
        onCreateFamily={handleCreateFamily}
        onCreateHouse={handleCreateHouse}
      />

      {/* Edit modal */}
      {editTarget && (
        <EssenceFormModal
          key={`edit-${editTarget.id}`}
          initial={{
            name: editTarget.name,
            description: editTarget.description ?? '',
            olfactiveFamilyId: editTarget.olfactiveFamily?.id ?? '',
            inspirationBrand: editTarget.inspirationBrand ?? '',
            houseId: editTarget.house?.id ?? editTarget.houseId ?? '',
            pricePerMl: editTarget.pricePerMl != null ? String(editTarget.pricePerMl) : '',
            tagIds: editTarget.olfactiveTags?.map((t) => t.id) ?? [],
          }}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          loading={saving}
          title="Editar Esencia"
          submitLabel="Guardar cambios"
          families={families}
          houses={houses}
          onCreateFamily={handleCreateFamily}
          onCreateHouse={handleCreateHouse}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar esencia</h3>
            <p className="text-sm text-gray-600 mb-1">
              Estás a punto de eliminar <strong>{deleteTarget.name}</strong>. Esta acción es irreversible.
            </p>
            <p className="text-xs text-red-500 mb-4">Se eliminarán también todos los movimientos asociados.</p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Clave de administrador</label>
            <div className="relative mb-1">
              <input
                type={showDeletePassword ? 'text' : 'password'}
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-brand-pink/40 outline-none"
                placeholder="Ingresa tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {deleteError && <p className="text-xs text-red-500 mb-2">{deleteError}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !deletePassword}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
