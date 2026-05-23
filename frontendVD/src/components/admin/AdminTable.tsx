/**
 * AdminTable — Reusable data table with sticky header, loading skeletons,
 * empty state, sort indicators, and pagination.
 *
 * Features:
 *  - Sticky header on scroll
 *  - Skeleton rows during loading
 *  - Sortable columns with visual indicators
 *  - Consistent styling (13px body, 44px rows, hover state)
 *  - Pagination bar with page info and navigation
 *  - Empty state via AdminEmptyState component
 *
 * Usage:
 *   <AdminTable
 *     columns={[{ key: "name", header: "Cliente", sortable: true }]}
 *     data={users}
 *     keyExtractor={(u) => u.id}
 *     loading={isLoading}
 *     page={page}
 *     totalPages={totalPages}
 *     onPageChange={setPage}
 *     totalItems={total}
 *     emptyState={<AdminEmptyState icon={Users} title="Sin clientes" />}
 *   >
 *     {(user) => (
 *       <tr key={user.id}>...</tr>
 *     )}
 *   </AdminTable>
 */

import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ReactNode } from "react";
import { AdminSkeleton } from "./AdminSkeleton";

export interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  className?: string;
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

interface AdminTableProps<T> {
  columns: Column[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  /** Current sort state — if provided, sort arrows render */
  sort?: SortState;
  onSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  children: (item: T) => ReactNode;
  emptyState?: ReactNode;
  showHeader?: boolean;
}

export default function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  skeletonRows = 5,
  sort,
  onSort,
  page,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize,
  children,
  emptyState,
  showHeader = true,
}: AdminTableProps<T>) {
  const cols = data.length > 0 ? columns.length : columns.length;

  // ── Sort arrow ──────────────────────────────────────────────────────────
  function SortIcon({ colKey }: { colKey: string }) {
    if (!sort || sort.key !== colKey || !onSort) return null;
    return sort.dir === "asc" ? (
      <ArrowUp size={12} className="inline ml-1" />
    ) : (
      <ArrowDown size={12} className="inline ml-1" />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" role="table">
          {showHeader && (
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-[11px] whitespace-nowrap ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    } ${col.sortable && onSort ? "cursor-pointer select-none hover:text-slate-700" : ""}`}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    scope="col"
                  >
                    {col.header}
                    {col.sortable && !sort?.key ? (
                      <ArrowUpDown size={11} className="inline ml-1 text-slate-300" />
                    ) : (
                      <SortIcon colKey={col.key} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <AdminSkeleton.Rows count={skeletonRows} cols={cols} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols} className="px-4 py-2">
                  {emptyState || (
                    <div className="flex items-center justify-center py-12 text-[13px] text-slate-400">
                      Sin datos
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {children(item)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && onPageChange && page && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[12px] text-slate-500">
            {totalItems != null && pageSize != null
              ? `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} de ${totalItems}`
              : `Página ${page} de ${totalPages}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 text-[12px] font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
