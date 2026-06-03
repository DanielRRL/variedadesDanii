/**
 * AdminReturnItemsPage — Bottle & product return management.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import { RotateCcw, Search, Loader2, X, User, PackageOpen, Info, CheckCircle } from 'lucide-react';
import { searchUsers, getBottles, createBottleReturn } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { Bottle } from '../../types';
import '../../css/AdminReturnItemsPage.css';

interface UserHit { id: string; name: string; email: string; phone?: string; }

function ReturnModal({ user, onClose }: { user: UserHit; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [bottleId, setBottleId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState(false);

  const { data: bottlesRes, isLoading: bottlesLoading, isError: isBottlesError } = useQuery({
    queryKey: ['bottles'], queryFn: getBottles,
  });
  const bottles: Bottle[] = bottlesRes?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => createBottleReturn({ bottleId, orderId, quantity }),
    onSuccess: () => { setSuccess(true); queryClient.invalidateQueries({ queryKey: ['admin-returns'] }); },
  });

  if (isBottlesError) return <AdminQueryError />;
  const selectedBottle = bottles.find(b => b.id === bottleId);
  const canSubmit = bottleId && orderId && quantity > 0 && !mutation.isPending;

  if (success) {
    return (
      <div className="admin-returns__modal-overlay">
        <div className="admin-returns__modal-backdrop" onClick={onClose} />
        <div className="admin-returns__modal-body">
          <div className="admin-returns__modal-success">
            <CheckCircle size={48} className="admin-returns__modal-success-icon" />
            <h3 className="admin-returns__modal-success-title">Devolución Registrada</h3>
            <p className="admin-returns__modal-success-text">Se acreditó {formatCOP(selectedBottle?.returnDiscount ?? 0)} a {user.name}.</p>
            <button onClick={onClose} className="admin-returns__modal-success-btn">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-returns__modal-overlay">
      <div className="admin-returns__modal-backdrop" onClick={onClose} />
      <div className="admin-returns__modal-body">
        <button onClick={onClose} className="admin-returns__modal-close"><X size={18} /></button>
        <h3 className="admin-returns__modal-title">Registrar Devolución</h3>
        <p className="admin-returns__modal-subtitle">Cliente: <strong>{user.name}</strong> ({user.email})</p>

        <div className="admin-returns__form-field">
          <label className="admin-returns__form-label">Tipo de Frasco</label>
          {bottlesLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', fontSize: '0.875rem', color: '#64748b' }}>
              <Loader2 size={14} style={{ animation: 'ret-spin 0.6s linear infinite' }} /> Cargando frascos...
            </div>
          ) : (
            <select value={bottleId} onChange={e => setBottleId(e.target.value)} className="admin-returns__form-select">
              <option value="">Seleccionar frasco...</option>
              {bottles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.capacityMl} ml) — Dcto: {formatCOP(b.returnDiscount)}</option>)}
            </select>
          )}
        </div>

        <div className="admin-returns__form-field">
          <label className="admin-returns__form-label">ID del Pedido (Nº)</label>
          <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} className="admin-returns__form-input" placeholder="Ej: VD-20260001 o UUID del pedido" />
        </div>

        <div className="admin-returns__form-field">
          <label className="admin-returns__form-label">Cantidad</label>
          <input type="number" min={1} max={10} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="admin-returns__form-input" />
        </div>

        {selectedBottle && (
          <div className="admin-returns__form-discount">
            Descuento a acreditar: <strong>{formatCOP(selectedBottle.returnDiscount * quantity)}</strong>
          </div>
        )}
        {mutation.isError && <p className="admin-returns__form-error">Error al registrar la devolución. Verifica el ID del pedido.</p>}

        <button disabled={!canSubmit} onClick={() => mutation.mutate()} className="admin-returns__form-submit">
          {mutation.isPending && <Loader2 size={14} className="admin-returns__form-loader" />}
          Registrar Devolución
        </button>
      </div>
    </div>
  );
}

export default function AdminReturnItemsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const { data: usersRes, isLoading: usersLoading, isError: isUsersError } = useQuery({
    queryKey: ['admin-search-users-returns', debouncedSearch],
    queryFn: () => searchUsers({ search: debouncedSearch }),
    enabled: debouncedSearch.length >= 2,
  });

  if (isUsersError) return <AdminQueryError />;
  const users: UserHit[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  return (
    <div className="admin-returns">
      <div className="admin-returns__header">
        <div className="admin-returns__header-info">
          <h1 className="admin-returns__title">Devoluciones</h1>
          <p className="admin-returns__desc">Gestión de devoluciones de frascos</p>
        </div>
        <RotateCcw size={24} className="admin-returns__header-icon" />
      </div>

      <div className="admin-returns__info-banner">
        <Info size={16} className="admin-returns__info-icon" />
        <div className="admin-returns__info-text">
          <p className="admin-returns__info-title">Proceso de devolución</p>
          <p className="admin-returns__info-detail">Busca al cliente, selecciona el tipo de frasco devuelto y el pedido original. El descuento se acredita automáticamente a la cuenta del cliente.</p>
        </div>
      </div>

      <div className="admin-returns__search">
        <Search size={16} className="admin-returns__search-icon" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre, email o teléfono..." className="admin-returns__search-input" />
      </div>

      {usersLoading && debouncedSearch.length >= 2 && (
        <div className="admin-returns__loading"><Loader2 size={20} className="admin-returns__spinner" /></div>
      )}

      {!usersLoading && users.length > 0 && (
        <div className="admin-returns__results">
          {users.map(user => (
            <div key={user.id} className="admin-returns__result-item">
              <div className="admin-returns__result-left">
                <div className="admin-returns__result-avatar"><User size={14} className="admin-returns__result-avatar-icon" /></div>
                <div className="admin-returns__result-info">
                  <p className="admin-returns__result-name">{user.name}</p>
                  <p className="admin-returns__result-email">{user.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(user)} className="admin-returns__result-btn"><PackageOpen size={13} /> Devolución</button>
            </div>
          ))}
        </div>
      )}

      {!usersLoading && debouncedSearch.length >= 2 && users.length === 0 && (
        <p className="admin-returns__no-results">No se encontraron clientes con "{debouncedSearch}".</p>
      )}

      {debouncedSearch.length < 2 && (
        <div className="admin-returns__idle">
          <RotateCcw size={40} className="admin-returns__idle-icon" strokeWidth={1.2} />
          <p className="admin-returns__idle-text">Busca un cliente para registrar una devolución de frasco.</p>
        </div>
      )}

      {selectedUser && <ReturnModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
