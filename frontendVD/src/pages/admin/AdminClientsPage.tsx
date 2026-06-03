/**
 * AdminClientsPage — Client management with search and history modal.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Eye, ShoppingBag, Gem, Gift, Users, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

import { searchUsers, getClientHistory, adminVerifyUser } from "../../services/api";
import { formatCOP } from "../../utils/format";
import AdminTable from "../../components/admin/AdminTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import { useToastStore } from "../../stores/toastStore";
import { AdminQueryError } from "../../components/admin/AdminQueryError";
import type { BadgeColor } from "../../components/admin/AdminStatusBadge";
import type { User, Order, GramTransaction, EssenceRedemption } from "../../types";
import "../../css/AdminClientsPage.css";

// ─── Client History Modal ──────────────────────────────────────────────────

type HistoryTab = "orders" | "grams" | "redemptions";

const HISTORY_TABS: { key: HistoryTab; label: string; Icon: React.ElementType }[] = [
  { key: "orders", label: "Pedidos", Icon: ShoppingBag },
  { key: "grams", label: "Gramos", Icon: Gem },
  { key: "redemptions", label: "Canjes", Icon: Gift },
];

function ClientHistoryModal({
  userId, userName, open, onClose,
}: { userId: string; userName: string; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<HistoryTab>("orders");

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["admin-client-history", userId],
    queryFn: () => getClientHistory(userId),
    enabled: open, staleTime: 30_000,
  });

  const history = res?.data ?? {};
  const orders: Order[] = history.orders ?? [];
  const gramTxns: GramTransaction[] = history.gramTransactions ?? [];
  const redemptions: EssenceRedemption[] = history.redemptions ?? [];

  return (
    <AdminModal open={open} onClose={onClose} title={`Historial — ${userName}`} size="lg">
      <div className="admin-clients__modal-tabs">
        {HISTORY_TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx("admin-clients__modal-tab", tab === key && "admin-clients__modal-tab--active")}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="admin-clients__modal-loader"><div className="admin-clients__modal-spinner" /></div>
      ) : isError ? <AdminQueryError /> : (
        <>
          {tab === "orders" && (
            orders.length === 0 ? <p className="admin-clients__modal-empty">Sin pedidos registrados.</p> : (
              <table className="admin-clients__modal-table">
                <thead><tr>{["PEDIDO","FECHA","TOTAL","ESTADO"].map(h => <th key={h} className="admin-clients__modal-th">{h}</th>)}</tr></thead>
                <tbody className="admin-clients__modal-tbody">
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-order">{o.orderNumber}</span></td>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-date">{new Date(o.createdAt).toLocaleDateString("es-CO")}</span></td>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-total">{formatCOP(o.total)}</span></td>
                      <td className="admin-clients__modal-td"><AdminStatusBadge label={o.status} color={historyStatusColor(o.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "grams" && (
            gramTxns.length === 0 ? <p className="admin-clients__modal-empty">Sin transacciones de gramos.</p> : (
              <div className="admin-clients__modal-gram-list">
                {gramTxns.map(t => (
                  <div key={t.id} className="admin-clients__modal-gram-item">
                    <div className="admin-clients__modal-gram-info">
                      <p className="admin-clients__modal-gram-desc">{t.description}</p>
                      <p className="admin-clients__modal-gram-date">{new Date(t.createdAt).toLocaleDateString("es-CO")}</p>
                    </div>
                    <span className={clsx("admin-clients__modal-gram-delta", t.gramsDelta > 0 ? "admin-clients__modal-gram-delta--positive" : "admin-clients__modal-gram-delta--negative")}>
                      {t.gramsDelta > 0 ? "+" : ""}{t.gramsDelta}g
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "redemptions" && (
            redemptions.length === 0 ? <p className="admin-clients__modal-empty">Sin canjes registrados.</p> : (
              <table className="admin-clients__modal-table">
                <thead><tr>{["ESENCIA","GRAMOS","FECHA","ESTADO"].map(h => <th key={h} className="admin-clients__modal-th">{h}</th>)}</tr></thead>
                <tbody className="admin-clients__modal-tbody">
                  {redemptions.map(r => (
                    <tr key={r.id}>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-name">{r.essenceName}</span></td>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-grams">{r.gramsUsed}g</span></td>
                      <td className="admin-clients__modal-td"><span className="admin-clients__modal-td-date">{new Date(r.createdAt).toLocaleDateString("es-CO")}</span></td>
                      <td className="admin-clients__modal-td">
                        <AdminStatusBadge label={r.status === "DELIVERED" ? "Entregado" : r.status === "CANCELLED" ? "Cancelado" : "Pendiente"}
                          color={r.status === "DELIVERED" ? "success" : r.status === "CANCELLED" ? "danger" : "warning"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </>
      )}
    </AdminModal>
  );
}

function historyStatusColor(status: string): BadgeColor {
  return ((["PENDING","PREPARING"].includes(status)) ? "warning" : status === "PAID" ? "info" : ["READY","DELIVERED"].includes(status) ? "success" : status === "CANCELLED" ? "danger" : "default");
}

function roleBadgeColor(role: string): BadgeColor { return role === "ADMIN" ? "warning" : role === "SELLER" ? "info" : "neutral"; }

export default function AdminClientsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [historyUser, setHistoryUser] = useState<{ id: string; name: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["admin-clients", search, page],
    queryFn: () => searchUsers({ search: search || undefined, page }), staleTime: 30_000,
  });

  if (isError) return <AdminQueryError />;

  const users: User[] = res?.data?.users ?? [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  const handleVerify = async (userId: string) => {
    setVerifyingId(userId);
    try { await adminVerifyUser(userId); queryClient.invalidateQueries({ queryKey: ["admin-clients"] }); }
    catch { addToast("Error al verificar el usuario.", 'error'); }
    finally { setVerifyingId(null); }
  };

  return (
    <div className="admin-clients">
      <AdminPageHeader title="Clientes" description="Busca y gestiona la información de los clientes" />

      <div className="admin-clients__search">
        <Search size={15} className="admin-clients__search-icon" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, email o teléfono…" className="admin-clients__search-input" />
      </div>

      <AdminTable
        columns={[
          { key: "name", header: "Cliente" },
          { key: "email", header: "Email", hideOnMobile: true },
          { key: "phone", header: "Teléfono", hideOnMobile: true },
          { key: "role", header: "Rol", hideOnMobile: true },
          { key: "loyalty", header: "Fidelización", hideOnMobile: true },
          { key: "actions", header: "Acciones" },
        ]} data={users} keyExtractor={u => u.id}
        loading={isLoading} skeletonRows={6} page={page} totalPages={totalPages} onPageChange={setPage}
        emptyState={<AdminEmptyState icon={Users} title="No se encontraron clientes" description="Intenta con otro término de búsqueda." />}
      >
        {u => {
          const initials = u.name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
          const level = u.loyaltyAccount?.level;
          return (
            <>
              <td className="admin-clients__td-name">
                <div className="admin-clients__td-avatar"><span className="admin-clients__td-avatar-text">{initials}</span></div>
                <div className="admin-clients__td-info">
                  <p className="admin-clients__td-info-name">{u.name}</p>
                  <p className={clsx("admin-clients__td-info-verified", u.emailVerified && "admin-clients__td-info-verified--ok")}>{u.emailVerified ? "✓ Verificado" : "Sin verificar"}</p>
                </div>
              </td>
              <td className="admin-clients__td-email">{u.email}</td>
              <td className="admin-clients__td-phone">{u.phone}</td>
              <td className="admin-clients__td-actions" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                <AdminStatusBadge label={u.role} color={roleBadgeColor(u.role)} />
              </td>
              <td className="admin-clients__td-loyalty">
                {u.loyaltyAccount ? (
                  <div>
                    <span className="admin-clients__td-loyalty-pts">{u.loyaltyAccount.points} pts</span>
                    <span className="admin-clients__td-loyalty-sep">·</span>
                    <span className={clsx("admin-clients__td-loyalty-level", `admin-clients__td-loyalty-level--${level === 'VIP' ? 'vip' : level === 'PREFERRED' ? 'preferred' : 'basic'}`)}>
                      {u.loyaltyAccount.level}
                    </span>
                  </div>
                ) : <span className="admin-clients__td-loyalty-empty">—</span>}
              </td>
              <td className="admin-clients__td-actions">
                {!u.emailVerified && u.role !== "ADMIN" && (
                  <button onClick={() => handleVerify(u.id)} disabled={verifyingId === u.id} className="admin-clients__action-btn admin-clients__action-btn--verify" aria-label={`Verificar cuenta de ${u.name}`}>
                    {verifyingId === u.id ? <span className="admin-clients__action-spinner" /> : <ShieldCheck size={14} />}
                  </button>
                )}
                <button onClick={() => setHistoryUser({ id: u.id, name: u.name })} className="admin-clients__action-btn admin-clients__action-btn--history" aria-label={`Ver historial de ${u.name}`}>
                  <Eye size={14} />
                </button>
              </td>
            </>
          );
        }}
      </AdminTable>

      <ClientHistoryModal userId={historyUser?.id ?? ""} userName={historyUser?.name ?? ""} open={!!historyUser} onClose={() => setHistoryUser(null)} />
    </div>
  );
}
