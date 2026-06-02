/**
 * AdminOrdersPage — Full order management list for admins.
 *
 * Updated to use shared components: AdminTable, AdminPageHeader, AdminStatusBadge.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, ChevronDown, ShoppingBag as ShoppingBagIcon } from "lucide-react";

import { getAdminOrders, updateOrderStatus, downloadSalesCSV } from "../../services/api";
import { formatCOP } from "../../utils/format";
import { STATUS_LABELS, VALID_TRANSITIONS, TRANSITION_LABELS } from "./adminShared";
import AdminTable from "../../components/admin/AdminTable";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import type { BadgeColor } from "../../components/admin/AdminStatusBadge";
import type { AdminOrder } from "../../types";
import { useToastStore } from "../../stores/toastStore";
import { AdminQueryError } from "../../components/admin/AdminQueryError";

// ─── Status transition dropdown ────────────────────────────────────────────

function StatusDropdown({
  orderId,
  current,
  onUpdated,
}: {
  orderId: string;
  current: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const next = VALID_TRANSITIONS[current] ?? [];
  if (next.length === 0)
    return <span className="text-[11px] text-slate-400 italic">—</span>;

  const handleSelect = (status: string) => {
    if (status === "CANCELLED") {
      setOpen(false);
      setConfirmCancel(true);
      return;
    }
    executeTransition(status);
  };

  const executeTransition = async (status: string) => {
    setLoading(true);
    try {
      await updateOrderStatus(orderId, status);
      onUpdated();
    } catch {
      addToast("Error al actualizar el estado del pedido.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          disabled={loading}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-3 h-3 border border-t-transparent border-brand-pink rounded-full animate-spin" />
          ) : (
            <ChevronDown size={11} />
          )}
          Avanzar
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${
                    s === "CANCELLED"
                      ? "text-red-600 font-medium"
                      : "text-slate-700"
                  }`}
                >
                  {TRANSITION_LABELS[s] ?? STATUS_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AdminConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          executeTransition("CANCELLED");
        }}
        title="Cancelar pedido"
        message="¿Confirmas cancelar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Cancelar pedido"
        variant="danger"
        loading={loading}
      />
    </>
  );
}

// ─── Status → badge color ─────────────────────────────────────────────────

function badgeColor(status: string): BadgeColor {
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

const STATUS_OPTIONS = [
  "",
  "PENDING",
  "PAID",
  "PREPARING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];
const PAGE_SIZES = [10, 25, 50];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [csvBusy, setCsvBusy] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", search, status, from, to, page, limit],
    queryFn: () =>
      getAdminOrders({
        search: search || undefined,
        status: status || undefined,
        page,
        limit,
      }),
    staleTime: 30_000,
  });

  const orders: AdminOrder[] = data?.data?.orders ?? data?.data ?? [];
  const total: number = data?.data?.total ?? orders.length;

  if (isError) return <AdminQueryError message={error?.message} />;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  const handleExport = async () => {
    setCsvBusy(true);
    try {
      const res = await downloadSalesCSV({
        from: from || undefined,
        to: to || undefined,
      });
      const blob = new Blob([res.data as BlobPart], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ventas_${from || "all"}_${to || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast("Error al exportar el CSV.", "error");
    } finally {
      setCsvBusy(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Pedidos"
        description="Gestiona y actualiza el estado de los pedidos"
        action={{
          label: "Exportar CSV",
          icon: Download,
          onClick: handleExport,
          loading: csvBusy,
        }}
      />

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por pedido # o cliente…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 bg-slate-50"
          />
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-brand-pink bg-slate-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? (STATUS_LABELS[s] ?? s) : "Todos"}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-brand-pink bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-brand-pink bg-slate-50"
          />
        </div>

        {/* Page size */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Mostrar
          </label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-brand-pink bg-slate-50"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={[
          { key: "orderNumber", header: "#", className: "font-mono" },
          { key: "date", header: "Fecha" },
          { key: "client", header: "Cliente" },
          { key: "essences", header: "Esencias", hideOnMobile: true },
          { key: "total", header: "Total" },
          { key: "payment", header: "Pago", hideOnMobile: true },
          { key: "status", header: "Estado" },
          { key: "actions", header: "Acciones" },
        ]}
        data={orders}
        keyExtractor={(o) => o.id}
        loading={isLoading}
        skeletonRows={5}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={limit}
        onPageChange={setPage}
        emptyState={
          <AdminEmptyState
            icon={ShoppingBagIcon}
            title="No se encontraron pedidos"
            description="Intenta ajustar los filtros de búsqueda."
          />
        }
      >
        {(order) => {
          const date = new Date(order.createdAt).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
          });
          const essenceList =
            order.items
              ?.map((it) => it.product?.essence?.name ?? it.product?.name ?? "")
              .filter(Boolean)
              .join(", ") ?? "—";

          return (
            <>
              <td className="px-4 py-3">
                <span className="font-mono text-brand-blue font-semibold text-[11px]">
                  {order.orderNumber}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[12px]">
                {date}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-700 truncate max-w-[140px] text-[13px]">
                  {order.client?.name ?? "N/A"}
                </p>
                <p className="text-slate-400 truncate max-w-[140px] text-[11px]">
                  {order.client?.email ?? ""}
                </p>
              </td>
              <td className="px-4 py-3 max-w-[200px] hidden md:table-cell">
                <span className="text-slate-500 truncate block text-[12px]">
                  {essenceList}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                {formatCOP(order.total)}
              </td>
              <td className="px-4 py-3 text-slate-500 uppercase text-[11px] hidden md:table-cell">
                {order.paymentMethod ?? "—"}
              </td>
              <td className="px-4 py-3">
                <AdminStatusBadge
                  label={STATUS_LABELS[order.status] ?? order.status}
                  color={badgeColor(order.status)}
                />
              </td>
              <td className="px-4 py-3">
                <StatusDropdown
                  orderId={order.id}
                  current={order.status}
                  onUpdated={invalidate}
                />
              </td>
            </>
          );
        }}
      </AdminTable>
    </div>
  );
}
