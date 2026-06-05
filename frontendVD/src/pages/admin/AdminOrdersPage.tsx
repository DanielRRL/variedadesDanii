/**
 * AdminOrdersPage — Full order management list for admins.
 *
 * Uses shared components: AdminTable, AdminPageHeader, AdminStatusBadge,
 * AdminEmptyState, AdminConfirmDialog, AdminQueryError.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, ChevronDown, ShoppingBag as ShoppingBagIcon } from "lucide-react";
import { clsx } from "clsx";

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
import "../../css/AdminOrdersPage.css";

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
    return <span className="admin-orders__status-empty">—</span>;

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
      <div className="admin-orders__status">
        <button
          disabled={loading}
          onClick={() => setOpen((v) => !v)}
          className="admin-orders__status-trigger"
        >
          {loading ? (
            <span className="admin-orders__status-spinner" />
          ) : (
            <ChevronDown size={11} />
          )}
          Avanzar
        </button>
        {open && (
          <>
            <div className="admin-orders__status-backdrop" onClick={() => setOpen(false)} />
            <div className="admin-orders__status-menu">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={clsx(
                    "admin-orders__status-option",
                    s === "CANCELLED" && "admin-orders__status-option--danger",
                  )}
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

  const ordersRaw = data?.data?.orders ?? data?.data;
  const orders: AdminOrder[] = Array.isArray(ordersRaw) ? ordersRaw : [];
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
    <div className="admin-orders__main">
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
      <div className="admin-orders__filters">
        {/* Search */}
        <div className="admin-orders__filter-group admin-orders__filter-group--search">
          <div className="admin-orders__filter-search">
            <Search
              size={14}
              className="admin-orders__filter-search-icon"
            />
            <input
              type="text"
              placeholder="Buscar por pedido # o cliente…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="admin-orders__filter-input admin-orders__filter-input--search"
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="admin-orders__filter-group">
          <label className="admin-orders__filter-label">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="admin-orders__filter-select"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? (STATUS_LABELS[s] ?? s) : "Todos"}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="admin-orders__filter-group">
          <label className="admin-orders__filter-label">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="admin-orders__filter-input"
          />
        </div>
        <div className="admin-orders__filter-group">
          <label className="admin-orders__filter-label">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="admin-orders__filter-input"
          />
        </div>

        {/* Page size */}
        <div className="admin-orders__filter-group">
          <label className="admin-orders__filter-label">
            Mostrar
          </label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="admin-orders__filter-select"
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
          { key: "address", header: "Dirección", hideOnMobile: true },
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
              ?.map((it) => it.product?.name ?? "")
              .filter(Boolean)
              .join(", ") ?? "—";

          return (
            <>
              <td className="admin-orders__td-order">
                <span>
                  {order.orderNumber}
                </span>
              </td>
              <td className="admin-orders__td-date">
                {date}
              </td>
              <td className="admin-orders__td-client">
                <p className="admin-orders__td-client-name">
                  {order.client?.name ?? "N/A"}
                </p>
                <p className="admin-orders__td-client-email">
                  {order.client?.email ?? ""}
                </p>
              </td>
              <td className="admin-orders__td-items">
                <span>
                  {essenceList}
                </span>
              </td>
              <td className="admin-orders__td-total">
                {formatCOP(order.total)}
              </td>
              <td className="admin-orders__td-payment">
                {order.paymentMethod ?? "—"}
              </td>
              <td className="admin-orders__td-address">
                {order.notes?.startsWith('Entrega:') ? order.notes.replace('Entrega:', '').trim() : '—'}
              </td>
              <td className="admin-orders__td-status">
                <AdminStatusBadge
                  label={STATUS_LABELS[order.status] ?? order.status}
                  color={badgeColor(order.status)}
                />
              </td>
              <td className="admin-orders__td-actions">
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
