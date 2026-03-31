/**
 * AdminEssencesPage — Essence catalog & stock management.
 *
 * Data sources:
 *  - GET  /api/essences                          → list of all essences
 *  - POST /api/inventory/essence/:id/movements   → register IN/OUT movement
 *  - GET  /api/admin/reports/low-stock            → low-stock alerts
 */

import { useState } from 'react';
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
} from 'lucide-react';
import clsx from 'clsx';

import { getEssences, registerEssenceMovement, getLowStockAlerts } from '../../services/api';
import type { Essence } from '../../types';

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
                <span className="flex items-center justify-center gap-1"><Plus size={14} /> Entrada</span>
              ) : (
                <span className="flex items-center justify-center gap-1"><Minus size={14} /> Salida</span>
              )}
            </button>
          ))}
        </div>

        {/* ML input */}
        <label className="block text-xs font-medium text-muted mb-1">Cantidad (ml)</label>
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
              <option value="DAMAGE">Daño / Merma</option>
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
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminEssencesPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Essence | null>(null);

  const { data: essencesRes, isLoading } = useQuery({
    queryKey: ['admin-essences'],
    queryFn: () => getEssences(),
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: () => getLowStockAlerts(),
    staleTime: 5 * 60_000,
  });

  const essences: Essence[] = essencesRes?.data?.essences ?? essencesRes?.data ?? [];
  const lowStock: { name: string; stockMl: number }[] = lowStockRes?.data ?? [];

  const filtered = search
    ? essences.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.olfactiveFamily?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : essences;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Esencias</h1>
          <p className="text-sm text-muted">Catálogo y movimientos de inventario</p>
        </div>
        <Droplets size={24} className="text-brand-pink" />
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
          placeholder="Buscar por nombre o familia olfativa..."
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
            return (
              <div
                key={essence.id}
                className="bg-white rounded-xl border border-border p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm text-text-primary truncate">
                      {essence.name}
                    </h3>
                    <p className="text-xs text-muted">{essence.olfactiveFamily?.name ?? '—'}</p>
                  </div>
                  {isLow && (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700">
                      BAJO
                    </span>
                  )}
                </div>

                {/* Stock bar */}
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Package size={12} />
                  <span>{essence.currentStockMl != null ? `${essence.currentStockMl.toFixed(0)} ml` : 'Sin datos'}</span>
                  {essence.pricePerMl > 0 && (
                    <span className="ml-auto font-medium text-text-primary">
                      ${essence.pricePerMl.toLocaleString('es-CO')}/ml
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelected(essence)}
                  className="mt-1 w-full text-center text-xs font-medium text-brand-pink border border-brand-pink/30 rounded-lg py-1.5 hover:bg-brand-pink/5 transition-colors"
                >
                  Registrar Movimiento
                </button>
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
    </div>
  );
}
