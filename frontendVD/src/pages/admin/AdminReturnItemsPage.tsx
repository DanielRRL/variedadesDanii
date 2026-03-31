/**
 * AdminReturnItemsPage — Bottle & product return management.
 *
 * Allows admin to search customers and process bottle returns on their behalf.
 * Uses:
 *  - GET  /api/users?search=...         → find customer
 *  - POST /api/returns                   → register a bottle return
 *  - GET  /api/bottles                   → list returnable bottles
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  Loader2,
  X,
  User,
  PackageOpen,
  Info,
  CheckCircle,
} from 'lucide-react';
import clsx from 'clsx';

import { searchUsers, getBottles, createBottleReturn } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { Bottle } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UserHit {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Return form modal
// ─────────────────────────────────────────────────────────────────────────────

function ReturnModal({
  user,
  onClose,
}: {
  user: UserHit;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [bottleId, setBottleId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState(false);

  const { data: bottlesRes, isLoading: bottlesLoading } = useQuery({
    queryKey: ['bottles'],
    queryFn: getBottles,
  });

  const bottles: Bottle[] = bottlesRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => createBottleReturn({ bottleId, orderId, quantity }),
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
    },
  });

  const selectedBottle = bottles.find((b) => b.id === bottleId);
  const canSubmit = bottleId && orderId && quantity > 0 && !mutation.isPending;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
            Devolución Registrada
          </h3>
          <p className="text-sm text-muted mb-4">
            Se acreditó {formatCOP(selectedBottle?.returnDiscount ?? 0)} a {user.name}.
          </p>
          <button
            onClick={onClose}
            className="bg-brand-pink text-white font-medium text-sm px-6 py-2.5 rounded-xl"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted hover:text-text-primary">
          <X size={18} />
        </button>

        <h3 className="font-heading font-bold text-lg text-text-primary mb-1">
          Registrar Devolución
        </h3>
        <p className="text-sm text-muted mb-4">
          Cliente: <span className="font-medium text-text-primary">{user.name}</span> ({user.email})
        </p>

        {/* Bottle select */}
        <label className="block text-xs font-medium text-muted mb-1">Tipo de Frasco</label>
        {bottlesLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" /> Cargando frascos...
          </div>
        ) : (
          <select
            value={bottleId}
            onChange={(e) => setBottleId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
          >
            <option value="">Seleccionar frasco...</option>
            {bottles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.capacityMl} ml) — Dcto: {formatCOP(b.returnDiscount)}
              </option>
            ))}
          </select>
        )}

        {/* Order ID */}
        <label className="block text-xs font-medium text-muted mb-1">ID del Pedido (Nº)</label>
        <input
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
          placeholder="Ej: VD-20260001 o UUID del pedido"
        />

        {/* Quantity */}
        <label className="block text-xs font-medium text-muted mb-1">Cantidad</label>
        <input
          type="number"
          min={1}
          max={10}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
        />

        {selectedBottle && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 mb-4">
            <p className="text-xs text-green-700">
              Descuento a acreditar: <span className="font-bold">{formatCOP(selectedBottle.returnDiscount * quantity)}</span>
            </p>
          </div>
        )}

        {mutation.isError && (
          <p className="text-red-600 text-xs mb-3">Error al registrar la devolución. Verifica el ID del pedido.</p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => mutation.mutate()}
          className="w-full bg-brand-pink text-white font-medium text-sm py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Registrar Devolución
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminReturnItemsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__returnSearchTimer);
    (window as any).__returnSearchTimer = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-search-users-returns', debouncedSearch],
    queryFn: () => searchUsers({ search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  const users: UserHit[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Devoluciones</h1>
          <p className="text-sm text-muted">Gestión de devoluciones de frascos</p>
        </div>
        <RotateCcw size={24} className="text-brand-pink" />
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-0.5">Proceso de devolución</p>
          <p className="text-xs">
            Busca al cliente, selecciona el tipo de frasco devuelto y el pedido original.
            El descuento se acredita automáticamente a la cuenta del cliente.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar cliente por nombre, email o teléfono..."
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30"
        />
      </div>

      {/* Users loading */}
      {usersLoading && debouncedSearch.length >= 2 && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-brand-pink" />
        </div>
      )}

      {/* User results */}
      {!usersLoading && users.length > 0 && (
        <div className="bg-white rounded-xl border border-border divide-y divide-border">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center shrink-0">
                  <User size={14} className="text-brand-pink" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(user)}
                className={clsx(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  'border-brand-pink/30 text-brand-pink hover:bg-brand-pink/5',
                )}
              >
                <PackageOpen size={13} />
                Devolución
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!usersLoading && debouncedSearch.length >= 2 && users.length === 0 && (
        <p className="text-sm text-muted text-center py-6">
          No se encontraron clientes con "{debouncedSearch}".
        </p>
      )}

      {/* Empty state */}
      {debouncedSearch.length < 2 && (
        <div className="text-center py-12">
          <RotateCcw size={40} className="text-border mx-auto mb-3" strokeWidth={1.2} />
          <p className="text-sm text-muted">Busca un cliente para registrar una devolución de frasco.</p>
        </div>
      )}

      {/* Return modal */}
      {selectedUser && (
        <ReturnModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}
