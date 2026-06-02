/**
 * AdminClientsPage — Client management with search and history modal.
 *
 * Updated to use shared components: AdminTable, AdminPageHeader, AdminModal, AdminStatusBadge.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  ShoppingBag,
  Gem,
  Gift,
  Users,
  ShieldCheck,
} from "lucide-react";

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

// ─── Client History Modal ──────────────────────────────────────────────────

type HistoryTab = "orders" | "grams" | "redemptions";

const HISTORY_TABS: { key: HistoryTab; label: string; Icon: React.ElementType }[] = [
  { key: "orders", label: "Pedidos", Icon: ShoppingBag },
  { key: "grams", label: "Gramos", Icon: Gem },
  { key: "redemptions", label: "Canjes", Icon: Gift },
];

function ClientHistoryModal({
  userId,
  userName,
  open,
  onClose,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<HistoryTab>("orders");

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["admin-client-history", userId],
    queryFn: () => getClientHistory(userId),
    enabled: open,
    staleTime: 30_000,
  });

  const history = res?.data ?? {};
  const orders: Order[] = history.orders ?? [];
  const gramTxns: GramTransaction[] = history.gramTransactions ?? [];
  const redemptions: EssenceRedemption[] = history.redemptions ?? [];

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={`Historial — ${userName}`}
      size="lg"
    >
      {/* Tab bar */}
      <div className="flex bg-slate-100 rounded-lg p-0.5 w-fit mb-4">
        {HISTORY_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              tab === key
                ? "bg-white text-brand-pink shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-[3px] border-brand-pink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <AdminQueryError />
      ) : (
        <>
          {tab === "orders" &&
            (orders.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">
                Sin pedidos registrados.
              </p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["PEDIDO", "FECHA", "TOTAL", "ESTADO"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase text-[11px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-semibold text-brand-blue text-[11px]">
                        {o.orderNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[12px]">
                        {new Date(o.createdAt).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {formatCOP(o.total)}
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminStatusBadge
                          label={o.status}
                          color={historyStatusColor(o.status)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {tab === "grams" &&
            (gramTxns.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">
                Sin transacciones de gramos.
              </p>
            ) : (
              <div className="space-y-2">
                {gramTxns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-slate-700">
                        {t.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold shrink-0 ${
                        t.gramsDelta > 0 ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {t.gramsDelta > 0 ? "+" : ""}
                      {t.gramsDelta}g
                    </span>
                  </div>
                ))}
              </div>
            ))}

          {tab === "redemptions" &&
            (redemptions.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-6">
                Sin canjes registrados.
              </p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {["ESENCIA", "GRAMOS", "FECHA", "ESTADO"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase text-[11px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {redemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {r.essenceName}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {r.gramsUsed}g
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[12px]">
                        {new Date(r.createdAt).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminStatusBadge
                          label={
                            r.status === "DELIVERED"
                              ? "Entregado"
                              : r.status === "CANCELLED"
                                ? "Cancelado"
                                : "Pendiente"
                          }
                          color={
                            r.status === "DELIVERED"
                              ? "success"
                              : r.status === "CANCELLED"
                                ? "danger"
                                : "warning"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
        </>
      )}
    </AdminModal>
  );
}

function historyStatusColor(status: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    PENDING: "warning",
    PAID: "info",
    PREPARING: "warning",
    READY: "success",
    DELIVERED: "success",
    CANCELLED: "danger",
  };
  return map[status] ?? "default";
}

// ─── Main page ─────────────────────────────────────────────────────────────

function roleBadgeColor(role: string): BadgeColor {
  if (role === "ADMIN") return "warning";
  if (role === "SELLER") return "info";
  return "neutral";
}

export default function AdminClientsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [historyUser, setHistoryUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["admin-clients", search, page],
    queryFn: () => searchUsers({ search: search || undefined, page }),
    staleTime: 30_000,
  });

  if (isError) return <AdminQueryError />;

  const users: User[] = res?.data?.users ?? [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  const handleVerify = async (userId: string) => {
    setVerifyingId(userId);
    try {
      await adminVerifyUser(userId);
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    } catch {
      addToast("Error al verificar el usuario.", 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Clientes"
        description="Busca y gestiona la información de los clientes"
      />

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink"
        />
      </div>

      {/* Clients table */}
      <AdminTable
        columns={[
          { key: "name", header: "Cliente" },
          { key: "email", header: "Email", hideOnMobile: true },
          { key: "phone", header: "Teléfono", hideOnMobile: true },
          { key: "role", header: "Rol" },
          { key: "loyalty", header: "Fidelización" },
          { key: "actions", header: "Acciones" },
        ]}
        data={users}
        keyExtractor={(u) => u.id}
        loading={isLoading}
        skeletonRows={6}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyState={
          <AdminEmptyState
            icon={Users}
            title="No se encontraron clientes"
            description="Intenta con otro término de búsqueda."
          />
        }
      >
        {(u) => {
          const initials = u.name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("");

          return (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0">
                    <span className="text-brand-pink font-bold text-[10px]">
                      {initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate max-w-[140px] text-[13px]">
                      {u.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {u.emailVerified ? "✓ Verificado" : "Sin verificar"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-500 text-[13px] hidden md:table-cell">
                {u.email}
              </td>
              <td className="px-4 py-3 text-slate-500 text-[13px] hidden md:table-cell">
                {u.phone}
              </td>
              <td className="px-4 py-3">
                <AdminStatusBadge
                  label={u.role}
                  color={roleBadgeColor(u.role)}
                />
              </td>
              <td className="px-4 py-3">
                {u.loyaltyAccount ? (
                  <div className="text-[11px] space-y-0.5">
                    <span className="font-semibold text-brand-pink">
                      {u.loyaltyAccount.points} pts
                    </span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span
                      className={`font-semibold ${
                        u.loyaltyAccount.level === "VIP"
                          ? "text-brand-gold"
                          : u.loyaltyAccount.level === "PREFERRED"
                            ? "text-brand-pink"
                            : "text-slate-500"
                      }`}
                    >
                      {u.loyaltyAccount.level}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {!u.emailVerified && u.role !== "ADMIN" && (
                    <button
                      onClick={() => handleVerify(u.id)}
                      disabled={verifyingId === u.id}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      aria-label={`Verificar cuenta de ${u.name}`}
                    >
                      {verifyingId === u.id ? (
                        <span className="block w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setHistoryUser({ id: u.id, name: u.name })
                    }
                    className="p-1.5 text-slate-400 hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                    aria-label={`Ver historial de ${u.name}`}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </td>
            </>
          );
        }}
      </AdminTable>

      {/* Client history modal */}
      <ClientHistoryModal
        userId={historyUser?.id ?? ""}
        userName={historyUser?.name ?? ""}
        open={!!historyUser}
        onClose={() => setHistoryUser(null)}
      />
    </div>
  );
}
